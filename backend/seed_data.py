"""
Seed script to populate the database with sample shops and products for demo
Run: python seed_data.py
"""

from dotenv import load_dotenv
load_dotenv()

import sys
from pathlib import Path

# Add backend to path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from datetime import datetime, timedelta
from db.session import SessionLocal, init_db
from db.models import (
    User, Shop, Product, Reservation, Order,
    Notification, Favorite, PantryItem, Review, Follower
)
from auth_service import hash_password

DEMO_PASSWORD = "password123"

# Documented localhost demo logins. Upserts only these emails — never wipes other users.
DEMO_ACCOUNTS = [
    {
        "email": "customer@test.com",
        "name": "John Doe",
        "role": "CUSTOMER",
        "is_shop_owner": False,
    },
    {
        "email": "admin@test.com",
        "name": "Platform Administrator",
        "role": "ADMIN",
        "is_shop_owner": False,
    },
    {
        "email": "shop1@test.com",
        "name": "Rajesh Patel",
        "role": "VENDOR",
        "is_shop_owner": True,
        "shop": {
            "name": "Green Valley Supermarket",
            "address": "123 Anna Salai, Downtown Chennai",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "description": "Demo supermarket for local testing.",
        },
    },
]


def ensure_demo_accounts() -> None:
    """Create the documented demo logins if missing, without deleting existing users."""
    from auth_service import verify_password

    init_db()
    db = SessionLocal()
    try:
        password_hash = None
        now = datetime.utcnow()
        for account in DEMO_ACCOUNTS:
            user = db.query(User).filter(User.email == account["email"]).first()
            if user:
                user.role = account["role"]
                user.is_shop_owner = account["is_shop_owner"]
                user.email_verified = True
                if not verify_password(DEMO_PASSWORD, user.hashed_password):
                    if password_hash is None:
                        password_hash = hash_password(DEMO_PASSWORD)
                    user.hashed_password = password_hash
            else:
                if password_hash is None:
                    password_hash = hash_password(DEMO_PASSWORD)
                user = User(
                    email=account["email"],
                    hashed_password=password_hash,
                    name=account["name"],
                    role=account["role"],
                    is_shop_owner=account["is_shop_owner"],
                    email_verified=True,
                )
                db.add(user)
                db.flush()

            shop_info = account.get("shop")
            if shop_info:
                shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
                if not shop:
                    shop = Shop(
                        name=shop_info["name"],
                        owner_id=user.id,
                        address=shop_info["address"],
                        latitude=shop_info["latitude"],
                        longitude=shop_info["longitude"],
                        description=shop_info.get("description"),
                        is_active=True,
                        location_verified=True,
                        location_verified_at=now,
                        location_verification_provider="nominatim",
                        location_verification_name=shop_info["name"],
                        location_verification_address=shop_info["address"],
                        location_verification_distance_meters=0.0,
                        location_verification_category="supermarket",
                        approval_status="APPROVED",
                        approved_at=now,
                        approved_by="admin@test.com",
                    )
                    db.add(shop)
                else:
                    shop.is_active = True
                    shop.approval_status = "APPROVED"
                    shop.location_verified = True
                    if not shop.approved_at:
                        shop.approved_at = now
        db.commit()
        print("[OK] Demo logins ready: customer@test.com, shop1@test.com, admin@test.com / password123")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to ensure demo accounts: {e}")
        raise
    finally:
        db.close()


def seed_database():
    init_db()
    db = SessionLocal()
    
    try:
        # Clear existing data in foreign-key dependency order
        print("[INFO] Clearing old data...")
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
        
        # Create sample shopkeepers
        print("[INFO] Creating sample shopkeepers...")
        
        shops_data = [
            {
                "name": "Green Valley Supermarket",
                "email": "shop1@test.com",
                "password": "password123",
                "owner_name": "Rajesh Patel",
                "address": "123 Anna Salai, Downtown Chennai",
                "latitude": 13.0827,
                "longitude": 80.2707,
            },
            {
                "name": "Fresh Mart Express",
                "email": "shop2@test.com",
                "password": "password123",
                "owner_name": "Priya Sharma",
                "address": "456 Usman Road, T. Nagar, Chennai",
                "latitude": 13.0406,
                "longitude": 80.2443,
            },
            {
                "name": "Daily Bazaar",
                "email": "shop3@test.com",
                "password": "password123",
                "owner_name": "Amit Singh",
                "address": "789 Nungambakkam High Road, Chennai",
                "latitude": 13.0598,
                "longitude": 80.2206,
            },
        ]
        
        shops_list = []
        for shop_info in shops_data:
            # Create user (shop owner)
            owner = User(
                email=shop_info["email"],
                hashed_password=hash_password(shop_info["password"]),
                name=shop_info["owner_name"],
                role="SHOPKEEPER",
                is_shop_owner=True,
                email_verified=True,
            )
            db.add(owner)
            db.flush()
            
            # Create shop with verified location & approved status for demo accounts
            shop = Shop(
                name=shop_info["name"],
                owner_id=owner.id,
                address=shop_info["address"],
                latitude=shop_info["latitude"],
                longitude=shop_info["longitude"],
                is_active=True,
                location_verified=True,
                location_verified_at=datetime.utcnow(),
                location_verification_provider="nominatim",
                location_verification_name=shop_info["name"],
                location_verification_address=shop_info["address"],
                location_verification_distance_meters=0.0,
                location_verification_category="supermarket",
                approval_status="APPROVED",
                approved_at=datetime.utcnow(),
                approved_by="admin@test.com",
            )
            db.add(shop)
            db.flush()
            shops_list.append((shop, owner))
            print(f"  [OK] {shop_info['name']} (login: {shop_info['email']})")
        
        # Create a pending merchant & shop for Admin review testing
        pending_owner = User(
            email="shop_pending@test.com",
            hashed_password=hash_password("password123"),
            name="Devi Bakery & Sweets",
            role="SHOPKEEPER",
            is_shop_owner=True,
            email_verified=True,
        )
        db.add(pending_owner)
        db.flush()

        pending_shop = Shop(
            name="Devi Sweet Bakery",
            owner_id=pending_owner.id,
            address="15 Gandhi Road, T. Nagar, Chennai",
            latitude=13.0418,
            longitude=80.2337,
            description="Fresh artisan sweets, savory puff pastries, and baked breads.",
            is_active=False,
            location_verified=True,
            location_verified_at=datetime.utcnow(),
            location_verification_provider="nominatim",
            location_verification_name="Devi Bakery & Confectionery",
            location_verification_address="15 Gandhi Road, T. Nagar, Chennai, Tamil Nadu, 600017",
            location_verification_distance_meters=14.2,
            location_verification_category="bakery",
            approval_status="PENDING",
        )
        db.add(pending_shop)
        db.flush()
        print(f"  [OK] Pending Shop created for Admin Moderation Queue: {pending_shop.name} (owner: shop_pending@test.com)")

        db.commit()
        
        # Create sample products with discounts
        print("\n[INFO] Creating sample products with automatic discounts...")
        
        products_data = [
            # Shop 1 products
            {
                "shop_idx": 0,
                "name": "Organic Milk 1L",
                "category": "DAIRY",
                "original_price": 45.00,
                "quantity": 20,
                "days_left": 2,  # 70% discount
                "mfg_date": -7,
                "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
            },
            {
                "shop_idx": 0,
                "name": "Whole Wheat Bread",
                "category": "BAKERY",
                "original_price": 35.00,
                "quantity": 15,
                "days_left": 1,  # 70% discount
                "mfg_date": -3,
                "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
            },
            {
                "shop_idx": 0,
                "name": "Fresh Yogurt 500g",
                "category": "DAIRY",
                "original_price": 50.00,
                "quantity": 12,
                "days_left": 4,  # 50% discount
                "mfg_date": -8,
                "image": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80",
            },
            # Shop 2 products
            {
                "shop_idx": 1,
                "name": "Paneer 200g",
                "category": "DAIRY",
                "original_price": 80.00,
                "quantity": 8,
                "days_left": 1,  # 70% discount
                "mfg_date": -5,
                "image": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80",
            },
            {
                "shop_idx": 1,
                "name": "Tomatoes 1kg",
                "category": "PRODUCE",
                "original_price": 40.00,
                "quantity": 25,
                "days_left": 2,  # 70% discount
                "mfg_date": -4,
                "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80",
            },
            # Shop 3 products
            {
                "shop_idx": 2,
                "name": "Eggs Pack of 6",
                "category": "DAIRY",
                "original_price": 42.00,
                "quantity": 18,
                "days_left": 3,  # 50% discount
                "mfg_date": -10,
                "image": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80",
            },
            {
                "shop_idx": 2,
                "name": "Apples 1kg",
                "category": "PRODUCE",
                "original_price": 120.00,
                "quantity": 10,
                "days_left": 3,  # 50% discount
                "mfg_date": -6,
                "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&q=80",
            },
        ]
        
        def calculate_discount(original_price, days_left):
            """Match backend discount logic"""
            if days_left <= 2:
                return original_price * 0.70  # 70% off
            elif days_left <= 5:
                return original_price * 0.50  # 50% off
            elif days_left <= 10:
                return original_price * 0.30  # 30% off
            else:
                return original_price * 0.10  # 10% off
        
        for prod_info in products_data:
            shop, owner = shops_list[prod_info["shop_idx"]]
            
            # Calculate dates
            manufacturing_date = datetime.now() + timedelta(days=prod_info["mfg_date"])
            expiry_date = datetime.now() + timedelta(days=prod_info["days_left"])
            
            discount_amount = calculate_discount(
                prod_info["original_price"],
                prod_info["days_left"]
            )
            discount_price = prod_info["original_price"] - discount_amount
            
            product = Product(
                shop_id=shop.id,
                name=prod_info["name"],
                category=prod_info["category"],
                original_price=prod_info["original_price"],
                discount_price=discount_price,
                quantity=prod_info["quantity"],
                manufacturing_date=manufacturing_date,
                expiry_date=expiry_date,
                front_image_url=prod_info["image"],
                expiry_image_url="https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&q=80",
                description=f"High quality, fresh {prod_info['name']}. Available in stock for a limited time.",
                is_active=True,
            )
            db.add(product)
            
            discount_pct = round((discount_amount / prod_info["original_price"]) * 100)
            print(f"  [OK] {prod_info['name']} - {shop.name} ({discount_pct}% off, {prod_info['days_left']} days)")
        
        db.commit()
        
        # Create a sample customer
        print("\n[INFO] Creating sample customer...")
        customer = User(
            email="customer@test.com",
            hashed_password=hash_password("password123"),
            name="John Doe",
            role="CUSTOMER",
            is_shop_owner=False,
            email_verified=True,
        )
        db.add(customer)
        db.commit()
        print(f"  [OK] Customer created (login: customer@test.com / password123)")

        # Create platform administrator
        print("\n[INFO] Creating platform administrator...")
        admin_user = User(
            email="admin@test.com",
            hashed_password=hash_password("password123"),
            name="Platform Administrator",
            role="ADMIN",
            is_shop_owner=False,
            email_verified=True,
        )
        db.add(admin_user)
        db.commit()
        print(f"  [OK] Admin created (login: admin@test.com / password123)")
        
        print("\n" + "="*60)
        print("SUCCESS: SAMPLE DATA SEEDED SUCCESSFULLY!")
        print("="*60)
        print("\n[INFO] Sample Logins:")
        print("  Shop Owners (Active):")
        for shop_info in shops_data:
            print(f"    - {shop_info['email']} / password123")
        print("  Shop Owner (Pending Admin Review):")
        print("    - shop_pending@test.com / password123")
        print("  Customer:")
        print("    - customer@test.com / password123")
        print("  Administrator:")
        print("    - admin@test.com / password123")
        print("\n[OK] You can now test the complete flow!")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
