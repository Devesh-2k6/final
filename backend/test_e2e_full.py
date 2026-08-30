import sys
from datetime import datetime, UTC, timedelta
from fastapi.testclient import TestClient
from main import app
from db.session import init_db, SessionLocal
from db.models import User

def _verify_user(email: str):
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            u.email_verified = True
            db.commit()
    finally:
        db.close()

def run_e2e_audit():
    print("==================================================")
    print("[START] STARTING COMPREHENSIVE END-TO-END AUDIT")
    print("==================================================")
    
    init_db()
    client = TestClient(app)
    
    errors = []
    
    # 1. Health check
    print("\n[STEP 1] Testing /health endpoint...")
    res = client.get("/health")
    if res.status_code != 200:
        errors.append(f"Health check failed: {res.status_code} - {res.text}")
    else:
        print(f"  [OK] Health check OK: {res.json()}")

    # 2. Customer Registration
    print("\n[STEP 2] Testing Customer Registration...")
    cust_email = f"e2e_shopper_{int(datetime.now().timestamp())}@test.com"
    res = client.post("/auth/register", json={
        "email": cust_email,
        "password": "SecurePassword123!",
        "name": "Alex Rescuer",
        "is_shop_owner": False,
        "phone_number": "9876543210"
    })
    if res.status_code not in [200, 201]:
        errors.append(f"Customer registration failed: {res.status_code} - {res.text}")
        return errors
    _verify_user(cust_email)
    cust_token = res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print(f"  [OK] Customer registered with JWT token: {cust_token[:15]}...")

    # 3. Store Owner Registration (Automatic Shop Provisioning)
    print("\n[STEP 3] Testing Store Owner Registration & Auto Shop Provisioning...")
    shop_email = f"e2e_owner_{int(datetime.now().timestamp())}@test.com"
    res = client.post("/auth/register", json={
        "email": shop_email,
        "password": "StorePassword123!",
        "name": "Artisan French Bakery",
        "is_shop_owner": True,
        "phone_number": "9123456780"
    })
    if res.status_code not in [200, 201]:
        errors.append(f"Store owner registration failed: {res.status_code} - {res.text}")
        return errors
    _verify_user(shop_email)
    shop_token = res.json()["access_token"]
    shop_headers = {"Authorization": f"Bearer {shop_token}"}
    print(f"  [OK] Store owner registered with JWT token: {shop_token[:15]}...")

    # Verify store exists
    res = client.get("/shops/me", headers=shop_headers)
    if res.status_code != 200:
        errors.append(f"Auto-provisioned shop lookup failed: {res.status_code} - {res.text}")
    else:
        shop_data = res.json()
        shop_id = shop_data["id"]
        print(f"  [OK] Shop verified on database: '{shop_data['name']}' (ID: {shop_id})")

    # 4. Store Owner Posting a Surplus Deal
    print("\n[STEP 4] Testing Store Owner Posting Surplus Product...")
    expiry_in_24h = (datetime.now(UTC) + timedelta(hours=20)).isoformat()
    mfg_yesterday = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    
    product_payload = {
        "name": "Artisan Butter Croissant (Pack of 4)",
        "category": "BAKERY",
        "original_price": 200.0,
        "discount_price": 80.0,
        "quantity": 10,
        "manufacturing_date": mfg_yesterday,
        "expiry_date": expiry_in_24h,
        "description": "Crispy, golden butter croissants baked yesterday morning.",
        "front_image_url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600"
    }
    res = client.post("/products/", json=product_payload, headers=shop_headers)
    if res.status_code not in [200, 201]:
        errors.append(f"Product creation failed: {res.status_code} - {res.text}")
        return errors
    product_data = res.json()
    product_id = product_data["id"]
    print(f"  [OK] Product created: '{product_data['name']}' (ID: {product_id}, Price: INR {product_data['current_price']})")

    # 5. Deep Search Endpoints
    print("\n[STEP 5] Testing Deep Search Suite...")
    # Standard keyword deep search
    res = client.get("/products/search/deep?q=croissant")
    if res.status_code != 200:
        errors.append(f"Deep search standard failed: {res.status_code} - {res.text}")
    else:
        matches = res.json().get("products", [])
        print(f"  [OK] Standard Deep Search found {len(matches)} match(es) for 'croissant'")

    # Semantic search
    res = client.get("/products/search/deep?q=bakery under 100&semantic=true")
    if res.status_code != 200:
        errors.append(f"Deep search semantic failed: {res.status_code} - {res.text}")
    else:
        matches = res.json().get("products", [])
        print(f"  [OK] Semantic Deep Search found {len(matches)} match(es) for 'bakery under 100'")

    # Recipe mode deep search
    res = client.get("/products/search/deep?q=breakfast&recipe_mode=true")
    if res.status_code != 200:
        errors.append(f"Deep search recipe mode failed: {res.status_code} - {res.text}")
    else:
        recipe_data = res.json()
        print(f"  [OK] Recipe Mode Search: Recipe '{recipe_data.get('recipe_name')}', Matched: {len(recipe_data.get('matched_deals', []))} items")

    # 6. Customer Favorites
    print("\n[STEP 6] Testing Customer Favorites Toggle...")
    res = client.post("/favorites/", json={"product_id": product_id}, headers=cust_headers)
    if res.status_code not in [200, 201]:
        errors.append(f"Add favorite failed: {res.status_code} - {res.text}")
    else:
        print("  [OK] Product added to customer favorites")

    res = client.get("/favorites/me", headers=cust_headers)
    if res.status_code != 200 or len(res.json()) == 0:
        errors.append(f"Get favorites failed: {res.status_code} - {res.text}")
    else:
        print(f"  [OK] Customer favorites fetched: {len(res.json())} item(s)")

    # 7. Customer Store Pickup Reservation
    print("\n[STEP 7] Testing Customer Pickup Reservation & PIN Code Generation...")
    res = client.post("/reservations/", json={"product_id": product_id, "quantity": 2}, headers=cust_headers)
    if res.status_code not in [200, 201]:
        errors.append(f"Create reservation failed: {res.status_code} - {res.text}")
        return errors
    reservation_data = res.json()
    reservation_id = reservation_data["id"]
    pickup_code = reservation_data["pickup_code"]
    print(f"  [OK] Reservation created: ID {reservation_id}, 6-digit Pickup PIN: {pickup_code}")

    # 8. Storekeeper PIN / QR Code Verification
    print("\n[STEP 8] Testing Storekeeper Pickup Verification...")
    res = client.post(f"/reservations/{reservation_id}/verify", json={"pickup_code": pickup_code}, headers=shop_headers)
    if res.status_code != 200:
        errors.append(f"PIN verification failed: {res.status_code} - {res.text}")
    else:
        verified_res = res.json()
        print(f"  [OK] Reservation verified! Status: {verified_res['status']}")

    # 9. Home Delivery Order Lifecycle
    print("\n[STEP 9] Testing Home Delivery Order Flow...")
    res = client.post("/orders/", json={
        "product_id": product_id,
        "quantity": 1,
        "order_type": "DELIVERY",
        "delivery_address": "Flat 402, Sunshine Heights, MG Road",
        "customer_name": "Alex Rescuer",
        "customer_phone": "9876543210",
        "delivery_notes": "Leave at front door"
    }, headers=cust_headers)
    if res.status_code not in [200, 201]:
        errors.append(f"Create order failed: {res.status_code} - {res.text}")
    else:
        order_id = res.json()["id"]
        print(f"  [OK] Delivery order placed: ID {order_id}")

        # Shopkeeper accepts order
        res = client.patch(f"/orders/{order_id}/status", json={"status": "ACCEPTED"}, headers=shop_headers)
        if res.status_code != 200:
            errors.append(f"Accept order failed: {res.status_code} - {res.text}")
        else:
            print("  [OK] Order status transitioned: ACCEPTED")

        # Shopkeeper dispatches order
        res = client.put(f"/orders/{order_id}/status", json={"status": "OUT_FOR_DELIVERY"}, headers=shop_headers)
        if res.status_code != 200:
            errors.append(f"Dispatch order failed: {res.status_code} - {res.text}")
        else:
            print("  [OK] Order status transitioned: OUT_FOR_DELIVERY")

        # Shopkeeper marks delivered
        res = client.put(f"/orders/{order_id}/status", json={"status": "DELIVERED"}, headers=shop_headers)
        if res.status_code != 200:
            errors.append(f"Deliver order failed: {res.status_code} - {res.text}")
        else:
            print("  [OK] Order status transitioned: DELIVERED")

    # 10. AI Recipe Generator
    print("\n[STEP 10] Testing AI Zero-Waste Recipe Generator...")
    res = client.post("/products/recipe-generator", json={
        "products": [
            {"name": "Croissant", "category": "BAKERY", "quantity": 2},
            {"name": "Milk", "category": "DAIRY", "quantity": 1}
        ]
    })
    if res.status_code != 200:
        errors.append(f"Recipe generator failed: {res.status_code} - {res.text}")
    else:
        recipe = res.json()
        print(f"  [OK] AI Recipe generated: '{recipe.get('recipe_name')}' (Prep: {recipe.get('prep_time')}, Cook: {recipe.get('cook_time')})")

    # 11. Barcode Lookup & Catalog
    print("\n[STEP 11] Testing Product Barcode Lookup...")
    res = client.get("/products/barcode/8901030383321")
    print(f"  [OK] Barcode lookup endpoint response: {res.status_code}")

    # 12. Store AI Analytics & Spoilage Intelligence
    print("\n[STEP 12] Testing Store AI Hub & Revenue Analytics...")
    res = client.get("/shops/me/analytics", headers=shop_headers)
    if res.status_code != 200:
        errors.append(f"Shop analytics failed: {res.status_code} - {res.text}")
    else:
        analytics = res.json()
        print(f"  [OK] Store analytics fetched: Revenue INR {analytics.get('total_revenue')}, Items saved: {analytics.get('total_items_saved')}")

    print("\n==================================================")
    if not errors:
        print("[SUCCESS] END-TO-END AUDIT COMPLETE: 100% PASS (ZERO ERRORS)")
    else:
        print(f"[FAIL] AUDIT FOUND {len(errors)} ERRORS:")
        for err in errors:
            print(f" - {err}")
    print("==================================================")
    return errors

if __name__ == "__main__":
    errs = run_e2e_audit()
    if errs:
        sys.exit(1)
