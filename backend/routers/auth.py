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
    get_current_admin,
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
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Development helper endpoint to instantly verify an email address.
    Strictly locked to DEBUG=True and requires Administrator privileges.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not found",
        )

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

    logger.info(f"[DEV VERIFIED] User email verified by admin {admin_user.email}: {user.email}")
    return schemas.VerifyEmailResponse(
        success=True,
        message="Email successfully verified via Instant Dev Mode! Full privileges unlocked.",
        email=user.email,
        user=user_to_dict(user)
    )


@router.get("/dev-mailbox")
def read_dev_mailbox(
    admin_user: Annotated[User, Depends(get_current_admin)],
    limit: int = 20,
):
    """
    Returns recent outgoing email dispatches stored in the in-memory Dev Mailbox.
    Strictly locked to DEBUG=True and requires Administrator privileges.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not found",
        )

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
def purge_dev_mailbox(
    admin_user: Annotated[User, Depends(get_current_admin)],
):
    """
    Clears all stored emails from the Dev Mailbox.
    Strictly locked to DEBUG=True and requires Administrator privileges.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not found",
        )

    clear_dev_mailbox()
    return {"message": "Dev mailbox cleared."}


import os
from fastapi import UploadFile, File

@router.post("/customer/register", response_model=schemas.SendOtpResponse, status_code=status.HTTP_200_OK)
def customer_register(body: schemas.CustomerRegisterRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Step 1 of Customer Signup:
    Validates name & email, dispatches 6-digit OTP to email (no documents/photos).
    """
    clean_email = body.email.strip().lower()
    clean_name = body.name.strip()
    
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing and existing.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in."
        )

    res = send_otp_to_identifier(clean_email, name=clean_name)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=res.get("message", "Please wait before requesting another OTP.")
        )
    return schemas.SendOtpResponse(
        success=True,
        message=f"6-digit verification code sent to {clean_email}.",
        expires_in_seconds=res.get("expires_in_seconds", 600),
        cooldown_remaining=res.get("cooldown_remaining"),
        dev_code=res.get("dev_code"),
    )


@router.post("/vendor/register", response_model=schemas.SendOtpResponse, status_code=status.HTTP_200_OK)
def vendor_register(body: schemas.VendorRegisterRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Step 1 of Vendor Signup:
    Validates shop details, stores initial photo and license documents on the Shop record, and dispatches 6-digit OTP to email.
    """
    clean_email = body.email.strip().lower()
    clean_shop_name = body.shop_name.strip()
    clean_phone = body.phone_number.strip() if body.phone_number else None
    
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing and existing.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in."
        )

    # Find or create unverified vendor user
    if not existing:
        user = User(
            email=clean_email,
            hashed_password=hash_password(f"otp_auth_{clean_email}"),
            name=clean_shop_name,
            role="VENDOR",
            is_shop_owner=True,
            phone_number=clean_phone,
            email_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user = existing
        user.name = clean_shop_name
        user.role = "VENDOR"
        user.is_shop_owner = True
        user.phone_number = clean_phone
        db.commit()

    # Find or create initial Shop with uploaded photo and documents
    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if not shop:
        shop = Shop(
            owner_id=user.id,
            name=clean_shop_name,
            address="Commercial Market Location",
            latitude=13.0827,
            longitude=80.2707,
            approval_status="PENDING",
            is_active=False,
            location_verified=True,
            photo_url=body.photo_url,
            document_url=body.document_url,
            verification_document_url=body.document_url,
        )
        db.add(shop)
    else:
        shop.name = clean_shop_name
        if body.photo_url:
            shop.photo_url = body.photo_url
        if body.document_url:
            shop.document_url = body.document_url
            shop.verification_document_url = body.document_url
    db.commit()

    res = send_otp_to_identifier(clean_email, name=clean_shop_name)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=res.get("message", "Please wait before requesting another OTP.")
        )
    return schemas.SendOtpResponse(
        success=True,
        message=f"6-digit verification code sent to {clean_email}.",
        expires_in_seconds=res.get("expires_in_seconds", 600),
        cooldown_remaining=res.get("cooldown_remaining"),
        dev_code=res.get("dev_code"),
    )


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_auth_file(file: UploadFile = File(...)):
    """Uploads shop photo or business document for vendor onboarding."""
    import uuid
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_dirs = [
        os.path.join(backend_dir, "static", "uploads", "documents"),
        os.path.join(os.path.dirname(backend_dir), "static", "uploads", "documents"),
        os.path.abspath("static/uploads/documents"),
    ]
    for d in target_dirs:
        try:
            os.makedirs(d, exist_ok=True)
        except Exception:
            pass

    ext = os.path.splitext(file.filename or "")[1] or ".png"
    unique_name = f"vendor_{uuid.uuid4().hex[:12]}{ext}"
    contents = await file.read()
    
    for d in target_dirs:
        try:
            file_path = os.path.join(d, unique_name)
            with open(file_path, "wb") as f:
                f.write(contents)
        except Exception:
            pass
    
    public_url = f"/static/uploads/documents/{unique_name}"
    return {"url": public_url, "filename": file.filename}


@router.post("/send-otp", response_model=schemas.SendOtpResponse)
def send_otp(body: schemas.SendOtpRequest):
    """
    Generates and dispatches a 6-digit OTP code to the given email or mobile number.
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
        dev_code=res.get("dev_code"),
    )


@router.post("/verify-otp", response_model=schemas.AuthResponse)
def verify_otp(body: schemas.VerifyOtpRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Validates 6-digit OTP code:
    - If CUSTOMER: creates/verifies user with role='CUSTOMER' and issues JWT.
    - If VENDOR: creates/verifies user with role='VENDOR', ensures Shop in PENDING state.
      (Product posting is blocked by get_current_active_vendor until Admin approves).
    """
    clean_id = body.identifier.strip().lower()
    is_valid, msg = verify_otp_code(clean_id, body.otp)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Find or auto-register user
    user = db.query(User).filter(User.email == clean_id).first()
    if not user:
        role = "VENDOR" if body.is_shop_owner else "CUSTOMER"
        user_name = body.name.strip() if body.name and body.name.strip() else clean_id.split("@")[0].title()
        user = User(
            email=clean_id,
            hashed_password=hash_password(f"otp_auth_{clean_id}"),
            name=user_name,
            role=role,
            is_shop_owner=body.is_shop_owner,
            phone_number=body.phone_number,
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # If vendor, create initial Shop in PENDING state if not already created
        if body.is_shop_owner:
            from db.models import Shop
            shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
            if not shop:
                shop = Shop(
                    owner_id=user.id,
                    name=user_name if "Shop" in user_name else f"{user_name}'s Store",
                    address="Commercial Market Location",
                    latitude=13.0827,
                    longitude=80.2707,
                    approval_status="PENDING",
                    is_active=False,
                    location_verified=True,
                )
                db.add(shop)
                db.commit()
                db.refresh(shop)
    else:
        # Mark verified if not already
        if not user.email_verified:
            user.email_verified = True
            user.email_verification_token_hash = None
            user.email_verification_expires_at = None
            db.commit()
            db.refresh(user)

        # Ensure vendor role and shop existence
        if body.is_shop_owner:
            user.role = "VENDOR"
            user.is_shop_owner = True
            db.commit()
            from db.models import Shop
            shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
            if not shop:
                shop = Shop(
                    owner_id=user.id,
                    name=user.name if "Shop" in user.name else f"{user.name}'s Store",
                    address="Commercial Market Location",
                    latitude=13.0827,
                    longitude=80.2707,
                    approval_status="PENDING",
                    is_active=False,
                    location_verified=True,
                )
                db.add(shop)
                db.commit()

    token = create_access_token(user.id, role=getattr(user, "role", "CUSTOMER"))
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user))


@router.post("/test-smtp")
def run_smtp_diagnostic(to_email: str = Query(..., description="Target email address for test ping")):
    """Sends a diagnostic ping email to test SMTP connectivity."""
    return test_smtp_connection(to_email.strip())



@router.post("/login", response_model=schemas.AuthResponse)
def login(body: schemas.LoginRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Standard Bcrypt login:
    Supports Customer, Vendor, and Admin login.
    Admin credentials can be verified against ADMIN_EMAIL & ADMIN_PASSWORD_HASH from .env.
    """
    email = body.email.strip().lower()
    
    # Check .env configured Admin credentials
    admin_env_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_env_hash = os.getenv("ADMIN_PASSWORD_HASH", "").strip()
    
    if admin_env_email and email == admin_env_email and admin_env_hash:
        if not verify_password(body.password, admin_env_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        
        # Ensure Admin user exists in DB
        admin_user = db.query(User).filter(User.email == email).first()
        if not admin_user:
            admin_user = User(
                email=email,
                hashed_password=admin_env_hash,
                name="Platform Admin",
                role="ADMIN",
                is_shop_owner=False,
                email_verified=True,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        
        token = create_access_token(admin_user.id, role="ADMIN")
        return schemas.AuthResponse(access_token=token, user=user_to_dict(admin_user))

    # Standard DB User lookup
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

    token = create_access_token(user.id, role=getattr(user, "role", "CUSTOMER"))
    return schemas.AuthResponse(access_token=token, user=user_to_dict(user))


user_router = APIRouter(tags=["Users"])

@user_router.get("/users/me", response_model=schemas.User)
def read_current_user(user: Annotated[User, Depends(get_current_user)]):
    return user
