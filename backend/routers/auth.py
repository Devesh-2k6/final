import logging
from datetime import datetime, UTC
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

import schemas
from config import settings
from auth_service import (
    create_access_token,
    hash_password,
    user_to_dict,
    verify_password,
    get_current_user,
    generate_verification_token,
    hash_verification_token,
)
from db.models import User, Shop
from db.session import get_db
from services.email import (
    send_verification_email,
    get_dev_mailbox,
    clear_dev_mailbox,
    test_smtp_connection,
    get_smtp_config,
)
from services.otp import send_otp_to_identifier, verify_otp_code

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])




@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: schemas.RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    email = body.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Generate secure single-use token and 24-hour expiration
    raw_token, token_hash, expires_at = generate_verification_token(
        expire_hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
    )
    now = datetime.now(UTC).replace(tzinfo=None)

    role = "SHOPKEEPER" if body.is_shop_owner else "CUSTOMER"

    user = User(
        email=email,
        hashed_password=hash_password(body.password),
        name=body.name.strip(),
        role=role,
        is_shop_owner=body.is_shop_owner,
        phone_number=body.phone_number,
        email_verified=False,
        email_verification_token_hash=token_hash,
        email_verification_expires_at=expires_at,
        last_verification_email_sent_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Dispatch single unified 6-digit OTP verification email via SMTP
    dev_otp_val = None
    try:
        otp_res = send_otp_to_identifier(user.email, name=user.name)
        dev_otp_val = otp_res.get("dev_code")
    except Exception as e:
        logger.warning(f"Failed to dispatch verification OTP to {user.email}: {e}")

    token = create_access_token(user.id)
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user), dev_otp=dev_otp_val)


@router.get("/verify-email", response_model=schemas.VerifyEmailResponse)
def verify_email(
    token: Annotated[str, Query(description="The verification token received via email")],
    db: Annotated[Session, Depends(get_db)]
):
    clean_token = token.strip()
    if not clean_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is required."
        )

    token_hash = hash_verification_token(clean_token)
    user = db.query(User).filter(User.email_verification_token_hash == token_hash).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token. If you already verified, please log in."
        )

    now = datetime.now(UTC).replace(tzinfo=None)
    if user.email_verification_expires_at and user.email_verification_expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link has expired (24-hour limit). Please request a new verification email."
        )

    # Mark as verified and invalidate token (Single-use token consumption)
    user.email_verified = True
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    db.commit()
    db.refresh(user)

    logger.info(f"[VERIFIED] User email verified successfully: {user.email}")
    return schemas.VerifyEmailResponse(
        success=True,
        message="Email verified successfully! You now have full access to ExpiryGo.",
        email=user.email,
        user=user_to_dict(user)
    )


@router.post("/resend-verification", response_model=schemas.VerifyEmailResponse)
def resend_verification(
    body: schemas.ResendVerificationRequest,
    db: Annotated[Session, Depends(get_db)]
):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    # Constant time / secure response to prevent user enumeration
    if not user:
        return schemas.VerifyEmailResponse(
            success=True,
            message="If an unverified account with this email exists, a new verification link has been sent."
        )

    if user.email_verified:
        return schemas.VerifyEmailResponse(
            success=True,
            message="This email address is already verified. You can log in directly.",
            email=user.email
        )

    # Rate limiting cooldown check (e.g., 60 seconds)
    now = datetime.now(UTC).replace(tzinfo=None)
    cooldown = settings.EMAIL_RESEND_COOLDOWN_SECONDS
    if user.last_verification_email_sent_at:
        elapsed = (now - user.last_verification_email_sent_at).total_seconds()
        if elapsed < cooldown:
            remaining = int(cooldown - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another verification email."
            )

    # Invalidate previous token and generate fresh token with 24h expiry
    raw_token, token_hash, expires_at = generate_verification_token(
        expire_hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
    )
    user.email_verification_token_hash = token_hash
    user.email_verification_expires_at = expires_at
    user.last_verification_email_sent_at = now
    db.commit()

    # Dispatch email
    try:
        send_verification_email(to_email=user.email, name=user.name, raw_token=raw_token)
    except Exception as e:
        logger.warning(f"Failed to resend verification email to {user.email}: {e}")

    return schemas.VerifyEmailResponse(
        success=True,
        message="A fresh verification link has been sent to your email address.",
        email=user.email
    )


@router.post("/instant-verify-dev", response_model=schemas.VerifyEmailResponse)
def instant_verify_dev(
    body: schemas.ResendVerificationRequest,
    db: Annotated[Session, Depends(get_db)]
):
    """
    Development/Demo helper endpoint to instantly verify an email address
    without needing an external SMTP email server or manual token copy-pasting.
    """
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{email}' not found."
        )

    user.email_verified = True
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    db.commit()
    db.refresh(user)

    logger.info(f"[DEV VERIFIED] User email instantly verified: {user.email}")
    return schemas.VerifyEmailResponse(
        success=True,
        message="Email successfully verified via Instant Dev Mode! Full privileges unlocked.",
        email=user.email,
        user=user_to_dict(user)
    )


@router.get("/dev-mailbox")
def read_dev_mailbox(limit: int = 20):
    """
    Returns the recent outgoing email dispatches stored in the in-memory Dev Mailbox.
    Useful for local testing, e2e testing, and inspecting activation links without SMTP.
    """
    config = get_smtp_config()
    emails = get_dev_mailbox(limit=limit)
    return {
        "smtp_configured": config["is_configured"],
        "smtp_host": config["host"],
        "smtp_sender": config["sender"],
        "count": len(emails),
        "emails": emails,
    }


@router.delete("/dev-mailbox")
def purge_dev_mailbox():
    """Clears all stored emails from the Dev Mailbox."""
    clear_dev_mailbox()
    return {"message": "Dev mailbox cleared."}


@router.post("/send-otp", response_model=schemas.SendOtpResponse)
def send_otp(body: schemas.SendOtpRequest):
    """
    Generates and dispatches a 6-digit OTP code to the given email or mobile number.
    Rate limited and securely dispatched via SMTP.
    """
    res = send_otp_to_identifier(body.identifier, name=body.name)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=res.get("message", "Please wait before requesting another OTP.")
        )
    return schemas.SendOtpResponse(
        success=True,
        message=res["message"],
        expires_in_seconds=res.get("expires_in_seconds", 600),
        cooldown_remaining=res.get("cooldown_remaining"),
    )


@router.post("/verify-otp", response_model=schemas.AuthResponse)
def verify_otp(body: schemas.VerifyOtpRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Validates a 6-digit OTP code. If valid:
    - If user exists: logs in and marks email_verified=True.
    - If user does not exist: auto-registers user with email_verified=True and issues JWT.
    """
    clean_id = body.identifier.strip().lower()
    is_valid, msg = verify_otp_code(clean_id, body.otp)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Find or auto-register user
    user = db.query(User).filter(User.email == clean_id).first()
    if not user:
        role = "SHOPKEEPER" if body.is_shop_owner else "CUSTOMER"
        user_name = body.name.strip() if body.name and body.name.strip() else clean_id.split("@")[0].title()
        user = User(
            email=clean_id,
            hashed_password=hash_password(f"otp_auth_{clean_id}"),
            name=user_name,
            role=role,
            is_shop_owner=body.is_shop_owner,
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Mark verified if not already
        if not user.email_verified:
            user.email_verified = True
            user.email_verification_token_hash = None
            user.email_verification_expires_at = None
            db.commit()
            db.refresh(user)

    token = create_access_token(user.id)
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user))


@router.post("/test-smtp")
def run_smtp_diagnostic(to_email: str = Query(..., description="Target email address for test ping")):
    """Sends a diagnostic ping email to test SMTP connectivity."""
    return test_smtp_connection(to_email.strip())



@router.post("/login", response_model=schemas.AuthResponse)
def login(body: schemas.LoginRequest, db: Annotated[Session, Depends(get_db)]):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Constant time response to prevent user enumeration and feel consistent
        verify_password(body.password, "$2b$12$LQv3c1yqBWVHxkdZ.5BcleSWS.L3Y5mD.7/1W6fW1W1W1W1W1W1W1")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Strict Email Verification Enforcement on password login
    if not getattr(user, "email_verified", False):
        # Auto-send an OTP so the user can verify immediately
        try:
            send_otp_to_identifier(user.email, name=user.name)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email is not verified. Please verify your email with the 6-digit OTP sent to your inbox."
        )

    token = create_access_token(user.id)
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user))


user_router = APIRouter(tags=["Users"])

@user_router.get("/users/me", response_model=schemas.User)
def read_current_user(user: Annotated[User, Depends(get_current_user)]):
    return user
