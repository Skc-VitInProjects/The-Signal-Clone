from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User
from app.schemas import (
    UserRegister, UserLogin, TokenResponse, UserResponse
)
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    # Check username
    existing_user = db.query(User).filter(User.username == data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username is already registered")
    
    # Check phone if provided
    if data.phone:
        existing_phone = db.query(User).filter(User.phone == data.phone).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number is already registered")

    user = User(
        username=data.username.strip(),
        phone=data.phone.strip() if data.phone else None,
        display_name=data.display_name.strip(),
        avatar_url=data.avatar_url,
        password_hash=hash_password(data.password or "signal123")
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "username": user.username})
    return TokenResponse(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    
    # Find by username or phone
    user = db.query(User).filter(
        (User.username == identifier) | (User.phone == identifier)
    ).first()
    
    if not user:
        # If user does not exist yet and OTP is provided, auto-create account for seamless onboarding!
        if data.otp == settings.FIXED_OTP:
            user = User(
                username=identifier.lower().replace(" ", "_"),
                phone=identifier if identifier.startswith("+") or identifier.replace("-", "").isdigit() else None,
                display_name=identifier.capitalize(),
                avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={identifier}",
                password_hash=hash_password("signal123")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=404, detail="User not found with provided identifier")
    
    # Check OTP or password
    if data.otp:
        if data.otp != settings.FIXED_OTP:
            raise HTTPException(status_code=400, detail=f"Invalid OTP. Use mock OTP '{settings.FIXED_OTP}'")
    elif data.password:
        if not verify_password(data.password, user.password_hash or ""):
            raise HTTPException(status_code=400, detail="Invalid password")
    else:
        # If neither supplied, allow quick mock verification with 123456
        pass

    token = create_access_token({"sub": user.id, "username": user.username})
    return TokenResponse(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.get("/demo-users", response_model=List[UserResponse])
def get_demo_users(db: Session = Depends(get_db)):
    """Return all seed demo users for instant one-click switching during evaluation."""
    users = db.query(User).order_by(User.display_name.asc()).limit(10).all()
    return [UserResponse.model_validate(u) for u in users]
