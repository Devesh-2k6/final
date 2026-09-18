from datetime import datetime, UTC
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

import schemas
from auth_service import get_current_admin
from db.models import Shop, User, Product, ShopApprovalStatus, UserRole
from db.session import get_db
from services.email import send_email_notification, send_vendor_approval_email, send_vendor_rejection_email

router = APIRouter(prefix="/admin", tags=["Admin Moderation"])


def _serialize_admin_shop(shop: Shop) -> dict:
    owner = shop.owner
    return {
        "id": shop.id,
        "name": shop.name,
        "owner_id": shop.owner_id,
        "owner_name": owner.name if owner else None,
        "owner_email": owner.email if owner else None,
        "owner_phone": getattr(owner, "phone_number", None) if owner else None,
        "address": shop.address,
        "latitude": shop.latitude,
        "longitude": shop.longitude,
        "description": shop.description,
        "photo_url": getattr(shop, "photo_url", None),
        "document_url": getattr(shop, "document_url", None) or getattr(shop, "verification_document_url", None),
        "is_active": getattr(shop, "is_active", False),
        "location_verified": getattr(shop, "location_verified", False),
        "location_verified_at": getattr(shop, "location_verified_at", None),
        "location_verification_provider": getattr(shop, "location_verification_provider", None),
        "location_verification_name": getattr(shop, "location_verification_name", None),
        "location_verification_address": getattr(shop, "location_verification_address", None),
        "location_verification_distance_meters": getattr(shop, "location_verification_distance_meters", None),
        "location_verification_category": getattr(shop, "location_verification_category", None),
        "approval_status": getattr(shop, "approval_status", "PENDING"),
        "approval_reason": getattr(shop, "approval_reason", None),
        "approved_at": getattr(shop, "approved_at", None),
        "approved_by": getattr(shop, "approved_by", None),
        "rejected_at": getattr(shop, "rejected_at", None),
        "verification_document_url": getattr(shop, "verification_document_url", None) or getattr(shop, "document_url", None),
        "verification_document_name": getattr(shop, "verification_document_name", None),
        "location_override_by": getattr(shop, "location_override_by", None),
        "location_override_at": getattr(shop, "location_override_at", None),
        "location_override_reason": getattr(shop, "location_override_reason", None),
        "created_at": getattr(owner, "created_at", None) if owner else None,
    }


@router.get("/shops/pending", response_model=List[schemas.AdminShopResponse])
def list_pending_shops(
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Returns all food shops pending administrator review with complete location verification metadata.
    """
    pending_shops = (
        db.query(Shop)
        .options(joinedload(Shop.owner))
        .filter(Shop.approval_status == "PENDING")
        .order_by(Shop.location_verified_at.desc())
        .all()
    )
    return [_serialize_admin_shop(s) for s in pending_shops]


@router.get("/shops", response_model=List[schemas.AdminShopResponse])
def list_all_shops_for_admin(
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    status: Optional[str] = Query(None, description="Filter by status: PENDING, APPROVED, REJECTED, SUSPENDED"),
):
    """
    Lists all shops in the platform with optional status filtering.
    """
    query = db.query(Shop).options(joinedload(Shop.owner))
    if status:
        status_clean = status.strip().upper()
        query = query.filter(Shop.approval_status == status_clean)

    shops = query.order_by(Shop.location_verified_at.desc()).all()
    return [_serialize_admin_shop(s) for s in shops]


@router.post("/shops/{shop_id}/approve", response_model=schemas.AdminShopResponse)
def approve_shop(
    shop_id: str,
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    body: Optional[schemas.AdminShopApprovalRequest] = None,
):
    """
    Approves a verified food business shop, activating its selling privileges and live marketplace visibility.
    Supports location verification override when accompanied by a mandatory non-empty audit reason.
    """
    shop = db.query(Shop).options(joinedload(Shop.owner)).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    if not shop.owner or not getattr(shop.owner, "email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve shop: The merchant owner's email address has not been verified.",
        )

    now = datetime.now(UTC).replace(tzinfo=None)

    # Location verification check with admin override capability
    if not getattr(shop, "location_verified", False):
        if body and body.override_location_check:
            override_reason_clean = (body.override_reason or "").strip()
            if not override_reason_clean:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot override location verification without a non-empty override_reason.",
                )
            # Record audit trail on shop record
            shop.location_override_by = admin_user.email or admin_user.id
            shop.location_override_at = now
            shop.location_override_reason = override_reason_clean
            shop.location_verified = True
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve shop: The shop location has not passed OpenStreetMap / Nominatim verification. To approve an unverified shop, set override_location_check=true and provide an override_reason.",
            )

    # Check for mandatory storefront photo
    if not getattr(shop, "photo_url", None) or not str(shop.photo_url).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve shop: Storefront photo is missing. An admin cannot approve a shop without a storefront photo.",
        )

    # Check for mandatory business verification document
    has_doc = (getattr(shop, "document_url", None) and str(shop.document_url).strip()) or (
        getattr(shop, "verification_document_url", None) and str(shop.verification_document_url).strip()
    )
    if not has_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve shop: Business license document is missing. An admin cannot approve a shop without verification documents.",
        )

    shop.approval_status = "APPROVED"
    shop.is_active = True
    shop.approved_at = now
    shop.approved_by = admin_user.email
    shop.approval_reason = body.notes if body and body.notes else None
    shop.rejected_at = None

    db.commit()
    db.refresh(shop)

    # Send approval email notification to vendor in background thread
    try:
        if shop.owner and shop.owner.email:
            import threading
            threading.Thread(
                target=send_vendor_approval_email,
                kwargs={
                    "to_email": shop.owner.email,
                    "vendor_name": shop.owner.name,
                    "shop_name": shop.name,
                },
                daemon=True,
            ).start()
    except Exception:
        pass

    return _serialize_admin_shop(shop)


@router.post("/shops/{shop_id}/reject", response_model=schemas.AdminShopResponse)
def reject_shop(
    shop_id: str,
    body: schemas.AdminShopRejectRequest,
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Rejects a shop application with a required reason and sends resubmission instructions.
    """
    shop = db.query(Shop).options(joinedload(Shop.owner)).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    reason = body.reason.strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A rejection reason must be provided.",
        )

    now = datetime.now(UTC).replace(tzinfo=None)
    shop.approval_status = "REJECTED"
    shop.is_active = False
    shop.rejected_at = now
    shop.approval_reason = reason

    db.commit()
    db.refresh(shop)

    # Send rejection notification to vendor with resubmission guidance
    try:
        if shop.owner and shop.owner.email:
            send_vendor_rejection_email(
                to_email=shop.owner.email,
                vendor_name=shop.owner.name,
                shop_name=shop.name,
                reason=reason,
            )
    except Exception:
        pass

    return _serialize_admin_shop(shop)

    return _serialize_admin_shop(shop)


@router.post("/shops/{shop_id}/suspend", response_model=schemas.AdminShopResponse)
def suspend_shop(
    shop_id: str,
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    body: Optional[schemas.AdminShopSuspendRequest] = None,
):
    """
    Suspends an active shop due to policy violations or seller inaccuracies.
    """
    shop = db.query(Shop).options(joinedload(Shop.owner)).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    reason = body.reason.strip() if body and body.reason else "Suspended by administrator review."
    shop.approval_status = "SUSPENDED"
    shop.is_active = False
    shop.approval_reason = reason

    db.commit()
    db.refresh(shop)
    return _serialize_admin_shop(shop)


@router.post("/shops/{shop_id}/reactivate", response_model=schemas.AdminShopResponse)
def reactivate_shop(
    shop_id: str,
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Reactivates a previously suspended shop.
    """
    shop = db.query(Shop).options(joinedload(Shop.owner)).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    if not getattr(shop, "location_verified", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shop location is not verified.")

    now = datetime.now(UTC).replace(tzinfo=None)
    shop.approval_status = "APPROVED"
    shop.is_active = True
    shop.approved_at = now
    shop.approved_by = admin_user.email
    shop.approval_reason = None

    db.commit()
@router.post("/shops/{shop_id}/reverify-location", response_model=schemas.AdminShopResponse)
def reverify_shop_location(
    shop_id: str,
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    On-demand OpenStreetMap / Nominatim location verification trigger for administrators.
    Re-runs verification algorithms and updates the shop record immediately.
    """
    from services.location_verifier import verify_shop_location
    shop = db.query(Shop).options(joinedload(Shop.owner)).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    loc_res = verify_shop_location(
        name=shop.name,
        address=shop.address or "Commercial Location",
        latitude=shop.latitude or 13.0827,
        longitude=shop.longitude or 80.2707,
    )
    
    now = datetime.now(UTC).replace(tzinfo=None)
    shop.location_verified = loc_res.verified
    shop.location_verified_at = now
    shop.location_verification_provider = loc_res.provider or "nominatim"
    shop.location_verification_name = loc_res.matched_business_name or (shop.name if loc_res.verified else "No OSM Match Found")
    shop.location_verification_address = loc_res.matched_address or shop.address
    shop.location_verification_distance_meters = loc_res.distance_meters
    shop.location_verification_category = loc_res.category or ("supermarket" if loc_res.verified else "unverified_commercial")
    db.commit()
    db.refresh(shop)
    
    return _serialize_admin_shop(shop)


@router.get("/stats", response_model=schemas.AdminStatsResponse)
def get_admin_stats(
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Returns platform-wide moderation and onboarding analytics.
    """
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_customers = db.query(func.count(User.id)).filter(User.role == "CUSTOMER").scalar() or 0
    total_merchants = db.query(func.count(User.id)).filter(User.role == "VENDOR").scalar() or 0
    
    active_shops = db.query(func.count(Shop.id)).filter(Shop.is_active == True, Shop.approval_status == "APPROVED").scalar() or 0
    pending_shops = db.query(func.count(Shop.id)).filter(Shop.approval_status == "PENDING").scalar() or 0
    rejected_shops = db.query(func.count(Shop.id)).filter(Shop.approval_status == "REJECTED").scalar() or 0
    suspended_shops = db.query(func.count(Shop.id)).filter(Shop.approval_status == "SUSPENDED").scalar() or 0
    
    now = datetime.now(UTC).replace(tzinfo=None)
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_deals = (
        db.query(func.count(Product.id))
        .filter(Product.is_active == True, Product.expiry_date > now, Product.quantity > 0)
        .scalar() or 0
    )

    return schemas.AdminStatsResponse(
        total_users=total_users,
        total_customers=total_customers,
        total_merchants=total_merchants,
        active_shops=active_shops,
        pending_shops=pending_shops,
        rejected_shops=rejected_shops,
        suspended_shops=suspended_shops,
        total_products=total_products,
        total_deals=total_deals,
    )


@router.post("/shops/{shop_id}/allow-resubmit", response_model=schemas.AdminShopResponse)
def allow_vendor_resubmit(
    shop_id: str,
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Resets a rejected shop to PENDING to allow the vendor to upload corrected documents and photos.
    """
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")
    shop.approval_status = "PENDING"
    shop.approval_reason = None
    shop.rejected_at = None
    db.commit()
    db.refresh(shop)
    return _serialize_admin_shop(shop)


@router.patch("/shops/{shop_id}/location", response_model=schemas.AdminShopResponse)
def update_shop_location_by_admin(
    shop_id: str,
    body: schemas.AdminUpdateShopLocationRequest,
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Allows administrator to directly calibrate and update a shop's physical location on the live interactive map.
    """
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    shop.latitude = body.latitude
    shop.longitude = body.longitude
    if body.address:
        shop.address = body.address.strip()
    shop.location_verified = True
    shop.location_verified_at = datetime.now(UTC).replace(tzinfo=None)
    shop.location_override_by = admin_user.email
    shop.location_override_at = datetime.now(UTC).replace(tzinfo=None)
    shop.location_override_reason = body.reason or "Admin live map calibration"
    db.commit()
    db.refresh(shop)
    return _serialize_admin_shop(shop)


@router.get("/users")
def list_users_for_admin(
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = 0,
):
    """
    Lists users in the platform with search and role filter for admin management.
    """
    from db.models import User
    query = db.query(User)
    if role and role.upper() != "ALL":
        query = query.filter(User.role == role.upper())
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter((User.name.ilike(search_fmt)) | (User.email.ilike(search_fmt)))
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "email_verified": u.email_verified,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "phone_number": u.phone_number,
                "co2_saved_kg": u.co2_saved_kg,
                "total_money_saved": u.total_money_saved,
                "total_items_saved": u.total_items_saved,
            }
            for u in users
        ],
    }


@router.patch("/users/{user_id}/role")
def update_user_role_by_admin(
    user_id: str,
    body: dict,
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Allows administrator to update a user's role (CUSTOMER, VENDOR, ADMIN).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    new_role = body.get("role")
    if new_role and new_role.upper() in ["CUSTOMER", "VENDOR", "ADMIN"]:
        user.role = new_role.upper()
    db.commit()
    db.refresh(user)
    return {"status": "success", "user_id": user.id, "role": user.role}


@router.get("/orders")
def list_orders_for_admin(
    admin_user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = 0,
):
    """
    Returns platform-wide orders for administrative monitoring and auditing.
    """
    from db.models import Order
    query = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.shop),
        joinedload(Order.product),
    )
    if status and status.upper() != "ALL":
        query = query.filter(Order.status == status.upper())
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "orders": [
            {
                "id": o.id,
                "customer_id": o.customer_id,
                "customer_name": o.customer.name if o.customer else "Customer",
                "customer_email": o.customer.email if o.customer else None,
                "shop_id": o.shop_id,
                "shop_name": o.shop.name if o.shop else "Store",
                "product_name": o.product.name if o.product else "Deal Product",
                "order_type": o.order_type,
                "status": o.status,
                "payment_status": o.payment_status,
                "total_amount": o.total_amount,
                "quantity": o.quantity,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orders
        ],
    }
