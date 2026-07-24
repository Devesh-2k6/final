import requests
import json
from datetime import datetime, timedelta
import random
import string
import sys

BASE_URL = "http://127.0.0.1:8000"

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def run_e2e_verification():
    print("=" * 60)
    # 1. Signup as shopkeeper
    email = f"shopowner_{generate_random_string()}@test.com"
    password = "password123"
    name = f"Shopkeeper {generate_random_string(4).upper()}"
    
    print(f"Step 1: Signing up as shopkeeper: {email}")
    register_res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "name": name,
        "is_shop_owner": True
    })
    
    if register_res.status_code not in [200, 201]:
        print(f"❌ Shopkeeper registration failed: {register_res.text}")
        sys.exit(1)
    
    reg_data = register_res.json()
    token = reg_data["access_token"]
    user_id = reg_data["user"]["id"]
    print(f"✅ Signed up successfully. User ID: {user_id}")
    
    # 2. Login as shopkeeper
    print("Step 2: Logging in as shopkeeper...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if login_res.status_code != 200:
        print(f"❌ Login failed: {login_res.text}")
        sys.exit(1)
    
    print("✅ Logged in successfully.")
    
    # 3. Complete shop setup
    print("Step 3: Completing shop setup...")
    headers = {"Authorization": f"Bearer {token}"}
    shop_name = f"Best Deal Store {generate_random_string(3).upper()}"
    shop_res = requests.post(f"{BASE_URL}/shops/", headers=headers, json={
        "name": shop_name,
        "address": "456 Market Lane, Sector 5",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "description": "Premium surplus and fresh goods store"
    })
    if shop_res.status_code not in [200, 201]:
        print(f"❌ Shop setup failed: {shop_res.text}")
        sys.exit(1)
        
    shop_data = shop_res.json()
    shop_id = shop_data["id"]
    print(f"✅ Shop created. Shop ID: {shop_id}, Name: {shop_name}")
    
    # 4. Add product/deal with details (MFG, Expiry, MRP, Stock, Description)
    print("Step 4: Uploading product deal...")
    mfg_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%dT00:00:00")
    expiry_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT23:59:59") # 2 days left -> High discount (50%)
    
    product_payload = {
        "name": "Fresh Strawberry Pack 250g",
        "category": "PRODUCE",
        "original_price": 200.0,
        "quantity": 10,
        "manufacturing_date": mfg_date,
        "expiry_date": expiry_date,
        "front_image_url": "https://via.placeholder.com/300x300?text=Strawberry+Front",
        "expiry_image_url": "https://via.placeholder.com/300x300?text=Strawberry+Expiry",
        "description": "Sweet organic strawberries, perfectly fresh but near expiry. Great for shakes and salads!",
        "is_surprise_bag": False,
        "auto_discount_enabled": False,
        "auto_discount_min_price": None
    }
    
    product_res = requests.post(f"{BASE_URL}/products/", headers=headers, json=product_payload)
    if product_res.status_code not in [200, 201]:
        print(f"❌ Product upload failed: {product_res.text}")
        sys.exit(1)
        
    prod_data = product_res.json()
    prod_id = prod_data["id"]
    print(f"✅ Product uploaded successfully. Product ID: {prod_id}")
    
    # 5. Verify product saves in backend database and discount is correct
    print("Step 5: Verifying product properties and auto-calculated discount...")
    # 2 days left must map to 70% discount -> discount price should be 60.0
    assert prod_data["original_price"] == 200.0, f"Expected 200.0 original price, got {prod_data['original_price']}"
    assert prod_data["discount_price"] == 60.0, f"Expected 60.0 discount price (70% off), got {prod_data['discount_price']}"
    assert prod_data["description"] == product_payload["description"], "Description mismatch"
    assert prod_data["shop_id"] == shop_id, "Shop ID mismatch"
    print("✅ Backend database checks passed. Discount and description verified.")
    
    # 6. Verify product appears in shopkeeper dashboard
    print("Step 6: Verifying product appears in shopkeeper products list...")
    shop_products_res = requests.get(f"{BASE_URL}/products/?shop_id={shop_id}")
    if shop_products_res.status_code != 200:
        print(f"❌ Failed to fetch shopkeeper products: {shop_products_res.text}")
        sys.exit(1)
        
    shop_prods = shop_products_res.json()
    found_in_dashboard = any(p["id"] == prod_id for p in shop_prods)
    assert found_in_dashboard, "Uploaded product not found in shopkeeper product list"
    
    # Check dashboard analytics
    analytics_res = requests.get(f"{BASE_URL}/shops/me/analytics", headers=headers)
    assert analytics_res.status_code == 200, f"Analytics failed: {analytics_res.text}"
    print("✅ Product is visible on the shopkeeper dashboard and products list.")
    
    # 7. Verify same product appears on customer deals page
    print("Step 7: Verifying product appears on the customer deals page...")
    customer_deals_res = requests.get(f"{BASE_URL}/products/")
    if customer_deals_res.status_code != 200:
        print(f"❌ Failed to fetch customer deals: {customer_deals_res.text}")
        sys.exit(1)
        
    cust_deals = customer_deals_res.json()
    matching_deal = next((p for p in cust_deals if p["id"] == prod_id), None)
    assert matching_deal is not None, "Uploaded product not found in customer deals page"
    assert matching_deal["shop"]["id"] == shop_id, "Customer deal has incorrect shop mapping"
    assert matching_deal["shop"]["name"] == shop_name, "Customer deal has incorrect shop name"
    print(f"✅ Product is visible to customers under shop: '{matching_deal['shop']['name']}'")
    
    print("\n" + "=" * 60)
    print("✨ ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY! ✨")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_verification()
