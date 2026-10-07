from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Conversation, ConversationParticipant, Message, User
from app.schemas import (
    ConversationResponse, ConversationCreateDirect, ConversationCreateGroup,
    ConversationUpdate, AddMemberRequest, ParticipantResponse, MessageResponse,
    UserResponse
)
from app.auth import get_current_user
from app.websocket_manager import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])

def format_conversation(conv: Conversation, current_user_id: str, db: Session) -> dict:
    participants_res = []
    other_user = None
    user_participant = None

    for p in conv.participants:
        participants_res.append(ParticipantResponse.model_validate(p))
        if p.user_id == current_user_id:
            user_participant = p
        elif not conv.is_group:
            other_user = p.user

    # For direct chat, name and avatar default to other user
    display_name = conv.name
    display_avatar = conv.avatar_url

    if not conv.is_group and other_user:
        display_name = other_user.display_name
        display_avatar = other_user.avatar_url

    # Last message
    last_msg = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.is_deleted == False
    ).order_by(desc(Message.created_at)).first()

    last_message_dict = None
    if last_msg:
        last_message_dict = MessageResponse.model_validate(last_msg)

    # Unread count
    unread_count = 0
    if user_participant and user_participant.last_read_message_id:
        last_read_msg = db.query(Message).filter(Message.id == user_participant.last_read_message_id).first()
        if last_read_msg:
            unread_count = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.is_deleted == False,
                Message.created_at > last_read_msg.created_at,
                Message.sender_id != current_user_id
            ).count()
    elif user_participant:
        unread_count = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.is_deleted == False,
            Message.sender_id != current_user_id
        ).count()

    return {
        "id": conv.id,
        "is_group": conv.is_group,
        "name": display_name,
        "avatar_url": display_avatar,
        "description": conv.description,
        "created_by_id": conv.created_by_id,
        "disappearing_timer": conv.disappearing_timer,
        "participants": participants_res,
        "last_message": last_message_dict,
        "unread_count": unread_count,
        "updated_at": conv.updated_at,
        "created_at": conv.created_at
    }


@router.get("", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch conversations where current_user is a participant
    participations = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user.id
    ).all()
    conv_ids = [p.conversation_id for p in participations]

    conversations = db.query(Conversation).filter(
        Conversation.id.in_(conv_ids)
    ).order_by(desc(Conversation.updated_at)).all()

    results = []
    for conv in conversations:
        results.append(format_conversation(conv, current_user.id, db))
    return results


@router.post("/direct", response_model=ConversationResponse)
def get_or_create_direct_conversation(
    data: ConversationCreateDirect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recipient_id = data.recipient_id
    if recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create direct conversation with yourself")

    recipient = db.query(User).filter(User.id == recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    # Check if a 1-on-1 direct conversation already exists between the two
    user_convs = db.query(ConversationParticipant.conversation_id).filter(
        ConversationParticipant.user_id == current_user.id
    ).subquery()

    existing_p = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id.in_(user_convs),
        ConversationParticipant.user_id == recipient_id
    ).first()

    if existing_p:
        conv = db.query(Conversation).filter(
            Conversation.id == existing_p.conversation_id,
            Conversation.is_group == False
        ).first()
        if conv:
            return format_conversation(conv, current_user.id, db)

    # Create new direct conversation
    new_conv = Conversation(
        is_group=False,
        name=None,
        avatar_url=None,
        created_by_id=current_user.id
    )
    db.add(new_conv)
    db.flush()

    p1 = ConversationParticipant(conversation_id=new_conv.id, user_id=current_user.id, role="member")
    p2 = ConversationParticipant(conversation_id=new_conv.id, user_id=recipient_id, role="member")
    db.add_all([p1, p2])
    db.commit()
    db.refresh(new_conv)

    return format_conversation(new_conv, current_user.id, db)


@router.post("/group", response_model=ConversationResponse)
def create_group_conversation(
    data: ConversationCreateGroup,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member_ids = list(set(data.member_ids + [current_user.id]))

    new_conv = Conversation(
        is_group=True,
        name=data.name.strip(),
        avatar_url=data.avatar_url or f"https://api.dicebear.com/7.x/identicon/svg?seed={data.name}",
        description=data.description,
        created_by_id=current_user.id
    )
    db.add(new_conv)
    db.flush()

    # Add participants
    participants = []
    for uid in member_ids:
        role = "admin" if uid == current_user.id else "member"
        participants.append(ConversationParticipant(
            conversation_id=new_conv.id,
            user_id=uid,
            role=role
        ))
    db.add_all(participants)

    # Add system message
    system_msg = Message(
        conversation_id=new_conv.id,
        sender_id=current_user.id,
        content=f"{current_user.display_name} created the group \"{data.name}\"",
        message_type="system",
        status="delivered"
    )
    db.add(system_msg)

    db.commit()
    db.refresh(new_conv)

    return format_conversation(new_conv, current_user.id, db)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation_detail(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return format_conversation(conv, current_user.id, db)


@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized")

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    system_events = []

    if data.name is not None and conv.is_group:
        old_name = conv.name
        conv.name = data.name.strip()
        system_events.append(f"{current_user.display_name} changed the group name to \"{conv.name}\"")

    if data.description is not None:
        conv.description = data.description

    if data.avatar_url is not None:
        conv.avatar_url = data.avatar_url

    if data.disappearing_timer is not None:
        conv.disappearing_timer = data.disappearing_timer
        timer_str = "off" if conv.disappearing_timer == 0 else f"{conv.disappearing_timer} seconds"
        system_events.append(f"{current_user.display_name} set disappearing messages to {timer_str}")

    conv.updated_at = datetime.now(timezone.utc)

    for content in system_events:
        msg = Message(
            conversation_id=conv.id,
            sender_id=current_user.id,
            content=content,
            message_type="system",
            status="delivered"
        )
        db.add(msg)

    db.commit()
    db.refresh(conv)

    # Broadcast conversation update
    member_ids = [p.user_id for p in conv.participants]
    await manager.broadcast_to_users({
        "type": "conversation_updated",
        "conversation_id": conv.id,
        "disappearing_timer": conv.disappearing_timer
    }, member_ids)

    return format_conversation(conv, current_user.id, db)


@router.post("/{conversation_id}/members")
async def add_member(
    conversation_id: str,
    data: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or not conv.is_group:
        raise HTTPException(status_code=400, detail="Cannot add members to non-group")

    admin_p = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not admin_p:
        raise HTTPException(status_code=403, detail="Not authorized")

    existing = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == data.user_id
    ).first()
    if existing:
        return {"message": "User is already a member"}

    new_p = ConversationParticipant(
        conversation_id=conversation_id,
        user_id=data.user_id,
        role=data.role or "member"
    )
    db.add(new_p)

    target_user = db.query(User).filter(User.id == data.user_id).first()
    target_name = target_user.display_name if target_user else "A new user"

    sys_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=f"{current_user.display_name} added {target_name}",
        message_type="system",
        status="delivered"
    )
    db.add(sys_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    all_ids = [p.user_id for p in conv.participants]
    await manager.broadcast_to_users({
        "type": "member_added",
        "conversation_id": conversation_id,
        "user_id": data.user_id,
        "added_by": current_user.display_name
    }, all_ids)

    return {"message": "Member added successfully"}


@router.delete("/{conversation_id}/members/{user_id}")
async def remove_member(
    conversation_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or not conv.is_group:
        raise HTTPException(status_code=400, detail="Not a group conversation")

    req_p = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not req_p:
        raise HTTPException(status_code=403, detail="Not a participant")

    # If leaving themselves or if admin removing member
    if user_id != current_user.id and req_p.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    target_p = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id
    ).first()
    if not target_p:
        raise HTTPException(status_code=404, detail="Member not found")

    target_user = db.query(User).filter(User.id == user_id).first()
    target_name = target_user.display_name if target_user else "Member"

    action_text = f"{target_name} left the group" if user_id == current_user.id else f"{current_user.display_name} removed {target_name}"

    db.delete(target_p)
    sys_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=action_text,
        message_type="system",
        status="delivered"
    )
    db.add(sys_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    all_ids = [p.user_id for p in conv.participants] + [user_id]
    await manager.broadcast_to_users({
        "type": "member_removed",
        "conversation_id": conversation_id,
        "user_id": user_id
    }, all_ids)

    return {"message": "Member removed"}


@router.post("/{conversation_id}/read")
async def mark_as_read(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not participant:
        return {"status": "ok"}

    latest_msg = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.is_deleted == False
    ).order_by(desc(Message.created_at)).first()

    if latest_msg:
        participant.last_read_message_id = latest_msg.id
        
        # Update messages sent by others in this conversation to "read"
        unread_msgs = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user.id,
            Message.status != "read"
        ).all()

        for m in unread_msgs:
            m.status = "read"

        db.commit()

        # Notify participants of read receipts
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            member_ids = [p.user_id for p in conv.participants if p.user_id != current_user.id]
            await manager.broadcast_to_users({
                "type": "messages_read",
                "conversation_id": conversation_id,
                "read_by": current_user.id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, member_ids)

    return {"status": "ok"}
