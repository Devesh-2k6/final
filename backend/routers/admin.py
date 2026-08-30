from datetime import datetime, UTC
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

import schemas
from auth_service import get_current_admin
from db.models import Shop, User, Product, ShopApprovalStatus, UserRole
from db.session import get_db
from services.email import send_email_notification

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
        "verification_document_url": getattr(shop, "verification_document_url", None),
        "verification_document_name": getattr(shop, "verification_document_name", None),
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
    """
    shop = db.query(Shop).options(joinedload(Shop.owner)).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    if not shop.owner or not getattr(shop.owner, "email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve shop: The merchant owner's email address has not been verified.",
        )

    if not getattr(shop, "location_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve shop: The shop location has not passed OpenStreetMap / Nominatim verification.",
        )

    now = datetime.now(UTC).replace(tzinfo=None)
    shop.approval_status = "APPROVED"
    shop.is_active = True
    shop.approved_at = now
    shop.approved_by = admin_user.email
    shop.approval_reason = body.notes if body and body.notes else None
    shop.rejected_at = None

    db.commit()
    db.refresh(shop)

    # Send approval email notification to merchant
    try:
        if shop.owner and shop.owner.email:
            send_email_notification(
                to_email=shop.owner.email,
                subject=f"🎉 Congratulations! {shop.name} has been APPROVED on ExpiryGo",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <h2 style="color: #10b981;">Your Shop is Approved & Live!</h2>
                    <p>Hello <strong>{shop.owner.name}</strong>,</p>
                    <p>Great news! Your shop <strong>{shop.name}</strong> has been reviewed and approved by the ExpiryGo Trust & Moderation team.</p>
                    <p>You can now log in to your Merchant Dashboard, add surplus food items, publish discount deals, and start rescuing food!</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">ExpiryGo Marketplace Team</p>
                </div>
                """,
                text_fallback=f"Hello {shop.owner.name},\n\nYour shop '{shop.name}' has been APPROVED on ExpiryGo! You can now list and sell surplus food items.\n\nExpiryGo Team",
            )
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
    Rejects a shop application with a required reason (e.g. non-food business, location mismatch).
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

    # Send rejection notification to merchant
    try:
        if shop.owner and shop.owner.email:
            send_email_notification(
                to_email=shop.owner.email,
                subject=f"Update regarding your ExpiryGo shop application: {shop.name}",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <h2 style="color: #ef4444;">Shop Application Status Update</h2>
                    <p>Hello <strong>{shop.owner.name}</strong>,</p>
                    <p>Thank you for your interest in ExpiryGo. After reviewing your application for <strong>{shop.name}</strong>, our team was unable to approve your shop at this time.</p>
                    <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <p style="margin: 0; color: #991b1b; font-weight: 600;">Reason for Rejection:</p>
                        <p style="margin: 8px 0 0 0; color: #7f1d1d;">{reason}</p>
                    </div>
                    <p>If you believe this is an error or would like to submit corrected location and food business documentation, please update your shop profile in Shop Setup.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">ExpiryGo Marketplace Team</p>
                </div>
                """,
                text_fallback=f"Hello {shop.owner.name},\n\nYour shop application for '{shop.name}' was not approved.\nReason: {reason}\n\nYou can update your location details in Shop Setup.\n\nExpiryGo Team",
            )
    except Exception:
        pass

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
    total_merchants = db.query(func.count(User.id)).filter(User.role == "SHOPKEEPER").scalar() or 0
    
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
