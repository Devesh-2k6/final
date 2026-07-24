from datetime import datetime, UTC
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_cache.decorator import cache
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

import schemas
from auth_service import get_current_shop_owner
from db.models import Shop, User, Product, Reservation, Order
from db.session import get_db

router = APIRouter(prefix="/shops", tags=["Shops"])

def _serialize_shop(shop: Shop) -> dict:
    return {
        "id": shop.id,
        "name": shop.name,
        "address": shop.address,
        "latitude": shop.latitude,
        "longitude": shop.longitude,
        "description": shop.description,
        "owner_uid": shop.owner_id,
        "average_rating": shop.average_rating,
        "rating_count": shop.rating_count,
    }

def _get_owner_shop(user: User, db: Session) -> Shop:
    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Create your shop before adding products."
        )
    return shop


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

    shops_with_counts = (
        db.query(Shop, func.coalesce(deal_count_subq.c.count, 0))
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
    if db.query(Shop).filter(Shop.owner_id == user.id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="You already have a shop. Edit it in settings."
        )

    shop = Shop(
        owner_id=user.id,
        name=shop_in.name,
        address=shop_in.address,
        latitude=shop_in.latitude,
        longitude=shop_in.longitude,
        description=shop_in.description,
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
    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No shop found")
    return _serialize_shop(shop)


@router.get("/reservations", response_model=list[schemas.ReservationResponse])
def get_shop_reservations(
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    # Optimized query to load Product and Shop in one go
    return db.query(Reservation).filter(Reservation.shop_id == shop.id)\
        .options(joinedload(Reservation.product).joinedload(Product.shop))\
        .order_by(Reservation.created_at.desc()).all()


@router.get("/orders", response_model=list[schemas.OrderResponse])
def get_shop_orders(
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    # Optimized query to load Product, Shop, and Customer in one go
    return db.query(Order).filter(Order.shop_id == shop.id)\
        .options(
            joinedload(Order.product).joinedload(Product.shop),
            joinedload(Order.customer)
        )\
        .order_by(Order.created_at.desc()).all()


@router.get("/{shop_id}")
def read_shop(shop_id: str, db: Annotated[Session, Depends(get_db)]):
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
    return _serialize_shop(shop)


@router.put("/{shop_id}")
def update_shop(
    shop_id: str,
    shop_in: schemas.ShopBase,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
    if shop.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this shop")

    shop.name = shop_in.name
    shop.address = shop_in.address
    shop.latitude = shop_in.latitude
    shop.longitude = shop_in.longitude
    shop.description = shop_in.description

    db.commit()
    db.refresh(shop)
    return _serialize_shop(shop)
