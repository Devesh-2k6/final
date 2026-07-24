from datetime import datetime, UTC
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

import schemas
from auth_service import get_current_user, get_current_shop_owner
from db.models import User, Product, Shop, Order
from db.session import get_db
from routers.shops import _get_owner_shop
from routers.products import _calculate_dynamic_price

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.OrderCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if user.is_shop_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Shop owners cannot place orders."
        )
        
    product = db.query(Product).options(joinedload(Product.shop)).filter(Product.id == order_in.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
        
    if product.quantity < order_in.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Product not available in requested quantity."
        )
        
    now = datetime.now(UTC).replace(tzinfo=None)
    if product.expiry_date < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product is expired.")

    # Calculate price at order time
    current_price = _calculate_dynamic_price(product, now)
    
    # Resolve shopkeeper id from the shop owner
    shop = product.shop
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    order = Order(
        customer_id=user.id,
        shopkeeper_id=shop.owner_id,
        shop_id=product.shop_id,
        product_id=product.id,
        order_type=order_in.order_type,
        status="PENDING",
        quantity=order_in.quantity,
        total_price=current_price * order_in.quantity,
        delivery_fee=order_in.delivery_fee if order_in.order_type == "DELIVERY" else 0.0,
        customer_name=order_in.customer_name if order_in.order_type == "DELIVERY" else user.name,
        customer_phone=order_in.customer_phone if order_in.order_type == "DELIVERY" else None,
        delivery_address=order_in.delivery_address if order_in.order_type == "DELIVERY" else None,
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Return order with pre-loaded relationships
    return db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order.id).first()


@router.get("/me", response_model=list[schemas.OrderResponse])
def get_my_orders(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    # Optimized query
    return db.query(Order).filter(Order.customer_id == user.id)\
        .options(
            joinedload(Order.product).joinedload(Product.shop),
            joinedload(Order.customer)
        )\
        .order_by(Order.created_at.desc()).all()


@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: str,
    status_update: schemas.OrderStatusUpdate,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    
    # Optimized query to pre-load relationships
    order = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order_id).first()
    
    if not order or order.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    new_status = status_update.status.upper()
    valid_statuses = ["ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid status: {new_status}"
        )
        
    # Stock reduction logic: Reduce stock on Order Confirmation (ACCEPTED status transition)
    if new_status == "ACCEPTED" and order.status == "PENDING":
        product = db.query(Product).filter(Product.id == order.product_id).with_for_update().first()
        if not product or product.quantity < order.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Insufficient product stock to accept this order."
            )
        # Deduct quantity from product
        product.quantity -= order.quantity
        order.status = "ACCEPTED"
        
    elif new_status == "CANCELLED" and order.status == "PENDING":
        order.status = "CANCELLED"
        
    elif new_status == "CANCELLED" and order.status in ["ACCEPTED", "OUT_FOR_DELIVERY"]:
        # If cancelled after accepted, restore the stock
        product = order.product
        if product:
            product.quantity += order.quantity
        order.status = "CANCELLED"
        
    elif new_status == "OUT_FOR_DELIVERY" and order.status == "ACCEPTED":
        if order.order_type != "DELIVERY":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Only delivery orders can be set to Out for Delivery."
            )
        order.status = "OUT_FOR_DELIVERY"
        
    elif new_status == "DELIVERED" and order.status in ["ACCEPTED", "OUT_FOR_DELIVERY"]:
        order.status = "DELIVERED"
        order.completed_at = datetime.now(UTC).replace(tzinfo=None)
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid transition from {order.status} to {new_status}"
        )
        
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/cancel", response_model=schemas.OrderResponse)
def cancel_order(
    order_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    # Optimized query
    order = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order_id).first()
    
    if not order or order.customer_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    if order.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only pending orders can be cancelled."
        )
        
    order.status = "CANCELLED"
    db.commit()
    db.refresh(order)
    return order
