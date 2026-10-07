import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User, ConversationParticipant, Message
from app.auth import decode_token
from app.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    # Verify token
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=4001, reason="Invalid authentication token")
        return

    user_id = payload["sub"]
    await manager.connect(websocket, user_id)

    db: Session = SessionLocal()
    try:
        # Mark user online
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_online = True
            user.last_seen = datetime.now(timezone.utc)
            db.commit()

        # Broadcast online status
        await manager.broadcast_all({
            "type": "user_status",
            "user_id": user_id,
            "is_online": True,
            "last_seen": datetime.now(timezone.utc).isoformat()
        })

        # When this user comes online, mark pending 'sent' messages from others in conversations they participate in as 'delivered'
        user_conv_ids = [
            p.conversation_id for p in db.query(ConversationParticipant.conversation_id).filter(
                ConversationParticipant.user_id == user_id
            ).all()
        ]
        if user_conv_ids:
            pending = db.query(Message).filter(
                Message.conversation_id.in_(user_conv_ids),
                Message.sender_id != user_id,
                Message.status == "sent"
            ).all()
            if pending:
                for m in pending:
                    m.status = "delivered"
                db.commit()
                # Broadcast delivered status to senders
                for m in pending:
                    await manager.send_personal_message({
                        "type": "message_delivered",
                        "conversation_id": m.conversation_id,
                        "message_id": m.id,
                        "status": "delivered"
                    }, m.sender_id)

        # Main message loop
        while True:
            text = await websocket.receive_text()
            try:
                data = json.loads(text)
            except Exception:
                continue

            event_type = data.get("type")

            if event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

            elif event_type == "typing":
                conv_id = data.get("conversation_id")
                is_typing = bool(data.get("is_typing", True))
                if conv_id:
                    # Get other participants
                    participants = db.query(ConversationParticipant).filter(
                        ConversationParticipant.conversation_id == conv_id,
                        ConversationParticipant.user_id != user_id
                    ).all()
                    recipient_ids = [p.user_id for p in participants]
                    user_obj = db.query(User).filter(User.id == user_id).first()
                    display_name = user_obj.display_name if user_obj else "Someone"

                    await manager.broadcast_to_users({
                        "type": "typing",
                        "conversation_id": conv_id,
                        "user_id": user_id,
                        "user_name": display_name,
                        "is_typing": is_typing
                    }, recipient_ids)

            elif event_type == "mark_read":
                conv_id = data.get("conversation_id")
                if conv_id:
                    unread = db.query(Message).filter(
                        Message.conversation_id == conv_id,
                        Message.sender_id != user_id,
                        Message.status != "read"
                    ).all()
                    for m in unread:
                        m.status = "read"
                    db.commit()

                    participants = db.query(ConversationParticipant).filter(
                        ConversationParticipant.conversation_id == conv_id,
                        ConversationParticipant.user_id != user_id
                    ).all()
                    recipient_ids = [p.user_id for p in participants]
                    await manager.broadcast_to_users({
                        "type": "messages_read",
                        "conversation_id": conv_id,
                        "read_by": user_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }, recipient_ids)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # Check if user has other connections open
        if not manager.is_user_online(user_id):
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_online = False
                user.last_seen = datetime.now(timezone.utc)
                db.commit()
            await manager.broadcast_all({
                "type": "user_status",
                "user_id": user_id,
                "is_online": False,
                "last_seen": datetime.now(timezone.utc).isoformat()
            })
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket)
    finally:
        db.close()
