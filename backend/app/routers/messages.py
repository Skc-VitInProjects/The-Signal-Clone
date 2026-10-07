import os
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Message, MessageReaction, Conversation, ConversationParticipant, User
from app.schemas import (
    MessageCreate, MessageResponse, MessageReactionCreate, MessageReactionResponse,
    MessageReplyPreview, UserResponse
)
from app.auth import get_current_user
from app.config import settings
from app.websocket_manager import manager

router = APIRouter(prefix="/messages", tags=["messages"])

def enrich_message(msg: Message, db: Session) -> MessageResponse:
    reply_preview = None
    if msg.reply_to_id:
        parent = db.query(Message).filter(Message.id == msg.reply_to_id).first()
        if parent:
            reply_preview = MessageReplyPreview(
                id=parent.id,
                sender_id=parent.sender_id,
                sender_name=parent.sender.display_name if parent.sender else "Unknown",
                content=parent.content,
                message_type=parent.message_type
            )

    reactions_res = []
    for r in msg.reactions:
        reactions_res.append(MessageReactionResponse(
            id=r.id,
            message_id=r.message_id,
            user_id=r.user_id,
            user_name=r.user.display_name if r.user else "User",
            emoji=r.emoji,
            created_at=r.created_at
        ))

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender=UserResponse.model_validate(msg.sender),
        content=msg.content,
        message_type=msg.message_type,
        file_url=msg.file_url,
        file_name=msg.file_name,
        file_size=msg.file_size,
        reply_to_id=msg.reply_to_id,
        reply_to=reply_preview,
        status=msg.status,
        expires_at=msg.expires_at,
        is_deleted=msg.is_deleted,
        reactions=reactions_res,
        created_at=msg.created_at
    )


@router.get("/{conversation_id}", response_model=List[MessageResponse])
def get_messages(
    conversation_id: str,
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify participation
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to view messages in this conversation")

    now = datetime.now(timezone.utc)
    # Purge expired disappearing messages
    expired = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.expires_at != None,
        Message.expires_at <= now
    ).all()
    if expired:
        for m in expired:
            db.delete(m)
        db.commit()

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.is_deleted == False
    ).order_by(Message.created_at.asc()).limit(limit).all()

    return [enrich_message(m, db) for m in messages]


@router.post("", response_model=MessageResponse)
async def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == data.conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    conv = db.query(Conversation).filter(Conversation.id == data.conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Disappearing timer
    expires_at = None
    if conv.disappearing_timer > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=conv.disappearing_timer)

    # Determine initial delivery status
    # If other participants are online, it is immediately 'delivered'
    other_members = [p.user_id for p in conv.participants if p.user_id != current_user.id]
    any_recipient_online = any(manager.is_user_online(uid) for uid in other_members)
    initial_status = "delivered" if any_recipient_online else "sent"

    msg = Message(
        conversation_id=data.conversation_id,
        sender_id=current_user.id,
        content=data.content,
        message_type=data.message_type or "text",
        file_url=data.file_url,
        file_name=data.file_name,
        file_size=data.file_size,
        reply_to_id=data.reply_to_id,
        status=initial_status,
        expires_at=expires_at
    )
    db.add(msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    response_data = enrich_message(msg, db)

    # Broadcast to all conversation participants via WebSocket
    all_member_ids = [p.user_id for p in conv.participants]
    await manager.broadcast_to_users({
        "type": "new_message",
        "conversation_id": data.conversation_id,
        "message": response_data.model_dump(mode="json")
    }, all_member_ids)

    return response_data


@router.post("/{message_id}/reactions")
async def toggle_reaction(
    message_id: str,
    data: MessageReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == msg.conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized")

    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == data.emoji
    ).first()

    if existing:
        # Remove reaction (toggle)
        db.delete(existing)
        action = "removed"
    else:
        new_reaction = MessageReaction(
            message_id=message_id,
            user_id=current_user.id,
            emoji=data.emoji
        )
        db.add(new_reaction)
        action = "added"

    db.commit()

    # Re-fetch reactions for message
    reactions = db.query(MessageReaction).filter(MessageReaction.message_id == message_id).all()
    reactions_dump = [
        {
            "id": r.id,
            "message_id": r.message_id,
            "user_id": r.user_id,
            "user_name": r.user.display_name if r.user else "User",
            "emoji": r.emoji,
            "created_at": r.created_at.isoformat()
        }
        for r in reactions
    ]

    all_member_ids = [p.user_id for p in conv.participants]
    await manager.broadcast_to_users({
        "type": "reaction_updated",
        "conversation_id": msg.conversation_id,
        "message_id": message_id,
        "reactions": reactions_dump
    }, all_member_ids)

    return {"status": "ok", "action": action, "reactions": reactions_dump}


@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete own messages")

    conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
    msg.is_deleted = True
    msg.content = "This message was deleted"
    db.commit()

    all_member_ids = [p.user_id for p in conv.participants]
    await manager.broadcast_to_users({
        "type": "message_deleted",
        "conversation_id": msg.conversation_id,
        "message_id": message_id
    }, all_member_ids)

    return {"status": "ok"}


@router.post("/upload")
def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = settings.UPLOAD_DIR / unique_name

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size = os.path.getsize(file_path)
    file_url = f"/uploads/{unique_name}"

    # Determine message type
    image_exts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
    msg_type = "image" if ext.lower() in image_exts else "file"

    return {
        "file_url": file_url,
        "file_name": file.filename,
        "file_size": size,
        "message_type": msg_type
    }
