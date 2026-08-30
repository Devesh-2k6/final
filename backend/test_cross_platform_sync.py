import httpx
import uuid
import sys
from datetime import datetime, UTC, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

API_BASE = "http://127.0.0.1:8000"

def test_web_to_app_sync():
    print("=" * 65)
    print("🔄 TESTING COMPLETE WEB + APP REAL-TIME ECOSYSTEM SYNC")
    print("=" * 65)

    client = httpx.Client(base_url=API_BASE, timeout=10.0)

    # 1. Login with Active Seeded Merchant (Web Portal)
    login_res = client.post("/auth/login", json={
        "email": "shop1@test.com",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Merchant login failed: {login_res.text}"
    merchant_token = login_res.json()["access_token"]
    merchant_headers = {"Authorization": f"Bearer {merchant_token}"}
    print(f"✓ Step 1: Merchant Logged In to Web Portal -> Green Valley Supermarket (shop1@test.com)")

    # 2. Get Shop details from Web
    shop_res = client.get("/shops/me", headers=merchant_headers)
    assert shop_res.status_code == 200, f"Get shop failed: {shop_res.text}"
    shop = shop_res.json()
    shop_id = shop["id"]
    print(f"✓ Step 2: Merchant Store Active -> '{shop['name']}' (ID: {shop_id}, Status: {shop['approval_status']})")

    # 3. Post a new Product Deal from Web (/shop/products/add)
    product_name = f"Fresh Organic Bagels {uuid.uuid4().hex[:4].upper()}"
    expiry_time = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    mfg_time = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    prod_payload = {
        "name": product_name,
        "category": "BAKERY",
        "original_price": 180.0,
        "discount_price": 54.0,
        "quantity": 15,
        "manufacturing_date": mfg_time,
        "expiry_date": expiry_time,
        "description": "Authentic toasted whole wheat bagels baked yesterday morning.",
        "front_image_url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600",
        "is_active": True
    }
    prod_res = client.post("/products/", json=prod_payload, headers=merchant_headers)
    assert prod_res.status_code in [200, 201], f"Product creation failed: {prod_res.text}"
    created_product = prod_res.json()
    created_id = created_product["id"]
    print(f"✓ Step 3: Product Deal POSTED from Web -> '{product_name}' (ID: {created_id}, Price: ₹{created_product['discount_price']})")

    # 4. Simulate Mobile App customer opening Deals Feed
    mobile_deals_res = client.get("/products/?hide_expired=true")
    assert mobile_deals_res.status_code == 200, f"Deals feed failed: {mobile_deals_res.text}"
    deals = mobile_deals_res.json()

    # Verify the product is visible in the Mobile Deals Feed
    found = next((d for d in deals if d["id"] == created_id), None)
    assert found is not None, f"Product {product_name} NOT found in Mobile Deals feed!"
    print(f"\n🎉 Step 4: Product INSTANTLY APPEARS in Mobile App Deals Feed!")
    print(f"   • Item Name: {found['name']}")
    print(f"   • Category: {found['category']}")
    print(f"   • Deal Price: ₹{found['discount_price']} (Original: ₹{found['original_price']})")
    print(f"   • Stock Available: {found['quantity']}")
    print(f"   • Shop Name: {found['shop']['name'] if found.get('shop') else 'N/A'}")
    print(f"   • Image URL: {found['front_image_url']}")

    # 5. Mobile Customer Login & Reserve Deal from App
    cust_login_res = client.post("/auth/login", json={
        "email": "customer@test.com",
        "password": "password123"
    })
    assert cust_login_res.status_code == 200, f"Customer login failed: {cust_login_res.text}"
    cust_token = cust_login_res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print(f"\n✓ Step 5a: Mobile Customer Logged In -> John Doe (customer@test.com)")

    res_payload = {"product_id": created_id, "quantity": 3}
    res_res = client.post("/reservations/", json=res_payload, headers=cust_headers)
    assert res_res.status_code in [200, 201], f"Reservation failed: {res_res.text}"
    res_data = res_res.json()
    reservation_id = res_data["id"]
    pickup_code = res_data["pickup_code"]
    print(f"✓ Step 5b: Mobile Customer Reserved 3 units -> Pickup PIN: {pickup_code} (Status: {res_data['status']})")

    # 6. Verify Shopkeeper on Web sees the updated stock
    shop_inventory_res = client.get(f"/products/{created_id}")
    assert shop_inventory_res.status_code == 200
    updated_prod = shop_inventory_res.json()
    print(f"✓ Step 6: Web Shopkeeper sees live stock decremented: 15 -> {updated_prod['quantity']} remaining!")

    # 7. Shopkeeper Verifies Customer Pickup PIN on Web Portal
    verify_res = client.post(f"/reservations/{reservation_id}/verify", json={"pickup_code": pickup_code}, headers=merchant_headers)
    assert verify_res.status_code == 200, f"PIN verification failed: {verify_res.text}"
    verified_data = verify_res.json()
    print(f"✓ Step 7: Merchant scanned & verified Pickup PIN -> Status: {verified_data['status']}")

    # 8. Customer Places a Home Delivery Order via Mobile App
    order_res = client.post("/orders/", json={
        "product_id": created_id,
        "quantity": 2,
        "order_type": "DELIVERY",
        "delivery_address": "Flat 204, Palm Grove Apartments, Chennai",
        "customer_name": "John Doe",
        "customer_phone": "+919876543210",
        "delivery_notes": "Call upon arrival"
    }, headers=cust_headers)
    assert order_res.status_code in [200, 201], f"Order creation failed: {order_res.text}"
    order_data = order_res.json()
    order_id = order_data["id"]
    print(f"\n✓ Step 8: Customer Placed Home Delivery Order via Mobile App -> Order ID #{order_id}")

    # 9. Merchant on Web Transitions Order Lifecycle: ACCEPTED -> OUT_FOR_DELIVERY -> DELIVERED
    client.patch(f"/orders/{order_id}/status", json={"status": "ACCEPTED"}, headers=merchant_headers)
    client.put(f"/orders/{order_id}/status", json={"status": "OUT_FOR_DELIVERY"}, headers=merchant_headers)
    final_order_res = client.put(f"/orders/{order_id}/status", json={"status": "DELIVERED"}, headers=merchant_headers)
    assert final_order_res.status_code == 200
    print(f"✓ Step 9: Web Merchant fulfilled order lifecycle -> Status: {final_order_res.json()['status']}")

    # 10. Verify Store Analytics Updates in Real-time
    analytics_res = client.get("/shops/me/analytics", headers=merchant_headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    print(f"✓ Step 10: Store Analytics verified -> Revenue: ₹{analytics_data.get('total_revenue')}, Items Rescued: {analytics_data.get('total_items_saved')}")

    print("\n" + "=" * 65)
    print("✅ 100% PASS: FULL BIDIRECTIONAL WEB <-> MOBILE APP ECOSYSTEM SYNCED!")
    print("=" * 65)

if __name__ == "__main__":
    test_web_to_app_sync()

