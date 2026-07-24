import random
import logging
import requests
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import schemas
from config import settings
from auth_service import (
    create_access_token,
    hash_password,
    user_to_dict,
    verify_password,
    get_current_user,
)
from db.models import User
from db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

active_otps: dict[str, str] = {}

class OTPSendRequest(BaseModel):
    phone_number: str

class OTPVerifyRequest(BaseModel):
    phone_number: str
    code: str


@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: schemas.RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    email = body.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=email,
        hashed_password=hash_password(body.password),
        name=body.name.strip(),
        is_shop_owner=body.is_shop_owner,
        phone_number=body.phone_number,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user))


@router.post("/login", response_model=schemas.AuthResponse)
def login(body: schemas.LoginRequest, db: Annotated[Session, Depends(get_db)]):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user.id)
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user))


@router.post("/send-otp")
def send_otp(body: OTPSendRequest):
    phone = body.phone_number.strip()
    if not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required")
        
    otp = str(random.randint(100000, 999999))
    active_otps[phone] = otp
    
    # SMS Simulation Banner in console
    print("\n" + "=" * 60)
    print(f"[SMS SIMULATOR] Dispatching OTP to: +91 {phone}")
    print(f"Verification Code: {otp}")
    print("=" * 60 + "\n")
    
    # Real Fast2SMS Dispatch Integration
    fast2sms_key = settings.FAST2SMS_API_KEY
    if fast2sms_key:
        try:
            logger.info(f"Triggering actual SMS dispatch via Fast2SMS to +91{phone}...")
            url = "https://www.fast2sms.com/dev/bulkV2"
            querystring = {
                "authorization": fast2sms_key.strip(),
                "route": "q",
                "message": f"Your ExpiryGo verification OTP is: {otp}. Valid for 5 minutes.",
                "language": "english",
                "numbers": phone
            }
            headers = {
                'cache-control': "no-cache"
            }
            res = requests.get(url, headers=headers, params=querystring, timeout=10)
            logger.info(f"Fast2SMS API Response: {res.status_code} - {res.text}")
        except Exception as e:
            logger.error(f"Failed to dispatch physical SMS via Fast2SMS: {e}")
            
    return {"message": "OTP code sent successfully."}


@router.post("/verify-otp")
def verify_otp(body: OTPVerifyRequest):
    phone = body.phone_number.strip()
    code = body.code.strip()
    
    if phone in active_otps and active_otps[phone] == code:
        active_otps.pop(phone, None)
        return {"verified": True, "message": "OTP verification successful."}
        
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code. Please try again.")


user_router = APIRouter(tags=["Users"])

@user_router.get("/users/me", response_model=schemas.User)
def read_current_user(user: Annotated[User, Depends(get_current_user)]):
    return user
