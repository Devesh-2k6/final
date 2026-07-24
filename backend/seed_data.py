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
from db.session import SessionLocal
from db.models import User, Shop, Product
from auth_service import hash_password

def seed_database():
    db = SessionLocal()
    
    try:
        # Clear existing data (optional)
        print("[INFO] Clearing old data...")
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
                is_shop_owner=True,
            )
            db.add(owner)
            db.flush()
            
            # Create shop
            shop = Shop(
                name=shop_info["name"],
                owner_id=owner.id,
                address=shop_info["address"],
                latitude=shop_info["latitude"],
                longitude=shop_info["longitude"],
            )
            db.add(shop)
            db.flush()
            shops_list.append((shop, owner))
            print(f"  [OK] {shop_info['name']} (login: {shop_info['email']})")
        
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
                "name": "Bananas (1 dozen)",
                "category": "PRODUCE",
                "original_price": 40.00,
                "quantity": 30,
                "days_left": 1,  # 70% discount
                "mfg_date": -4,
                "image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80",
            },
            {
                "shop_idx": 1,
                "name": "Orange Juice 1L",
                "category": "OTHER",
                "original_price": 60.00,
                "quantity": 8,
                "days_left": 3,  # 50% discount
                "mfg_date": -10,
                "image": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80",
            },
            {
                "shop_idx": 1,
                "name": "Cheese Slice Pack",
                "category": "DAIRY",
                "original_price": 120.00,
                "quantity": 5,
                "days_left": 5,  # 50% discount
                "mfg_date": -15,
                "image": "https://images.unsplash.com/photo-1582208993730-98829d31ac09?w=400&q=80",
            },
            # Shop 3 products
            {
                "shop_idx": 2,
                "name": "Croissants (pack of 4)",
                "category": "BAKERY",
                "original_price": 80.00,
                "quantity": 10,
                "days_left": 1,  # 70% discount
                "mfg_date": -2,
                "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80",
            },
            {
                "shop_idx": 2,
                "name": "Mixed Nuts 500g",
                "category": "PANTRY",
                "original_price": 150.00,
                "quantity": 6,
                "days_left": 8,  # 30% discount
                "mfg_date": -30,
                "image": "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400&q=80",
            },
            {
                "shop_idx": 2,
                "name": "Butter 200g",
                "category": "DAIRY",
                "original_price": 110.00,
                "quantity": 8,
                "days_left": 6,  # 30% discount
                "mfg_date": -20,
                "image": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80",
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
            is_shop_owner=False,
        )
        db.add(customer)
        db.commit()
        print(f"  [OK] Customer created (login: customer@test.com / password123)")
        
        print("\n" + "="*60)
        print("SUCCESS: SAMPLE DATA SEEDED SUCCESSFULLY!")
        print("="*60)
        print("\n[INFO] Sample Logins:")
        print("  Shop Owners:")
        for shop_info in shops_data:
            print(f"    - {shop_info['email']} / password123")
        print("  Customer:")
        print("    - customer@test.com / password123")
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
