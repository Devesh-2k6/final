import secrets
from datetime import datetime, UTC
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

import schemas
from auth_service import get_current_user, get_current_shop_owner
from db.models import User, Product, Shop, Order, utc_now
from db.session import get_db
from routers.shops import _get_owner_shop
from routers.products import _calculate_dynamic_price, _serialize_product
from websocket_manager import manager

router = APIRouter(prefix="/orders", tags=["Orders"])


def _decorate_order(order: Order) -> Order:
    """
    Computes dynamic properties for OrderResponse:
    - is_payment_stuck & payment_stuck_minutes (45-minute unverified threshold)
    - refund_guidance (for cancelled orders where payment was reported/paid)
    """
    now = utc_now()
    order.is_payment_stuck = False
    order.payment_stuck_minutes = 0

    if order.status not in ["DELIVERED", "CANCELLED"]:
        if order.payment_status == "CUSTOMER_REPORTED_UNVERIFIED":
            ref_time = order.payment_reported_at or order.created_at
            elapsed = int((now - ref_time).total_seconds() / 60)
            if elapsed >= 45:
                order.is_payment_stuck = True
                order.payment_stuck_minutes = elapsed
        elif order.payment_status == "UNPAID":
            elapsed = int((now - order.created_at).total_seconds() / 60)
            if elapsed >= 45:
                order.is_payment_stuck = True
                order.payment_stuck_minutes = elapsed

    if order.status == "CANCELLED" and getattr(order, "previous_payment_status", None) in ["PAID", "CUSTOMER_REPORTED_UNVERIFIED"]:
        shop_name = order.shop.name if order.shop else "the merchant"
        phone = (order.shop.owner.phone_number if order.shop and order.shop.owner and order.shop.owner.phone_number else None) or "the merchant directly"
        order.refund_guidance = (
            f"Your order #{order.id[:8]} has been cancelled. As payment was reported/completed via UPI, "
            f"the merchant ({shop_name}) has been instructed to issue your refund directly to your source UPI account within 2–4 business hours. "
            f"If not received, please contact {shop_name} at {phone}."
        )

    return order


@router.post("/", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.OrderCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Creates a new order.
    Enforces:
    1. Single shop per order (blocks mixed-shop orders).
    2. Shop delivery availability (delivery_enabled == True AND valid upi_id present for DELIVERY).
    3. Row-level stock locking and dynamic price calculation.
    4. Cryptographically random 4-digit PIN generation for delivery orders.
    """
    now = utc_now()

    # Normalize items list (supports both single product_id and items array)
    items_to_process: List[tuple[str, int]] = []
    if order_in.items and len(order_in.items) > 0:
        for item in order_in.items:
            if item.quantity <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item quantity must be greater than 0.")
            items_to_process.append((item.product_id, item.quantity))
    elif order_in.product_id:
        if order_in.quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than 0.")
        items_to_process.append((order_in.product_id, order_in.quantity))
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide at least one product to order.")

    # 1. Authoritatively lock products and verify they all belong to exactly ONE shop
    product_ids = [pid for pid, _ in items_to_process]
    products = db.query(Product).filter(Product.id.in_(product_ids)).with_for_update().all()
    product_map = {p.id: p for p in products}

    if len(products) != len(set(product_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more selected products were not found.")

    shop_ids = {p.shop_id for p in products}
    if len(shop_ids) > 1:
        conflicting_shops = db.query(Shop.name).filter(Shop.id.in_(shop_ids)).all()
        shop_names = ", ".join([s[0] for s in conflicting_shops])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"One shop per order is strictly required. Your order contains items from multiple shops: {shop_names}. Please place separate orders for each shop."
        )

    primary_product = products[0]
    shop = primary_product.shop
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found.")

    if not getattr(shop, "is_active", False) or getattr(shop, "approval_status", "") != "APPROVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Shop '{shop.name}' is currently not approved or inactive.")

    # 2. Check Delivery vs Pickup constraints
    normalized_order_type = order_in.order_type.strip().upper()
    if normalized_order_type not in ["PICKUP", "DELIVERY"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order type. Must be 'PICKUP' or 'DELIVERY'.")

    delivery_pin: Optional[str] = None
    delivery_fee = 0.0

    if normalized_order_type == "DELIVERY":
        # Check shop delivery enablement and UPI ID presence
        has_upi = bool(shop.upi_id and shop.upi_id.strip())
        if not getattr(shop, "delivery_enabled", True) or not has_upi:
            if not has_upi:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Shop '{shop.name}' has not configured a UPI ID yet and cannot accept delivery orders. Please choose in-store Pickup or check back later."
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Delivery is currently disabled by shop '{shop.name}'. Please choose in-store Pickup."
            )

        if not order_in.delivery_address or not order_in.delivery_address.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid delivery address is mandatory for delivery orders.")

        # Cryptographically generate secure 4-digit PIN for delivery handover
        delivery_pin = f"{secrets.randbelow(10000):04d}"
        delivery_fee = max(0.0, float(order_in.delivery_fee or getattr(shop, "delivery_fee", 0.0)))

    # 3. Calculate authoritative price and validate stock & expiry
    total_order_price = 0.0
    total_order_qty = 0

    for pid, qty in items_to_process:
        prod = product_map[pid]
        if prod.quantity < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{prod.name}' has insufficient stock (Requested: {qty}, Available: {prod.quantity})."
            )
        if prod.expiry_date < now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product '{prod.name}' is expired.")

        unit_price = _calculate_dynamic_price(prod, now)
        total_order_price += (unit_price * qty)
        total_order_qty += qty

    # Check minimum order amount if set
    min_amount = getattr(shop, "min_order_amount", 0.0)
    if min_amount > 0 and total_order_price < min_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order amount for '{shop.name}' is ₹{min_amount:.2f} (Current: ₹{total_order_price:.2f})."
        )

    # 4. Create primary Order record
    order = Order(
        customer_id=user.id,
        shopkeeper_id=shop.owner_id,
        shop_id=shop.id,
        product_id=primary_product.id,
        order_type=normalized_order_type,
        status="PENDING",
        payment_method="UPI",
        payment_status="UNPAID",
        quantity=total_order_qty,
        total_price=total_order_price,
        delivery_fee=delivery_fee,
        customer_name=(order_in.customer_name or user.name).strip(),
        customer_phone=(order_in.customer_phone or getattr(user, "phone_number", None) or "").strip() or None,
        delivery_address=(order_in.delivery_address or "").strip() or None,
        delivery_notes=(order_in.delivery_notes or "").strip() or None,
        delivery_pin=delivery_pin,
        delivery_pin_attempts=0,
        delivery_pin_locked=False,
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    # Broadcast new order to shopkeeper WebSocket
    try:
        manager.broadcast_sync({
            "type": "new_order",
            "order_id": str(order.id),
            "shop_id": str(order.shop_id),
            "product_name": primary_product.name,
            "quantity": order.quantity,
            "order_type": order.order_type,
            "payment_status": order.payment_status,
        })
    except Exception:
        pass

    loaded = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order.id).first()
    return _decorate_order(loaded)


@router.get("/me", response_model=list[schemas.OrderResponse])
def get_my_orders(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Returns all orders placed by the current customer with stuck-payment and refund annotations.
    """
    orders = db.query(Order).filter(Order.customer_id == user.id)\
        .options(
            joinedload(Order.product).joinedload(Product.shop),
            joinedload(Order.customer)
        )\
        .order_by(Order.created_at.desc()).all()
    return [_decorate_order(o) for o in orders]


@router.get("/shop", response_model=list[schemas.OrderResponse])
def get_vendor_orders(
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Returns all orders for the authenticated vendor's shop.
    """
    shop = _get_owner_shop(user, db, require_active=False)
    orders = db.query(Order).filter(Order.shop_id == shop.id)\
        .options(
            joinedload(Order.product).joinedload(Product.shop),
            joinedload(Order.customer)
        )\
        .order_by(Order.created_at.desc()).all()
    return [_decorate_order(o) for o in orders]


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order_by_id(
    order_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Fetches a specific order with strict multi-tenant authorization (Customer who placed it, Vendor who owns the shop, or Admin).
    """
    order = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    is_customer = (order.customer_id == user.id)
    is_shop_owner = (order.shopkeeper_id == user.id)
    is_admin = getattr(user, "role", "") == "ADMIN"

    if not (is_customer or is_shop_owner or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this order.")

    return _decorate_order(order)


@router.post("/{order_id}/report-payment", response_model=schemas.OrderResponse)
def report_upi_payment(
    order_id: str,
    payload: schemas.OrderReportPaymentRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Customer submits UPI Transaction Reference (UTR).
    Transitions state: UNPAID -> CUSTOMER_REPORTED_UNVERIFIED.
    Customer CANNOT self-confirm to PAID.
    """
    order = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order_id).first()

    if not order or order.customer_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if order.status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot report payment for a cancelled order.")

    if order.payment_status == "PAID":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment for this order is already verified and confirmed.")

    order.payment_status = "CUSTOMER_REPORTED_UNVERIFIED"
    order.upi_transaction_id = payload.upi_transaction_id
    order.payment_reported_at = utc_now()

    db.commit()
    db.refresh(order)

    try:
        manager.broadcast_sync({
            "type": "order_payment_reported",
            "order_id": str(order.id),
            "shop_id": str(order.shop_id),
            "upi_transaction_id": order.upi_transaction_id,
            "payment_status": order.payment_status,
        })
    except Exception:
        pass

    return _decorate_order(order)


@router.post("/{order_id}/verify-payment", response_model=schemas.OrderResponse)
def verify_vendor_payment(
    order_id: str,
    payload: schemas.OrderVerifyPaymentRequest,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Shopkeeper verifies and confirms that funds have been credited to their UPI bank account.
    STRICT STATE MACHINE RULE: Only transitions from CUSTOMER_REPORTED_UNVERIFIED -> PAID.
    Rejects call with error if order is not in CUSTOMER_REPORTED_UNVERIFIED status.
    """
    shop = _get_owner_shop(user, db, require_active=False)

    order = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order_id).first()

    if not order or order.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found for your shop.")

    if order.status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot verify payment for a cancelled order.")

    if order.payment_status == "PAID":
        return _decorate_order(order)

    if order.payment_status != "CUSTOMER_REPORTED_UNVERIFIED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot verify payment: current payment status is '{order.payment_status}'. Order must be in 'CUSTOMER_REPORTED_UNVERIFIED' status before vendor verification."
        )

    order.payment_status = "PAID"
    order.payment_verified_at = utc_now()

    db.commit()
    db.refresh(order)

    try:
        manager.broadcast_sync({
            "type": "order_payment_verified",
            "order_id": str(order.id),
            "shop_id": str(order.shop_id),
            "payment_status": order.payment_status,
        })
    except Exception:
        pass

    return _decorate_order(order)


@router.post("/{order_id}/verify-delivery-pin", response_model=schemas.OrderResponse)
def verify_delivery_pin(
    order_id: str,
    payload: schemas.OrderVerifyPinRequest,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Vendor/delivery driver verifies the 4-digit handover delivery PIN provided by the customer at the door.
    Enforces a strict 5-attempt rate limit and lockout protection.
    Transitions order to DELIVERED.
    """
    shop = _get_owner_shop(user, db, require_active=False)

    order = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order_id).first()

    if not order or order.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found for your shop.")

    if order.order_type != "DELIVERY":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN verification is only applicable for DELIVERY orders.")

    if order.status == "DELIVERED":
        return _decorate_order(order)

    if order.status != "OUT_FOR_DELIVERY":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is in '{order.status}' status. Order must be 'OUT_FOR_DELIVERY' to verify delivery PIN."
        )

    # Check lockout
    if getattr(order, "delivery_pin_locked", False):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Delivery PIN verification is LOCKED due to excessive failed attempts. Please contact customer support."
        )

    clean_pin = payload.pin.strip()
    if clean_pin != order.delivery_pin:
        order.delivery_pin_attempts = getattr(order, "delivery_pin_attempts", 0) + 1
        if order.delivery_pin_attempts >= 5:
            order.delivery_pin_locked = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Delivery PIN verification LOCKED: 5 incorrect attempts exceeded. Contact customer support."
            )
        db.commit()
        remaining = 5 - order.delivery_pin_attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid delivery PIN. {remaining} attempt(s) remaining before lockout."
        )

    # PIN matches! Complete delivery
    order.delivery_pin_attempts = 0
    order.status = "DELIVERED"
    order.completed_at = utc_now()

    # Update impact tracking for customer
    customer = db.get(User, order.customer_id)
    if customer and order.product:
        customer.total_items_saved += order.quantity
        customer.co2_saved_kg += (0.5 * order.quantity)
        orig_total = order.product.original_price * order.quantity
        saved_amt = orig_total - order.total_price
        if saved_amt > 0:
            customer.total_money_saved += saved_amt

    db.commit()
    db.refresh(order)

    try:
        manager.broadcast_sync({
            "type": "order_status_changed",
            "order_id": str(order.id),
            "shop_id": str(order.shop_id),
            "status": order.status
        })
    except Exception:
        pass

    return _decorate_order(order)


@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
@router.put("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: str,
    status_update: schemas.OrderStatusUpdate,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Shopkeeper manages order lifecycle:
    - ACCEPTED: Requires payment_status == 'PAID'. Locks and deducts inventory stock.
    - OUT_FOR_DELIVERY: Allowed only from ACCEPTED for DELIVERY orders.
    - DELIVERED: For DELIVERY orders, requires PIN verification via /verify-delivery-pin.
    - CANCELLED: Restores inventory stock if was previously accepted.
    """
    shop = _get_owner_shop(user, db, require_active=False)

    order = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order_id).first()

    if not order or order.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found for your shop.")

    new_status = status_update.status.upper()
    valid_statuses = ["ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {new_status}")

    if new_status == order.status:
        return _decorate_order(order)

    if new_status == "ACCEPTED":
        if order.status != "PENDING":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot accept order in '{order.status}' status.")
        
        # Delivery orders MUST be verified and marked PAID before vendor accepts them
        if order.order_type == "DELIVERY" and order.payment_status != "PAID":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot accept delivery order: payment status is '{order.payment_status}'. Please verify customer UPI payment first."
            )

        # Deduct inventory stock
        product = db.query(Product).filter(Product.id == order.product_id).with_for_update().first()
        if not product or product.quantity < order.quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient product stock to accept this order.")
        product.quantity -= order.quantity
        order.status = "ACCEPTED"

    elif new_status == "OUT_FOR_DELIVERY":
        if order.status != "ACCEPTED":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must be in 'ACCEPTED' status before dispatching out for delivery.")
        if order.order_type != "DELIVERY":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only delivery orders can be set to Out for Delivery.")
        order.status = "OUT_FOR_DELIVERY"

    elif new_status == "DELIVERED":
        if order.order_type == "DELIVERY":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delivery orders require 4-digit PIN verification to mark as Delivered. Please use the /verify-delivery-pin endpoint."
            )
        if order.status != "ACCEPTED":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pickup order must be accepted before marking completed.")
        order.status = "DELIVERED"
        order.completed_at = utc_now()

    elif new_status == "CANCELLED":
        prev_st = order.status
        prev_pm = order.payment_status
        if prev_st in ["ACCEPTED", "OUT_FOR_DELIVERY"]:
            # Restore inventory stock
            product = db.query(Product).filter(Product.id == order.product_id).first()
            if product:
                product.quantity += order.quantity
        order.cancelled_by = "VENDOR"
        order.cancelled_at = utc_now()
        order.previous_status = prev_st
        order.previous_payment_status = prev_pm
        order.cancellation_reason = "Cancelled by merchant"
        order.status = "CANCELLED"

    db.commit()
    db.refresh(order)

    try:
        manager.broadcast_sync({
            "type": "order_status_changed",
            "order_id": str(order.id),
            "shop_id": str(order.shop_id),
            "status": order.status
        })
        if order.product:
            updated_prod = _serialize_product(order.product, order.product.shop)
            manager.broadcast_sync({
                "type": "update_deal",
                "product": updated_prod
            })
    except Exception:
        pass

    return _decorate_order(order)


@router.post("/{order_id}/cancel", response_model=schemas.OrderResponse)
def cancel_order(
    order_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    payload: Optional[schemas.OrderCancelRequest] = None,
):
    """
    Cancels an order with comprehensive audit trail and inventory restoration.
    Callable by the customer (if order is PENDING or ACCEPTED) or the shopkeeper.
    """
    order = db.query(Order).options(
        joinedload(Order.product).joinedload(Product.shop),
        joinedload(Order.customer)
    ).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    is_customer = (order.customer_id == user.id)
    is_shop_owner = (order.shopkeeper_id == user.id)
    is_admin = getattr(user, "role", "") == "ADMIN"

    if not (is_customer or is_shop_owner or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to cancel this order.")

    if order.status in ["DELIVERED", "CANCELLED"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel order already in '{order.status}' status.")

    if is_customer and order.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order cannot be cancelled once accepted or out for delivery. Please contact the merchant directly.")

    prev_st = order.status
    prev_pm = order.payment_status

    # Restore stock if previously deducted
    if prev_st in ["ACCEPTED", "OUT_FOR_DELIVERY"]:
        product = db.query(Product).filter(Product.id == order.product_id).first()
        if product:
            product.quantity += order.quantity

    canceller = "CUSTOMER" if is_customer else ("ADMIN" if is_admin else "VENDOR")
    order.cancelled_by = canceller
    order.cancelled_at = utc_now()
    order.cancellation_reason = (payload.reason if payload else None) or "Cancelled by user"
    order.previous_status = prev_st
    order.previous_payment_status = prev_pm
    order.status = "CANCELLED"

    db.commit()
    db.refresh(order)

    try:
        manager.broadcast_sync({
            "type": "order_status_changed",
            "order_id": str(order.id),
            "shop_id": str(order.shop_id),
            "status": order.status
        })
    except Exception:
        pass

    return _decorate_order(order)
