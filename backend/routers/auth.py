import random
import logging
import requests
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
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
from db.models import User, Shop
from db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


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

    if body.is_shop_owner:
        shop_name = body.name.strip() if any(w in body.name.lower() for w in ["store", "shop", "bakery", "mart", "grocery", "cafe"]) else f"{body.name.strip()}'s Store"
        new_shop = Shop(
            name=shop_name,
            address="Partner Store Location",
            latitude=28.6139,
            longitude=77.2090,
            description="Verified ExpiryGo Partner Store rescuing surplus quality food.",
            owner_id=user.id,
        )
        db.add(new_shop)
        db.commit()

    token = create_access_token(user.id)
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user))


@router.post("/login", response_model=schemas.AuthResponse)
def login(body: schemas.LoginRequest, db: Annotated[Session, Depends(get_db)]):
    email = body.email.strip().lower()
    # Optimized query: only fetch what's needed for initial response
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Constant time response to prevent user enumeration and feel consistent
        verify_password(body.password, "$2b$12$LQv3c1yqBWVHxkdZ.5BcleSWS.L3Y5mD.7/1W6fW1W1W1W1W1W1W1")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user.id)
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user))


user_router = APIRouter(tags=["Users"])

@user_router.get("/users/me", response_model=schemas.User)
def read_current_user(user: Annotated[User, Depends(get_current_user)]):
    return user
