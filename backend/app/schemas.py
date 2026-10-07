from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    display_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    about: Optional[str] = "Hey there! I am using Signal."

class UserRegister(BaseModel):
    username: str
    phone: Optional[str] = None
    display_name: str
    password: Optional[str] = "signal123"
    avatar_url: Optional[str] = None

class UserLogin(BaseModel):
    identifier: str  # username or phone
    otp: Optional[str] = None
    password: Optional[str] = None

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    about: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: str
    is_online: bool = False
    last_seen: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Contact Schemas ---
class ContactCreate(BaseModel):
    contact_username_or_phone: str
    nickname: Optional[str] = None

class ContactResponse(BaseModel):
    id: str
    user_id: str
    contact_user: UserResponse
    nickname: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Reaction & Reply Schemas ---
class MessageReactionResponse(BaseModel):
    id: str
    message_id: str
    user_id: str
    user_name: Optional[str] = None
    emoji: str
    created_at: datetime

    class Config:
        from_attributes = True

class MessageReactionCreate(BaseModel):
    emoji: str

class MessageReplyPreview(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    content: str
    message_type: str

    class Config:
        from_attributes = True


# --- Message Schemas ---
class MessageCreate(BaseModel):
    conversation_id: str
    content: str
    message_type: Optional[str] = "text"  # text, image, file
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to_id: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: UserResponse
    content: str
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to_id: Optional[str] = None
    reply_to: Optional[MessageReplyPreview] = None
    status: str = "sent"  # sending, sent, delivered, read
    expires_at: Optional[datetime] = None
    is_deleted: bool = False
    reactions: List[MessageReactionResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# --- Conversation Schemas ---
class ParticipantResponse(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    role: str
    user: UserResponse
    joined_at: datetime

    class Config:
        from_attributes = True

class ConversationCreateDirect(BaseModel):
    recipient_id: str

class ConversationCreateGroup(BaseModel):
    name: str
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    member_ids: List[str]

class ConversationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    disappearing_timer: Optional[int] = None

class ConversationResponse(BaseModel):
    id: str
    is_group: bool
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    created_by_id: Optional[str] = None
    disappearing_timer: int = 0
    participants: List[ParticipantResponse] = []
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    updated_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class AddMemberRequest(BaseModel):
    user_id: str
    role: Optional[str] = "member"

class RemoveMemberRequest(BaseModel):
    user_id: str
