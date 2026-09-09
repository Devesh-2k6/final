from datetime import datetime, UTC
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi_cache.decorator import cache
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

import schemas
from auth_service import get_current_shop_owner
from db.models import Shop, User, Product, Reservation, Order
from db.session import get_db
from services.location_verifier import verify_shop_location
from storage import upload_shop_document

router = APIRouter(prefix="/shops", tags=["Shops"])

def _serialize_shop(shop: Shop) -> dict:
    has_upi = bool(shop.upi_id and shop.upi_id.strip())
    # A shop can only offer delivery if delivery_enabled is True AND a valid UPI ID is registered
    can_deliver = bool(getattr(shop, "delivery_enabled", True) and has_upi)
    return {
        "id": shop.id,
        "name": shop.name,
        "address": shop.address,
        "latitude": shop.latitude,
        "longitude": shop.longitude,
        "description": shop.description,
        "owner_id": shop.owner_id,
        "owner_uid": shop.owner_id,
        "average_rating": shop.average_rating,
        "rating_count": shop.rating_count,
        "is_active": getattr(shop, "is_active", False),
        "delivery_enabled": can_deliver,
        "delivery_enabled_raw": getattr(shop, "delivery_enabled", True),
        "upi_id": getattr(shop, "upi_id", None),
        "has_upi_id": has_upi,
        "delivery_fee": getattr(shop, "delivery_fee", 0.0),
        "min_order_amount": getattr(shop, "min_order_amount", 0.0),
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
    }

def _get_owner_shop(user: User, db: Session, require_active: bool = True) -> Shop:
    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shop registered for this merchant account. Please complete shop setup and location verification.",
        )
    if require_active:
        if not getattr(shop, "is_active", False) or getattr(shop, "approval_status", "") != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Your shop is not yet approved and active. Product management is currently locked.",
            )
    return shop


@router.post("/upload-document", response_model=schemas.ShopDocumentUploadResponse)
async def upload_shop_verification_document(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_shop_owner),
):
    """
    Uploads a merchant business verification document (FSSAI, GST, Trade Certificate, Store Photo).
    Accepts PDF, JPEG, PNG, WEBP files up to 10MB.
    """
    valid_content_types = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ]
    ct = (file.content_type or "").lower()
    if ct not in valid_content_types and not file.filename.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png', '.webp')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a PDF, PNG, JPG, or WEBP document.",
        )

    # 10MB limit check
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit.",
        )

    file.file.seek(0)
    doc_url, orig_name = upload_shop_document(file, request)
    return schemas.ShopDocumentUploadResponse(document_url=doc_url, filename=orig_name)


@router.post("/verify-location", response_model=schemas.ShopLocationVerifyResponse)
def verify_shop_location_precheck(
    payload: schemas.ShopLocationVerifyRequest,
    user: Annotated[User, Depends(get_current_shop_owner)],
):
    """
    Pre-check location verification against OpenStreetMap / Nominatim.
    Does NOT create or activate a shop.
    """
    result = verify_shop_location(
        name=payload.name,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    return schemas.ShopLocationVerifyResponse(
        verified=result.verified,
        is_error=result.is_error,
        provider=result.provider,
        matched_business_name=result.matched_business_name,
        matched_address=result.matched_address,
        distance_meters=result.distance_meters,
        category=result.category,
        message=result.message,
    )


@router.get("/")
@cache(expire=60)
def list_shops(db: Annotated[Session, Depends(get_db)]):
    now = datetime.now(UTC).replace(tzinfo=None)
    
    deal_count_subq = (
        db.query(Product.shop_id, func.count(Product.id).label("count"))
        .filter(Product.expiry_date > now, Product.quantity > 0)
        .group_by(Product.shop_id)
        .subquery()
    )

    # Customers only see fully active, location-verified, and approved shops
    shops_with_counts = (
        db.query(Shop, func.coalesce(deal_count_subq.c.count, 0))
        .filter(Shop.is_active == True, Shop.approval_status == "APPROVED", Shop.location_verified == True)
        .outerjoin(deal_count_subq, Shop.id == deal_count_subq.c.shop_id)
        .all()
    )

    result: list[dict] = []
    for shop, deal_count in shops_with_counts:
        row = _serialize_shop(shop)
        row["deal_count"] = deal_count
        result.append(row)
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_shop(
    shop_in: schemas.ShopBase,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    # Server-side food business location verification against real OpenStreetMap / Nominatim data
    v_res = verify_shop_location(
        name=shop_in.name,
        address=shop_in.address,
        latitude=shop_in.latitude,
        longitude=shop_in.longitude,
    )

    now = datetime.now(UTC).replace(tzinfo=None)
    is_loc_verified = bool(v_res.verified)
    provider = v_res.provider if is_loc_verified else "manual_submission"
    matched_name = v_res.matched_business_name if is_loc_verified else shop_in.name
    matched_addr = v_res.matched_address if is_loc_verified else shop_in.address
    dist_meters = v_res.distance_meters if is_loc_verified else 0.0
    category = v_res.category if is_loc_verified else "food_retail"
    approval_reason = None if is_loc_verified else f"Location pending admin review: {v_res.message}"

    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if shop:
        shop.name = shop_in.name
        shop.address = shop_in.address
        shop.latitude = shop_in.latitude
        shop.longitude = shop_in.longitude
        shop.description = shop_in.description
        if shop_in.verification_document_url is not None:
            shop.verification_document_url = shop_in.verification_document_url
        if shop_in.verification_document_name is not None:
            shop.verification_document_name = shop_in.verification_document_name
        if shop_in.upi_id is not None:
            shop.upi_id = shop_in.upi_id.strip() if shop_in.upi_id else None
        shop.delivery_enabled = shop_in.delivery_enabled
        shop.delivery_fee = shop_in.delivery_fee
        shop.min_order_amount = shop_in.min_order_amount
        shop.location_verified = is_loc_verified
        shop.location_verified_at = now if is_loc_verified else None
        shop.location_verification_provider = provider
        shop.location_verification_name = matched_name
        shop.location_verification_address = matched_addr
        shop.location_verification_distance_meters = dist_meters
        shop.location_verification_category = category
        shop.approval_status = "PENDING"
        shop.approved_at = None
        shop.approved_by = None
        shop.approval_reason = approval_reason
        shop.rejected_at = None
        shop.is_active = False
    else:
        shop = Shop(
            owner_id=user.id,
            name=shop_in.name,
            address=shop_in.address,
            latitude=shop_in.latitude,
            longitude=shop_in.longitude,
            description=shop_in.description,
            verification_document_url=shop_in.verification_document_url,
            verification_document_name=shop_in.verification_document_name,
            upi_id=shop_in.upi_id.strip() if shop_in.upi_id else None,
            delivery_enabled=shop_in.delivery_enabled,
            delivery_fee=shop_in.delivery_fee,
            min_order_amount=shop_in.min_order_amount,
            is_active=False,
            location_verified=is_loc_verified,
            location_verified_at=now if is_loc_verified else None,
            location_verification_provider=provider,
            location_verification_name=matched_name,
            location_verification_address=matched_addr,
            location_verification_distance_meters=dist_meters,
            location_verification_category=category,
            approval_status="PENDING",
            approved_at=None,
            approved_by=None,
            approval_reason=approval_reason,
        )
        db.add(shop)

    db.commit()
    db.refresh(shop)
    return _serialize_shop(shop)



@router.get("/me")
def read_my_shop(
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db, require_active=False)
    return _serialize_shop(shop)


@router.get("/reservations", response_model=list[schemas.ReservationResponse])
def get_shop_reservations(
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db, require_active=True)
    return db.query(Reservation).filter(Reservation.shop_id == shop.id)\
        .options(joinedload(Reservation.product).joinedload(Product.shop))\
        .order_by(Reservation.created_at.desc()).all()


@router.get("/orders", response_model=list[schemas.OrderResponse])
def get_shop_orders(
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    from routers.orders import _decorate_order
    shop = _get_owner_shop(user, db, require_active=True)
    orders = db.query(Order).filter(Order.shop_id == shop.id)\
        .options(
            joinedload(Order.product).joinedload(Product.shop),
            joinedload(Order.customer)
        )\
        .order_by(Order.created_at.desc()).all()
    return [_decorate_order(o) for o in orders]


@router.get("/{shop_id}")
def read_shop(shop_id: str, db: Annotated[Session, Depends(get_db)]):
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
    return _serialize_shop(shop)


@router.put("/{shop_id}")
@router.patch("/{shop_id}")
def update_shop(
    shop_id: str,
    shop_in: schemas.ShopUpdate,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
    if shop.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this shop")

    # If location or name changes, re-verify location against OpenStreetMap
    new_name = shop_in.name if shop_in.name is not None else shop.name
    new_address = shop_in.address if shop_in.address is not None else shop.address
    new_lat = shop_in.latitude if shop_in.latitude is not None else shop.latitude
    new_lon = shop_in.longitude if shop_in.longitude is not None else shop.longitude

    if (
        (shop_in.latitude is not None and shop.latitude != shop_in.latitude)
        or (shop_in.longitude is not None and shop.longitude != shop_in.longitude)
        or (shop_in.name is not None and shop.name != shop_in.name)
        or (shop_in.address is not None and shop.address != shop_in.address)
    ):
        v_res = verify_shop_location(
            name=new_name,
            address=new_address,
            latitude=new_lat,
            longitude=new_lon,
        )
        now = datetime.now(UTC).replace(tzinfo=None)
        is_loc_verified = bool(v_res.verified)
        shop.location_verified = is_loc_verified
        shop.location_verified_at = now if is_loc_verified else None
        shop.location_verification_provider = v_res.provider if is_loc_verified else "manual_submission"
        shop.location_verification_name = v_res.matched_business_name if is_loc_verified else new_name
        shop.location_verification_address = v_res.matched_address if is_loc_verified else new_address
        shop.location_verification_distance_meters = v_res.distance_meters if is_loc_verified else 0.0
        shop.location_verification_category = v_res.category if is_loc_verified else "food_retail"
        if not is_loc_verified:
            shop.approval_status = "PENDING"
            shop.approval_reason = f"Location pending admin review: {v_res.message}"
            shop.is_active = False

    if shop_in.name is not None:
        shop.name = shop_in.name
    if shop_in.address is not None:
        shop.address = shop_in.address
    if shop_in.latitude is not None:
        shop.latitude = shop_in.latitude
    if shop_in.longitude is not None:
        shop.longitude = shop_in.longitude
    if shop_in.description is not None:
        shop.description = shop_in.description
    if shop_in.verification_document_url is not None:
        shop.verification_document_url = shop_in.verification_document_url
    if shop_in.verification_document_name is not None:
        shop.verification_document_name = shop_in.verification_document_name
    if shop_in.upi_id is not None:
        shop.upi_id = shop_in.upi_id.strip() if shop_in.upi_id else None
    if shop_in.delivery_enabled is not None:
        shop.delivery_enabled = shop_in.delivery_enabled
    if shop_in.delivery_fee is not None:
        shop.delivery_fee = shop_in.delivery_fee
    if shop_in.min_order_amount is not None:
        shop.min_order_amount = shop_in.min_order_amount

    db.commit()
    db.refresh(shop)
    return _serialize_shop(shop)
