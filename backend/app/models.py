import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Integer, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    phone = Column(String(25), unique=True, index=True, nullable=True)
    display_name = Column(String(100), nullable=False)
    avatar_url = Column(Text, nullable=True)
    about = Column(String(255), default="Hey there! I am using Signal.")
    password_hash = Column(String(255), nullable=True)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user", cascade="all, delete-orphan")
    participations = relationship("ConversationParticipant", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", back_populates="sender", cascade="all, delete-orphan")
    reactions = relationship("MessageReaction", back_populates="user", cascade="all, delete-orphan")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    nickname = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact_user = relationship("User", foreign_keys=[contact_user_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    is_group = Column(Boolean, default=False, nullable=False)
    name = Column(String(100), nullable=True)  # Group name
    avatar_url = Column(Text, nullable=True)   # Group avatar
    description = Column(String(255), nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Disappearing messages timer in seconds: 0 = disabled, e.g. 30, 300, 3600, 86400
    disappearing_timer = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by_id])
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="member", nullable=False)  # "admin", "member"
    last_read_message_id = Column(String(36), nullable=True)
    joined_at = Column(DateTime(timezone=True), default=utc_now)

    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", back_populates="participations")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # "text", "image", "file", "system"
    file_url = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    
    reply_to_id = Column(String(36), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="sent")  # "sending", "sent", "delivered", "read"
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
    reply_to = relationship("Message", remote_side=[id])
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")


class MessageReaction(Base):
    __tablename__ = "message_reactions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    emoji = Column(String(16), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    message = relationship("Message", back_populates="reactions")
    user = relationship("User", back_populates="reactions")
