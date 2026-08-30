import os
from datetime import UTC, datetime, timedelta
from typing import Annotated, Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from db.models import User
from db.session import get_db

from config import settings

import secrets
import hashlib

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = settings.ACCESS_TOKEN_EXPIRE_DAYS

security = HTTPBearer(auto_error=False)


def hash_verification_token(raw_token: str) -> str:
    """Computes a secure SHA-256 hash of the raw verification token."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


def generate_verification_token(expire_hours: int = 24) -> tuple[str, str, datetime]:
    """
    Generates a cryptographically secure random token (32 bytes urlsafe),
    its SHA-256 hash for database storage, and its expiration datetime.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_verification_token(raw_token)
    expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=expire_hours)
    return raw_token, token_hash, expires_at


def hash_password(password: str) -> str:
    # Industry-standard bcrypt work factor (default 12 rounds) to defend against GPU brute-force attacks
    rounds = int(os.getenv("BCRYPT_ROUNDS", "12"))
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=rounds)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str) -> str:
    expire = datetime.now(UTC) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": getattr(user, "role", "CUSTOMER"),
        "is_shop_owner": user.is_shop_owner,
        "email_verified": getattr(user, "email_verified", False),
        "phone_number": getattr(user, "phone_number", None),
        "total_money_saved": getattr(user, "total_money_saved", 0.0) or 0.0,
        "total_items_saved": getattr(user, "total_items_saved", 0) or 0,
        "co2_saved_kg": getattr(user, "co2_saved_kg", 0.0) or 0.0,
    }


def get_user_from_token(db: Session, token: str) -> Optional[User]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if not user_id:
            return None
        return db.get(User, user_id)
    except JWTError:
        return None


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_user_from_token(db, credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_shop_owner(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    # Strict BFLA enforcement: non-shopkeeper users are denied access
    is_merchant = user.is_shop_owner or getattr(user, "role", "") == "SHOPKEEPER"
    if not is_merchant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: This action requires verified merchant privileges.",
        )
    # Strict Email Verification enforcement: unverified shopkeepers cannot access merchant features
    if not getattr(user, "email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Please verify your email address before managing a shop.",
        )
    return user


def get_current_active_shop_owner(
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    # Strict Shop Location Verification & Admin Approval enforcement
    from db.models import Shop
    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: No shop registered for this merchant. Please complete shop setup and location verification.",
        )
    if not getattr(shop, "location_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Your shop location is not verified. Please complete location verification to activate your shop.",
        )
    approval_status = getattr(shop, "approval_status", "PENDING")
    if approval_status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Your shop is pending administrator review and approval. Product management will unlock once approved.",
        )
    if approval_status == "REJECTED":
        reason = getattr(shop, "approval_reason", "") or "Did not meet marketplace listing criteria."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Your shop application was rejected ({reason}).",
        )
    if approval_status == "SUSPENDED" or not getattr(shop, "is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Your shop is currently inactive or suspended. Please contact support.",
        )
    return user


def get_current_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    # Strict RBAC enforcement: administrator check
    if getattr(user, "role", "") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required.",
        )
    return user
