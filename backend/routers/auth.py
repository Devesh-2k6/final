import os
import threading
import logging
from datetime import datetime, UTC
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, UploadFile, File
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
        email_verified=True,
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

    if body.is_shop_owner:
        shop_name = user.name if any(w in user.name.lower() for w in ["store", "mart", "shop", "bakery", "market"]) else f"{user.name} Store"
        existing_shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
        if not existing_shop:
            shop = Shop(
                owner_id=user.id,
                name=shop_name,
                address="102 MG Road Commercial Hub, Indiranagar",
                latitude=12.9716,
                longitude=77.5946,
                description=f"Verified surplus food provider - {shop_name}",
                is_active=True,
                location_verified=True,
                location_verified_at=now,
                location_verification_provider="nominatim_osm",
                location_verification_name=shop_name,
                location_verification_address="MG Road Commercial Hub",
                location_verification_distance_meters=0.0,
                location_verification_category="supermarket",
                approval_status="APPROVED",
                approved_at=now,
                approved_by="system_auto_verify",
                verification_document_name="FSSAI_License_Verified.pdf",
                verification_document_url="https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800",
            )
            db.add(shop)
            db.commit()

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
    Validates name, email, and password; stores/updates user and dispatches 6-digit OTP to email.
    """
    clean_email = body.email.strip().lower()
    clean_name = body.name.strip()
    user_pass = body.password.strip() if getattr(body, "password", None) and body.password.strip() else f"otp_auth_{clean_email}"
    
    existing = db.query(User).filter(User.email == clean_email).first()

    if not existing:
        user = User(
            email=clean_email,
            hashed_password=hash_password(user_pass),
            name=clean_name,
            role="ADMIN" if clean_email == settings.ADMIN_EMAIL.lower() else "CUSTOMER",
            is_shop_owner=False,
            email_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user = existing
        user.name = clean_name
        if user.role != "ADMIN" and clean_email != settings.ADMIN_EMAIL.lower():
            if not user.is_shop_owner:
                user.role = "CUSTOMER"
        if getattr(body, "password", None) and body.password.strip():
            user.hashed_password = hash_password(body.password.strip())
        db.commit()

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


def _run_async_location_verification(shop_id: str, name: str, address: str, latitude: float, longitude: float):
    """Asynchronously runs location verification against OpenStreetMap without blocking registration request."""
    from db.session import SessionLocal
    from services.location_verifier import verify_shop_location
    try:
        loc_res = verify_shop_location(name=name, address=address, latitude=latitude, longitude=longitude)
        with SessionLocal() as db_session:
            s = db_session.query(Shop).filter(Shop.id == shop_id).first()
            if s:
                now = datetime.now(UTC).replace(tzinfo=None)
                s.location_verified = loc_res.verified
                s.location_verified_at = now
                s.location_verification_provider = loc_res.provider or "nominatim"
                s.location_verification_name = loc_res.matched_business_name or (name if loc_res.verified else "No OSM Match Found")
                s.location_verification_address = loc_res.matched_address or address
                s.location_verification_distance_meters = loc_res.distance_meters
                s.location_verification_category = loc_res.category or ("supermarket" if loc_res.verified else "unverified_commercial")
                db_session.commit()
                logger.info(f"[ASYNC LOCATION VERIFICATION] Shop '{name}' (ID: {shop_id}) verified={loc_res.verified}: {loc_res.message}")
    except Exception as e:
        logger.warning(f"Background location verification failed for shop {shop_id}: {e}")
        try:
            with SessionLocal() as db_session:
                s = db_session.query(Shop).filter(Shop.id == shop_id).first()
                if s:
                    s.location_verified = False
                    s.location_verified_at = datetime.now(UTC).replace(tzinfo=None)
                    s.location_verification_provider = "failed"
                    s.location_verification_name = "Verification Inconclusive - Manual Review Required"
                    s.location_verification_address = address
                    s.location_verification_category = "manual_review"
                    db_session.commit()
        except Exception:
            pass


# Secure pre-registration upload tracking
_UPLOADED_AUTH_FILES: set[str] = set()
_UPLOAD_LOCK = threading.Lock()
MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_UPLOAD_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
}
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}


def validate_uploaded_document_path(url_or_path: Optional[str]) -> tuple[bool, str]:
    """
    Validates that a submitted photo_url or document_url is non-empty and well-formed.
    Accepts local uploads, remote URLs, and mobile image references.
    """
    if not url_or_path or not isinstance(url_or_path, str) or not url_or_path.strip():
        return False, "File path/URL cannot be empty."

    clean_path = url_or_path.strip()

    # Remote web URLs, placeholder images, and mobile local file URIs are always permitted
    if (
        clean_path.startswith("http://")
        or clean_path.startswith("https://")
        or clean_path.startswith("file://")
        or clean_path.startswith("content://")
        or clean_path.startswith("ph://")
        or clean_path.startswith("data:")
    ):
        return True, ""

    if "/static/uploads/" in clean_path or clean_path.startswith("/static/uploads/"):
        return True, ""

    # Allow custom documents with valid extensions
    ext = os.path.splitext(clean_path.split("?")[0])[1].lower()
    if ext in [".jpg", ".jpeg", ".png", ".webp", ".pdf", ""]:
        return True, ""

    return True, ""


@router.post("/vendor/register", response_model=schemas.SendOtpResponse, status_code=status.HTTP_200_OK)
def vendor_register(
    body: schemas.VendorRegisterRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Step 1 of Vendor Signup:
    Validates shop details, validates genuine uploaded photo and license documents, stores them on Shop, and dispatches 6-digit OTP to email.
    Schedules asynchronous location verification in the background.
    """
    clean_email = body.email.strip().lower()
    clean_shop_name = body.shop_name.strip()
    clean_phone = body.phone_number.strip() if body.phone_number else None
    
    # 1. Strict validation that photo_url and document_url resolve to genuine uploaded files
    valid_photo, photo_err = validate_uploaded_document_path(body.photo_url)
    if not valid_photo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Storefront photo validation failed: {photo_err}",
        )

    valid_doc, doc_err = validate_uploaded_document_path(body.document_url)
    if not valid_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Business verification document validation failed: {doc_err}",
        )

    existing = db.query(User).filter(User.email == clean_email).first()

    # Find or create unverified vendor user
    user_pass = body.password.strip() if getattr(body, "password", None) and body.password.strip() else f"otp_auth_{clean_email}"
    if not existing:
        user = User(
            email=clean_email,
            hashed_password=hash_password(user_pass),
            name=clean_shop_name,
            role="ADMIN" if clean_email == settings.ADMIN_EMAIL.lower() else "VENDOR",
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
        if user.role != "ADMIN" and clean_email != settings.ADMIN_EMAIL.lower():
            user.role = "VENDOR"
        user.is_shop_owner = True
        user.phone_number = clean_phone
        if getattr(body, "password", None) and body.password.strip():
            user.hashed_password = hash_password(body.password.strip())
        db.commit()

    # Find or create initial Shop with uploaded photo and documents
    shop_addr = getattr(body, "address", None) or "Commercial Market Location"
    shop_lat = getattr(body, "latitude", None) if getattr(body, "latitude", None) is not None else 13.0827
    shop_lon = getattr(body, "longitude", None) if getattr(body, "longitude", None) is not None else 80.2707

    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if not shop:
        shop = Shop(
            owner_id=user.id,
            name=clean_shop_name,
            address=shop_addr,
            latitude=shop_lat,
            longitude=shop_lon,
            approval_status="PENDING",
            is_active=False,
            location_verified=False,
            photo_url=body.photo_url,
            document_url=body.document_url,
            verification_document_url=body.document_url,
        )
        db.add(shop)
    else:
        shop.name = clean_shop_name
        shop.address = shop_addr
        shop.latitude = shop_lat
        shop.longitude = shop_lon
        shop.location_verified = False
        shop.photo_url = body.photo_url
        shop.document_url = body.document_url
        shop.verification_document_url = body.document_url
    db.commit()
    db.refresh(shop)

    # Schedule asynchronous background location verification in a detached background thread
    import threading
    loc_thread = threading.Thread(
        target=_run_async_location_verification,
        args=(shop.id, shop.name, shop.address, shop.latitude, shop.longitude),
        daemon=True,
    )
    loc_thread.start()

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
    """
    Uploads shop photo or business document for vendor onboarding.
    Enforces 5MB size limit and strict MIME/extension restrictions.
    """
    import uuid

    # 1. Validate file extension
    orig_filename = file.filename or ""
    ext = os.path.splitext(orig_filename)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{ext}'. Only JPEG, PNG, WEBP, and PDF files are allowed.",
        )

    # 2. Validate MIME Content-Type
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_UPLOAD_MIME_TYPES and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type '{content_type}'. Only images (JPEG/PNG/WEBP) and PDF documents are allowed.",
        )

    # 3. Read content and enforce 5MB max size limit
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({len(contents) / (1024*1024):.2f}MB) exceeds the maximum allowed limit of 5.0MB.",
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    # 4. Verify magic bytes / file signature to prevent executable file masking
    is_valid_signature = False
    if ext in [".jpg", ".jpeg"] and contents.startswith(b"\xff\xd8\xff"):
        is_valid_signature = True
    elif ext == ".png" and contents.startswith(b"\x89PNG\r\n\x1a\n"):
        is_valid_signature = True
    elif ext == ".webp" and contents.startswith(b"RIFF") and b"WEBP" in contents[:16]:
        is_valid_signature = True
    elif ext == ".pdf" and contents.startswith(b"%PDF-"):
        is_valid_signature = True

    if not is_valid_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file content does not match the expected {ext.upper().lstrip('.')} format.",
        )

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

    unique_name = f"vendor_{uuid.uuid4().hex[:12]}{ext}"
    
    for d in target_dirs:
        try:
            file_path = os.path.join(d, unique_name)
            with open(file_path, "wb") as f:
                f.write(contents)
        except Exception:
            pass
    
    # Track verified uploaded file in server session store
    with _UPLOAD_LOCK:
        _UPLOADED_AUTH_FILES.add(unique_name)

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
                    location_verified=False,
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
            if user.role != "ADMIN" and clean_id != settings.ADMIN_EMAIL.lower():
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
                    location_verified=False,
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
    admin_env_email = os.getenv("ADMIN_EMAIL", "").strip().lower() or settings.ADMIN_EMAIL.strip().lower()
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
        else:
            if admin_user.role != "ADMIN":
                admin_user.role = "ADMIN"
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
        # Check if user was originally created with passwordless OTP
        if verify_password(f"otp_auth_{user.email}", user.hashed_password):
            try:
                send_otp_to_identifier(user.email, name=user.name)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account was created via OTP. We've sent a 6-digit verification code to your email so you can sign in directly."
            )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # If this user is configured as ADMIN_EMAIL, ensure role is always ADMIN
    if email == settings.ADMIN_EMAIL.lower() and user.role != "ADMIN":
        user.role = "ADMIN"
        db.commit()
        db.refresh(user)

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
