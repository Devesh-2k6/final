import requests
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:8000"

def test_sync():
    print("=" * 60)
    print("🚀 EXPIRYGO - WEB <-> MOBILE SYNC VERIFICATION")
    print("=" * 60)

    # 1. Login as Shop Owner (Web vendor)
    print("\n[Step 1] Logging in as Web Vendor (shop1@test.com)...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": "shop1@test.com", "password": "password123"})
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.status_code} - {login_res.text}")
        sys.exit(1)
    
    token_data = login_res.json()
    token = token_data.get("access_token")
    print(f"  ✓ Logged in successfully! Vendor: {token_data.get('user', {}).get('name')}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 2. Add product via Web/API
    print("\n[Step 2] Vendor adds a new product on Web...")
    new_product = {
        "name": "Fresh Organic Strawberries 500g",
        "original_price": 180.0,
        "discount_price": 90.0,
        "quantity": 15,
        "manufacturing_date": "2026-08-28T00:00:00",
        "expiry_date": "2026-09-04T00:00:00",
        "category": "PRODUCE",
        "front_image_url": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400",
        "description": "Delicious sweet farm strawberries added from Web vendor dashboard."
    }

    create_res = requests.post(f"{BASE_URL}/products/", headers=headers, json=new_product)
    if create_res.status_code not in (200, 201):
        print(f"Failed to add product: {create_res.status_code} - {create_res.text}")
        sys.exit(1)

    created_data = create_res.json()
    product_id = created_data.get("id")
    print(f"  ✓ Product created successfully on Web!")
    print(f"    - ID: {product_id}")
    print(f"    - Name: {created_data.get('name')}")
    print(f"    - Dynamic Current Price: Rs.{created_data.get('current_price')}")
    print(f"    - Original Price: Rs.{created_data.get('original_price')}")

    # 3. Fetch from Mobile App perspective (Expo Go)
    print("\n[Step 3] Mobile App (Expo Go) fetching live deals feed...")
    mobile_res = requests.get(f"{BASE_URL}/products/")
    if mobile_res.status_code != 200:
        print(f"Mobile fetch failed: {mobile_res.status_code} - {mobile_res.text}")
        sys.exit(1)

    all_products = mobile_res.json()
    print(f"  ✓ Mobile app received {len(all_products)} products from backend.")

    # Check if the product added on Web exists in Mobile feed
    found = next((p for p in all_products if p.get("id") == product_id), None)
    if found:
        print("\n  🎉 SUCCESS: Newly added web product is LIVE in Mobile App feed!")
        print(f"    • Product Name: {found.get('name')}")
        print(f"    • Shop Name:    {found.get('shop', {}).get('name')}")
        print(f"    • Live Price:   Rs.{found.get('current_price')} (Save {int((1 - found.get('current_price', 0)/found.get('original_price', 1)) * 100)}%)")
        print(f"    • Stock:        {found.get('quantity')} units")
        print(f"    • Image:        {found.get('front_image_url')}")
    else:
        print("  ❌ Product NOT found in Mobile feed!")
        sys.exit(1)

    # 4. Clean up test product
    print("\n[Step 4] Cleaning up test product...")
    del_res = requests.delete(f"{BASE_URL}/products/{product_id}", headers=headers)
    if del_res.status_code in (200, 204):
        print("  ✓ Test product cleaned up.")

    print("\n" + "=" * 60)
    print("✅ PERFECT! Web and Mobile App are 100% connected & in sync!")
    print("=" * 60)

if __name__ == "__main__":
    test_sync()
