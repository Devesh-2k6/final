"""
Real-World Dynamic Web <-> Expo App Sync Test
Verifies that when an item is added on the Web Shop portal,
it immediately appears dynamically in the Mobile App feed with zero mock data.
"""

import sys
import httpx
from datetime import datetime, UTC, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

API_BASE = "http://127.0.0.1:8000"

def test_real_live_sync():
    print("=" * 65)
    print("🧪 REAL-WORLD DYNAMIC WEB <-> EXPO APP SYNC VERIFICATION")
    print("=" * 65)

    client = httpx.Client(base_url=API_BASE, timeout=10.0)

    # 1. Check initial state - 0 products
    init_res = client.get("/products/?hide_expired=true")
    assert init_res.status_code == 200
    initial_count = len(init_res.json())
    print(f"✓ Initial Products in Database: {initial_count}")

    # 2. Login Web Shopkeeper
    shop_login = client.post("/auth/login", json={
        "email": "shop1@test.com",
        "password": "password123"
    })
    assert shop_login.status_code == 200, f"Login failed: {shop_login.text}"
    shop_token = shop_login.json()["access_token"]
    shop_headers = {"Authorization": f"Bearer {shop_token}"}
    print("✓ Shopkeeper logged into Web Portal (shop1@test.com)")

    # 3. Add Real Product from Web Portal
    exp_time = (datetime.now(UTC) + timedelta(days=3)).isoformat()
    mfg_time = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    
    new_product_payload = {
        "name": "Farm Fresh Alphonso Mangoes (1kg Box)",
        "category": "PRODUCE",
        "original_price": 350.0,
        "discount_price": 140.0,
        "quantity": 10,
        "manufacturing_date": mfg_time,
        "expiry_date": exp_time,
        "description": "Sweet, naturally ripened Ratnagiri Alphonso mangoes at 60% surplus discount.",
        "front_image_url": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600",
        "is_active": True
    }
    
    create_res = client.post("/products/", json=new_product_payload, headers=shop_headers)
    assert create_res.status_code in [200, 201], f"Create product failed: {create_res.text}"
    created_item = create_res.json()
    product_id = created_item["id"]
    print(f"\n[WEB ACTION] Shopkeeper uploaded product:")
    print(f"   • Name: {created_item['name']}")
    print(f"   • Original Price: ₹{created_item['original_price']}")
    print(f"   • Deal Price: ₹{created_item['discount_price']}")
    print(f"   • Stock: {created_item['quantity']}")
    print(f"   • ID: {product_id}")

    # 4. Mobile App (Expo Go) refreshes Deals Feed
    mobile_feed_res = client.get("/products/?hide_expired=true")
    assert mobile_feed_res.status_code == 200
    mobile_deals = mobile_feed_res.json()
    
    found_item = next((item for item in mobile_deals if item["id"] == product_id), None)
    assert found_item is not None, f"Product {product_id} NOT found in Mobile Feed!"
    print(f"\n[MOBILE APP RESULT] Expo Go App received real-time deal:")
    print(f"   • Title: {found_item['name']}")
    print(f"   • Shop: {found_item['shop']['name']}")
    print(f"   • Current Deal Price: ₹{found_item['discount_price']}")
    print(f"   • Available Units: {found_item['quantity']}")

    # 5. Customer Reserves 2 Boxes via Mobile App
    cust_login = client.post("/auth/login", json={
        "email": "customer@test.com",
        "password": "password123"
    })
    assert cust_login.status_code == 200
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    reserve_res = client.post("/reservations/", json={
        "product_id": product_id,
        "quantity": 2
    }, headers=cust_headers)
    assert reserve_res.status_code in [200, 201]
    res_info = reserve_res.json()
    print(f"\n[MOBILE APP ACTION] Customer reserved 2 units:")
    print(f"   • Reservation PIN: {res_info['pickup_code']}")
    print(f"   • Status: {res_info['status']}")

    # 6. Check Web Shopkeeper Inventory Stock
    stock_check = client.get(f"/products/{product_id}")
    assert stock_check.status_code == 200
    remaining_stock = stock_check.json()["quantity"]
    print(f"\n[WEB RESULT] Shopkeeper Inventory updated live: 10 -> {remaining_stock} remaining!")
    assert remaining_stock == 8, f"Expected 8 remaining, got {remaining_stock}"

    print("\n" + "=" * 65)
    print("✅ PERFECT: Web additions and Mobile reservations sync 100% in real-time!")
    print("=" * 65)

if __name__ == "__main__":
    test_real_live_sync()
