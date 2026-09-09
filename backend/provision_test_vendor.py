import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from datetime import datetime, UTC
from db.session import SessionLocal, init_db
from db.models import User, Shop
from auth_service import hash_password

VENDOR_EMAIL = "vendor.test@expirygo.com"
VENDOR_PASSWORD = "Password123!"
VENDOR_NAME = "ExpiryGo Test Merchant"
SHOP_NAME = "Fresh Foods Mart (Test Store)"
UPI_ID = "expirygo.test@okhdfcbank"

def create_single_vendor():
    init_db()
    db = SessionLocal()
    try:
        # Check if already exists
        existing = db.query(User).filter(User.email == VENDOR_EMAIL).first()
        if existing:
            print(f"Vendor account '{VENDOR_EMAIL}' already exists (ID: {existing.id}).")
            return existing

        vendor = User(
            email=VENDOR_EMAIL,
            hashed_password=hash_password(VENDOR_PASSWORD),
            name=VENDOR_NAME,
            role="VENDOR",
            is_shop_owner=True,
            email_verified=True,
            phone_number="+919876543210",
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        db.add(vendor)
        db.flush()

        shop = Shop(
            name=SHOP_NAME,
            owner_id=vendor.id,
            address="Connaught Place, Central Delhi, New Delhi 110001",
            latitude=28.6315,
            longitude=77.2167,
            description="Official testing storefront for Razorpay payment integration, delivery verification, and deal testing.",
            is_active=True,
            location_verified=True,
            location_verified_at=datetime.now(UTC).replace(tzinfo=None),
            location_verification_provider="nominatim",
            location_verification_name=SHOP_NAME,
            location_verification_address="Connaught Place, New Delhi",
            location_verification_distance_meters=0.0,
            location_verification_category="supermarket",
            approval_status="APPROVED",
            approved_at=datetime.now(UTC).replace(tzinfo=None),
            approved_by="devpant2006@gmail.com",
            delivery_enabled=True,
            upi_id=UPI_ID,
            delivery_fee=25.0,
            min_order_amount=50.0,
            photo_url="https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800",
            verification_document_url="https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800",
            verification_document_name="FSSAI_License_Test.pdf"
        )
        db.add(shop)
        db.commit()
        db.refresh(vendor)
        db.refresh(shop)

        print("=" * 70)
        print("✅ SINGLE CLEAN VENDOR TEST ACCOUNT CREATED FOR RAZORPAY INTEGRATION")
        print("=" * 70)
        print(f"  • User ID:       {vendor.id}")
        print(f"  • Email:         {vendor.email}")
        print(f"  • Password:      {VENDOR_PASSWORD}")
        print(f"  • Role:          {vendor.role} (Verified: {vendor.email_verified})")
        print(f"  • Shop ID:       {shop.id}")
        print(f"  • Shop Name:     {shop.name}")
        print(f"  • Status:        {shop.approval_status} (Active: {shop.is_active})")
        print(f"  • UPI ID:        {shop.upi_id}")
        print(f"  • Location:      ({shop.latitude}, {shop.longitude})")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating vendor: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    create_single_vendor()
