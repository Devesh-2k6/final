from datetime import datetime, UTC
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload

import schemas
from auth_service import get_current_user, get_current_shop_owner
from db.models import User, Product, Shop, Reservation, ReservationStatus, PaymentStatus, Notification
from db.session import get_db
from services.email import send_email_notification
from routers.shops import _get_owner_shop
from routers.products import _calculate_dynamic_price, _serialize_product
from websocket_manager import manager

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.post("/", response_model=schemas.ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(
    res_in: schemas.ReservationCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
):
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to make deal reservations."
        )

    # Query product with row-level write lock to prevent race conditions without outer join conflicts
    product = db.query(Product).filter(Product.id == res_in.product_id).with_for_update().first()
    if not product or product.quantity < res_in.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Product not available in requested quantity."
        )
        
    now = datetime.now(UTC).replace(tzinfo=None)
    if product.expiry_date < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product is expired.")

    current_price = _calculate_dynamic_price(product, now)
    
    # Deduct quantity instantly
    product.quantity -= res_in.quantity
    
    reservation = Reservation(
        user_id=user.id,
        shop_id=product.shop_id,
        product_id=product.id,
        quantity=res_in.quantity,
        total_price=current_price * res_in.quantity,
        status=ReservationStatus.PENDING
    )
    
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    # Offload Email Notification to background queue (non-blocking)
    shop = product.shop
    if shop and user.email:
        email_subject = f"✓ Reservation Confirmed: {product.name} at {shop.name}"
        email_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #10b981;">Reservation Confirmed!</h2>
                    <p>Hello {user.name},</p>
                    <p>Thank you for saving food! Your reservation at <strong>{shop.name}</strong> is confirmed.</p>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Reservation Details</h3>
                        <p style="margin: 5px 0;"><strong>Product:</strong> {product.name}</p>
                        <p style="margin: 5px 0;"><strong>Quantity:</strong> {reservation.quantity}</p>
                        <p style="margin: 5px 0;"><strong>Total Price:</strong> ₹{reservation.total_price:.2f}</p>
                        <p style="margin: 5px 0;"><strong>Pickup Code:</strong> <span style="font-family: monospace; font-size: 1.2em; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">{reservation.pickup_code}</span></p>
                        <p style="margin: 5px 0;"><strong>Shop Address:</strong> {shop.address}</p>
                    </div>
                    <p>Please present the <strong>Pickup Code</strong> at the shop to collect your items before they expire.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8em; color: #999;">Thank you for using Meeva to fight food waste!</p>
                </div>
            </body>
        </html>
        """
        email_text = f"Hello {user.name},\n\nYour reservation at {shop.name} is confirmed!\n\nProduct: {product.name}\nQuantity: {reservation.quantity}\nTotal: ₹{reservation.total_price:.2f}\nPickup Code: {reservation.pickup_code}\nAddress: {shop.address}\n\nShow the code at the shop to collect."
        background_tasks.add_task(send_email_notification, user.email, email_subject, email_html, email_text)

    # Broadcast updated deal stock & new reservation to all connected web and mobile clients
    try:
        updated_prod = _serialize_product(product, product.shop)
        manager.broadcast_sync({
            "type": "update_deal",
            "product": updated_prod
        })
        manager.broadcast_sync({
            "type": "new_reservation",
            "reservation_id": str(reservation.id),
            "shop_id": str(reservation.shop_id),
            "product_name": product.name,
            "quantity": reservation.quantity,
            "pickup_code": reservation.pickup_code
        })
    except Exception as e:
        pass

    # Must query and return the reservation with loaded relationships to avoid Pydantic serialization errors
    return db.query(Reservation).options(joinedload(Reservation.product).joinedload(Product.shop)).filter(Reservation.id == reservation.id).first()


@router.get("/me", response_model=list[schemas.ReservationResponse])
def get_my_reservations(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    # Optimized query
    return db.query(Reservation).filter(Reservation.user_id == user.id)\
        .options(joinedload(Reservation.product).joinedload(Product.shop))\
        .order_by(Reservation.created_at.desc()).all()


@router.post("/verify/{pickup_code}")
def verify_reservation_by_code(
    pickup_code: str,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    clean_code = pickup_code.strip()
    if clean_code.upper().startswith("EXPIRYGO:"):
        clean_code = clean_code.split(":", 1)[1].strip()
    clean_code = clean_code.split("/").pop().strip()

    shop = _get_owner_shop(user, db)
    reservation = db.query(Reservation).options(joinedload(Reservation.product)).filter(
        Reservation.shop_id == shop.id,
        Reservation.pickup_code.ilike(clean_code)
    ).first()
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation with this code not found for your shop.")
    if reservation.status != ReservationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation already processed")

    reservation.status = ReservationStatus.COMPLETED
    reservation.completed_at = datetime.now(UTC).replace(tzinfo=None)
    
    customer = db.get(User, reservation.user_id)
    if customer:
        customer.total_items_saved += reservation.quantity
        customer.co2_saved_kg += (0.5 * reservation.quantity)
        original_total = reservation.product.original_price * reservation.quantity
        saved_amount = original_total - reservation.total_price
        if saved_amount > 0:
            customer.total_money_saved += saved_amount

    db.commit()
    db.refresh(reservation)

    try:
        manager.broadcast_sync({
            "type": "reservation_status_changed",
            "reservation_id": str(reservation.id),
            "shop_id": str(shop.id),
            "status": "COMPLETED"
        })
    except Exception:
        pass

    return {"message": "Reservation verified successfully!", "status": reservation.status}


@router.post("/{reservation_id}/verify")
def verify_reservation(
    reservation_id: str,
    payload: schemas.ReservationVerify,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    
    # Optimized query to fetch product details along with reservation
    reservation = db.query(Reservation).options(joinedload(Reservation.product)).filter(Reservation.id == reservation_id).first()
    
    if not reservation or reservation.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
        
    if reservation.status != ReservationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation already processed")
        
    clean_code = payload.pickup_code.strip()
    if clean_code.upper().startswith("EXPIRYGO:"):
        clean_code = clean_code.split(":", 1)[1].strip()
    clean_code = clean_code.split("/").pop().strip()

    if reservation.pickup_code.upper() != clean_code.upper():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid pickup code")
        
    # Mark as completed
    reservation.status = ReservationStatus.COMPLETED
    reservation.completed_at = datetime.now(UTC).replace(tzinfo=None)
    
    # Update Impact Stats
    customer = db.get(User, reservation.user_id)
    if customer:
        # Assuming CO2 saved = 0.5kg per item
        customer.total_items_saved += reservation.quantity
        customer.co2_saved_kg += (0.5 * reservation.quantity)
        
        # Money saved = (original - actual paid)
        original_total = reservation.product.original_price * reservation.quantity
        saved_amount = original_total - reservation.total_price
        if saved_amount > 0:
            customer.total_money_saved += saved_amount
            
    # Send notification to customer
    if customer:
        notif = Notification(
            user_id=customer.id,
            title="Reservation Completed!",
            message=f"You successfully picked up your items from {shop.name}."
        )
        db.add(notif)
    
    # Send email notification to customer
    if customer and customer.email:
        email_subject = f"🎉 Pick Up Completed! Thank you for saving food at {shop.name}"
        email_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #10b981;">Food Saved Successfully!</h2>
                    <p>Hello {customer.name},</p>
                    <p>You have successfully picked up your reservation from <strong>{shop.name}</strong>.</p>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Impact Summary</h3>
                        <p style="margin: 5px 0;"><strong>Saved Item:</strong> {reservation.product.name}</p>
                        <p style="margin: 5px 0;"><strong>Quantity:</strong> {reservation.quantity}</p>
                        <p style="margin: 5px 0;"><strong>CO2 Saved:</strong> {(0.5 * reservation.quantity):.1f} kg</p>
                    </div>
                    <p>Every saved meal counts in our mission to fight food waste and protect the environment.</p>
                    <p>Keep tracking your impact stats on the Meeva dashboard!</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8em; color: #999;">Thank you for being part of the solution!</p>
                </div>
            </body>
        </html>
        """
        email_text = f"Hello {customer.name},\n\nYou successfully picked up your items from {shop.name}.\n\nItem: {reservation.product.name}\nQuantity: {reservation.quantity}\nCO2 Saved: {(0.5 * reservation.quantity):.1f} kg\n\nCheck your dashboard for updated impact stats!"
        send_email_notification(customer.email, email_subject, email_html, email_text)
            
    db.commit()
    db.refresh(reservation)

    try:
        manager.broadcast_sync({
            "type": "reservation_status_changed",
            "reservation_id": str(reservation.id),
            "shop_id": str(shop.id),
            "status": "COMPLETED"
        })
    except Exception:
        pass

    return {"message": "Reservation verified successfully!", "status": reservation.status}


@router.post("/{reservation_id}/checkout")
def checkout_reservation(
    reservation_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    reservation = db.get(Reservation, reservation_id)
    if not reservation or reservation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
        
    if reservation.status != ReservationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation is not pending")
        
    if reservation.payment_status == PaymentStatus.PAID:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already paid")

    # Mock Stripe payment success
    reservation.payment_status = PaymentStatus.PAID
    db.commit()
    return {"message": "Payment successful!", "payment_status": reservation.payment_status}
