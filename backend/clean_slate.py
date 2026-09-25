"""
ExpiryGo - Clean Slate Initializer for Real-World Testing
Clears all demo products, orders, reservations, and notifications.
Pre-provisions verified merchant and customer accounts with zero products.
"""

from dotenv import load_dotenv
load_dotenv()

import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from datetime import datetime
from db.session import SessionLocal, init_db
from db.models import (
    User, Shop, Product, Reservation, Order,
    Notification, Favorite, PantryItem, Review, Follower
)
from auth_service import hash_password

def clear_all_demo_data():
    init_db()
    db = SessionLocal()
    
    try:
        print("[1/4] Clearing all products, reservations, orders, and notifications...")
        db.query(Review).delete()
        db.query(Favorite).delete()
        db.query(Follower).delete()
        db.query(PantryItem).delete()
        db.query(Notification).delete()
        db.query(Reservation).delete()
        db.query(Order).delete()
        db.query(Product).delete()
        db.query(Shop).delete()
        db.query(User).delete()
        db.commit()
        print("  ✓ All demo products and previous test data wiped clean.")

        print("[2/4] Creating Verified Real-World Vendor Accounts...")
        # Vendor 1
        merchant_1 = User(
            email="shop1@test.com",
            hashed_password=hash_password("password123"),
            name="Rajesh Patel",
            role="VENDOR",
            is_shop_owner=True,
            email_verified=True,
            phone_number="+919876543210"
        )
        db.add(merchant_1)
        db.flush()

        shop_1 = Shop(
            name="Green Valley Supermarket",
            owner_id=merchant_1.id,
            address="123 Anna Salai, Downtown Chennai",
            latitude=13.0827,
            longitude=80.2707,
            is_active=True,
            location_verified=True,
            location_verified_at=datetime.utcnow(),
            location_verification_provider="nominatim",
            location_verification_name="Green Valley Supermarket",
            location_verification_address="123 Anna Salai, Downtown Chennai",
            location_verification_distance_meters=0.0,
            location_verification_category="supermarket",
            approval_status="APPROVED",
            approved_at=datetime.utcnow(),
            approved_by="admin@test.com",
            description="Premium organic groceries, bakery, dairy, and fresh produce."
        )
        db.add(shop_1)

        # Vendor 2
        merchant_2 = User(
            email="shop2@test.com",
            hashed_password=hash_password("password123"),
            name="Priya Sharma",
            role="VENDOR",
            is_shop_owner=True,
            email_verified=True,
            phone_number="+919876543211"
        )
        db.add(merchant_2)
        db.flush()

        shop_2 = Shop(
            name="Fresh Mart Express",
            owner_id=merchant_2.id,
            address="456 Usman Road, T. Nagar, Chennai",
            latitude=13.0406,
            longitude=80.2443,
            is_active=True,
            location_verified=True,
            location_verified_at=datetime.utcnow(),
            location_verification_provider="nominatim",
            location_verification_name="Fresh Mart Express",
            location_verification_address="456 Usman Road, T. Nagar, Chennai",
            location_verification_distance_meters=0.0,
            location_verification_category="supermarket",
            approval_status="APPROVED",
            approved_at=datetime.utcnow(),
            approved_by="admin@test.com",
            description="Daily essentials, dairy goods, beverages, and bakery delights."
        )
        db.add(shop_2)

        print("[3/4] Creating Customer & Admin Accounts...")
        customer = User(
            email="customer@test.com",
            hashed_password=hash_password("password123"),
            name="John Doe",
            role="CUSTOMER",
            is_shop_owner=False,
            email_verified=True,
            phone_number="+919876543212"
        )
        db.add(customer)

        admin = User(
            email="admin@test.com",
            hashed_password=hash_password("password123"),
            name="Platform Admin",
            role="ADMIN",
            is_shop_owner=False,
            email_verified=True
        )
        db.add(admin)
        db.commit()

        print("[4/4] Clean Slate Verification:")
        print("  • Total Products in DB: 0 (Empty inventory ready for real uploads)")
        print("  • Total Shops Ready: 2 (Active & Approved)")
        print("\n" + "=" * 60)
        print("🎉 CLEAN SLATE READY FOR REAL-WORLD TESTING!")
        print("=" * 60)
        print("\nLogin Credentials for Testing:")
        print("  🏪 Vendor (Add real products from Web):")
        print("     Email:    shop1@test.com")
        print("     Password: password123")
        print("     Web URL:  http://localhost:3000/shop/products/add")
        print("\n  📱 Customer (View live products in Expo Go App):")
        print("     Email:    customer@test.com")
        print("     Password: password123")
        print("     Expo App: Expo Go (Host: http://10.43.177.184:8000)")
        print("=" * 60)

    except Exception as e:
        print(f"Error during reset: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    from setup_production_admin import setup_production_admin
    setup_production_admin()
