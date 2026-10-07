import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import User, Contact
from app.schemas import (
    UserResponse, UserUpdate, ContactCreate, ContactResponse
)
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = Query("", description="Search term for username, phone, or display name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = q.strip().lower()
    if not query:
        # Return recent users excluding self
        users = db.query(User).filter(User.id != current_user.id).limit(20).all()
        return [UserResponse.model_validate(u) for u in users]
    
    users = db.query(User).filter(
        User.id != current_user.id,
        or_(
            User.username.ilike(f"%{query}%"),
            User.display_name.ilike(f"%{query}%"),
            User.phone.ilike(f"%{query}%")
        )
    ).limit(20).all()
    return [UserResponse.model_validate(u) for u in users]

@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.display_name is not None:
        current_user.display_name = data.display_name.strip()
    if data.about is not None:
        current_user.about = data.about.strip()
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.post("/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filename = f"avatar_{current_user.id}_{file.filename}"
    file_path = settings.UPLOAD_DIR / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    avatar_url = f"/uploads/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    return {"avatar_url": avatar_url}

@router.get("/contacts", response_model=List[ContactResponse])
def get_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    return [ContactResponse.model_validate(c) for c in contacts]

@router.post("/contacts", response_model=ContactResponse)
def add_contact(
    data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    identifier = data.contact_username_or_phone.strip()
    target_user = db.query(User).filter(
        or_(User.username == identifier, User.phone == identifier)
    ).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found with this username or phone")
    
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")
    
    existing = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_user_id == target_user.id
    ).first()
    if existing:
        return ContactResponse.model_validate(existing)
    
    new_contact = Contact(
        user_id=current_user.id,
        contact_user_id=target_user.id,
        nickname=data.nickname
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return ContactResponse.model_validate(new_contact)
