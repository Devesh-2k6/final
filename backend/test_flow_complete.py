import requests as _orig_requests
import json
from datetime import datetime, timedelta
import random
import string
import sys

BASE_URL = "http://127.0.0.1:8000"

class SmartClient:
    def __init__(self):
        self.use_live = False
        try:
            r = _orig_requests.get(f"{BASE_URL}/health", timeout=0.5)
            if r.status_code == 200:
                self.use_live = True
        except Exception:
            pass
        if not self.use_live:
            from fastapi.testclient import TestClient
            from fastapi_cache import FastAPICache
            from fastapi_cache.backends.inmemory import InMemoryBackend
            from main import app
            from db.session import init_db
            init_db()
            FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
            self._client = TestClient(app)

    def _format_url(self, url: str) -> str:
        if not self.use_live:
            return url.replace(BASE_URL, "")
        return url

    def get(self, url, **kwargs):
        if self.use_live:
            return _orig_requests.get(url, **kwargs)
        return self._client.get(self._format_url(url), **kwargs)

    def post(self, url, **kwargs):
        if self.use_live:
            return _orig_requests.post(url, **kwargs)
        return self._client.post(self._format_url(url), **kwargs)

    def put(self, url, **kwargs):
        if self.use_live:
            return _orig_requests.put(url, **kwargs)
        return self._client.put(self._format_url(url), **kwargs)

    def patch(self, url, **kwargs):
        if self.use_live:
            return _orig_requests.patch(url, **kwargs)
        return self._client.patch(self._format_url(url), **kwargs)

    def delete(self, url, **kwargs):
        if self.use_live:
            return _orig_requests.delete(url, **kwargs)
        return self._client.delete(self._format_url(url), **kwargs)

requests = SmartClient()

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def run_complete_testing():
    print("=" * 70)
    print("[TEST] STARTING EXPIRYGO FINAL COMPREHENSIVE AUTOMATED TESTING")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. Customer Signup/Login Flow
    # -------------------------------------------------------------
    cust_email = f"customer_{generate_random_string()}@test.com"
    cust_password = "password123"
    cust_name = f"Customer {generate_random_string(4).upper()}"

    print("\n[Flow 1] Customer Signup & Login")
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": cust_email,
        "password": cust_password,
        "name": cust_name,
        "is_shop_owner": False
    })
    assert reg_res.status_code in [200, 201], f"Customer registration failed: {reg_res.text}"
    cust_token = reg_res.json()["access_token"]
    cust_id = reg_res.json()["user"]["id"]
    print(f"  [OK] Customer registered successfully. ID: {cust_id}")

    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": cust_email,
        "password": cust_password
    })
    assert login_res.status_code == 200, f"Customer login failed: {login_res.text}"
    print("  [OK] Customer logged in successfully via JWT.")

    # -------------------------------------------------------------
    # 2. Shopkeeper Signup/Login Flow
    # -------------------------------------------------------------
    shop_email = f"shopkeeper_{generate_random_string()}@test.com"
    shop_password = "password123"
    shop_name = f"Shopkeeper {generate_random_string(4).upper()}"

    print("\n[Flow 2] Shopkeeper Signup & Login")
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": shop_email,
        "password": shop_password,
        "name": shop_name,
        "is_shop_owner": True
    })
    assert reg_res.status_code in [200, 201], f"Shopkeeper registration failed: {reg_res.text}"
    shop_token = reg_res.json()["access_token"]
    shop_owner_id = reg_res.json()["user"]["id"]
    print(f"  [OK] Shopkeeper registered successfully. ID: {shop_owner_id}")

    # -------------------------------------------------------------
    # 3. Shop Setup Flow
    # -------------------------------------------------------------
    print("\n[Flow 3] Shop setup & coordinates configuration")
    headers = {"Authorization": f"Bearer {shop_token}"}
    shop_setup_res = requests.post(f"{BASE_URL}/shops/", headers=headers, json={
        "name": "Fresh Organic Supermarket",
        "address": "742 Evergreen Terrace, Sector 4",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "description": "Top-tier premium food products and fresh surplus deals."
    })
    assert shop_setup_res.status_code in [200, 201], f"Shop setup failed: {shop_setup_res.text}"
    shop_id = shop_setup_res.json()["id"]
    print(f"  [OK] Shop created. ID: {shop_id}, Name: {shop_setup_res.json()['name']}")

    # -------------------------------------------------------------
    # 4. Smart Discount & Validation Flow: Add Product
    # -------------------------------------------------------------
    print("\n[Flow 4] Add Product with Date Validations & Smart Discount Check")
    
    # 4.a Expiry date validation: Expiry cannot be before manufacture date
    invalid_mfg = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT00:00:00")
    invalid_exp = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%dT23:59:59")
    print("  - Testing validation: Expiry date before manufacture date...")
    prod_invalid_res = requests.post(f"{BASE_URL}/products/", headers=headers, json={
        "name": "Organic Tomatoes",
        "category": "PRODUCE",
        "original_price": 100.0,
        "quantity": 10,
        "manufacturing_date": invalid_mfg,
        "expiry_date": invalid_exp,
        "front_image_url": "https://via.placeholder.com/300x300?text=Tomatoes",
        "expiry_image_url": "https://via.placeholder.com/300x300?text=Tomatoes_Expiry"
    })
    assert prod_invalid_res.status_code == 422, f"Expected 422 validation error, got {prod_invalid_res.status_code}"
    print("  [OK] Validation passed: Rejected product with invalid dates.")

    # 4.b Negative original price validation
    print("  - Testing validation: Negative original price...")
    prod_neg_price_res = requests.post(f"{BASE_URL}/products/", headers=headers, json={
        "name": "Organic Tomatoes",
        "category": "PRODUCE",
        "original_price": -50.0,
        "quantity": 10,
        "manufacturing_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00"),
        "expiry_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT23:59:59"),
        "front_image_url": "https://via.placeholder.com/300x300?text=Tomatoes",
        "expiry_image_url": "https://via.placeholder.com/300x300?text=Tomatoes_Expiry"
    })
    assert prod_neg_price_res.status_code == 422, f"Expected 422 validation error, got {prod_neg_price_res.status_code}"
    print("  [OK] Validation passed: Rejected product with negative price.")

    # 4.c Negative stock quantity validation
    print("  - Testing validation: Negative quantity stock...")
    prod_neg_qty_res = requests.post(f"{BASE_URL}/products/", headers=headers, json={
        "name": "Organic Tomatoes",
        "category": "PRODUCE",
        "original_price": 100.0,
        "quantity": -5,
        "manufacturing_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00"),
        "expiry_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT23:59:59"),
        "front_image_url": "https://via.placeholder.com/300x300?text=Tomatoes",
        "expiry_image_url": "https://via.placeholder.com/300x300?text=Tomatoes_Expiry"
    })
    assert prod_neg_qty_res.status_code == 422, f"Expected 422 validation error, got {prod_neg_qty_res.status_code}"
    print("  [OK] Validation passed: Rejected product with negative stock.")

    # 4.d Add valid product with 2 days left (should receive exactly 70% off)
    mfg_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%dT00:00:00")
    exp_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT23:59:59")
    print("  - Adding a valid product with 2 days left (expect 70% discount)...")
    prod_valid_res = requests.post(f"{BASE_URL}/products/", headers=headers, json={
        "name": "Supermarket Fresh Strawberries",
        "category": "PRODUCE",
        "original_price": 200.0,
        "quantity": 10,
        "manufacturing_date": mfg_date,
        "expiry_date": exp_date,
        "front_image_url": "https://via.placeholder.com/300x300?text=Strawberries",
        "expiry_image_url": "https://via.placeholder.com/300x300?text=Expiry_Strawberries",
        "description": "Juicy fresh strawberries, rich source of vitamins, near expiry."
    })
    assert prod_valid_res.status_code in [200, 201], f"Failed to upload product: {prod_valid_res.text}"
    prod_data = prod_valid_res.json()
    prod_id = prod_data["id"]
    print(f"  [OK] Product added successfully. ID: {prod_id}")
    print(f"  [OK] Smart Auto-Discount Verified: MRP: 200.0, Discounted Price: {prod_data['discount_price']} (70% Off!)")
    assert prod_data["discount_price"] == 60.0, f"Expected 60.0 discount price, got {prod_data['discount_price']}"

    # -------------------------------------------------------------
    # 5. Product Editing & Active Status Toggle Flow
    # -------------------------------------------------------------
    print("\n[Flow 5] Product Edit & Activation Toggle")
    edit_res = requests.put(f"{BASE_URL}/products/{prod_id}", headers=headers, json={
        "name": "Supermarket Fresh Strawberries (Premium Pack)",
        "category": "PRODUCE",
        "original_price": 250.0, # changed from 200.0 to 250.0 -> 70% of 250 = 75.0
        "quantity": 8,           # changed from 10 to 8
        "manufacturing_date": mfg_date,
        "expiry_date": exp_date,
        "front_image_url": "https://via.placeholder.com/300x300?text=Strawberries_Premium",
        "expiry_image_url": "https://via.placeholder.com/300x300?text=Expiry_Strawberries_Premium",
        "description": "Extra rich and premium selection strawberries near expiry.",
        "is_active": False      # deactivate product deal
    })
    assert edit_res.status_code == 200, f"Failed to edit product: {edit_res.text}"
    edit_data = edit_res.json()
    print(f"  [OK] Product Edited successfully: {edit_data['name']}")
    print(f"  [OK] Updated Quantity: {edit_data['quantity']} (expected 8)")
    print(f"  [OK] Updated MRP: {edit_data['original_price']} (expected 250.0)")
    print(f"  [OK] Updated Discount Price: {edit_data['discount_price']} (70% off of 250 is 75.0)")
    print(f"  [OK] Active Status Toggle: {edit_data['is_active']} (expected False)")
    assert edit_data["quantity"] == 8
    assert edit_data["discount_price"] == 75.0
    assert edit_data["is_active"] == False

    # Toggle Active Status Back to True so customers can see it
    edit_res_2 = requests.put(f"{BASE_URL}/products/{prod_id}", headers=headers, json={
        "name": "Supermarket Fresh Strawberries (Premium Pack)",
        "category": "PRODUCE",
        "original_price": 250.0,
        "quantity": 8,
        "manufacturing_date": mfg_date,
        "expiry_date": exp_date,
        "front_image_url": "https://via.placeholder.com/300x300?text=Strawberries_Premium",
        "expiry_image_url": "https://via.placeholder.com/300x300?text=Expiry_Strawberries_Premium",
        "description": "Extra rich and premium selection strawberries near expiry.",
        "is_active": True       # reactivate product deal
    })
    assert edit_res_2.status_code == 200
    print("  [OK] Product Reactivated successfully.")

    # -------------------------------------------------------------
    # 6. Customer Deals discovery & Display Flow
    # -------------------------------------------------------------
    print("\n[Flow 6] Customer deals page check & display details")
    deals_res = requests.get(f"{BASE_URL}/products/")
    assert deals_res.status_code == 200
    all_deals = deals_res.json()
    matching_deal = next((d for d in all_deals if d["id"] == prod_id), None)
    assert matching_deal is not None, "Product deal is not showing up in customer feeds"
    print(f"  [OK] Deal '{matching_deal['name']}' discovered on customer Deals Page successfully.")
    print(f"  [OK] Shop owner details linked accurately: Shop: '{matching_deal['shop']['name']}', Address: '{matching_deal['shop']['address']}'")

    # -------------------------------------------------------------
    # 7. Customer Pickup Order Flow
    # -------------------------------------------------------------
    print("\n[Flow 7] Customer Store Pickup Order creation")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    pickup_res = requests.post(f"{BASE_URL}/orders/", headers=cust_headers, json={
        "product_id": prod_id,
        "order_type": "PICKUP",
        "quantity": 2
    })
    assert pickup_res.status_code in [200, 201], f"Pickup order failed: {pickup_res.text}"
    pickup_order = pickup_res.json()
    pickup_order_id = pickup_order["id"]
    print(f"  [OK] Store Pickup Order placed successfully! ID: {pickup_order_id}")
    print(f"  [OK] Verification details: Quantity requested: 2, Total Paid: RS {pickup_order['total_price']}, Status: {pickup_order['status']}")
    assert pickup_order["order_type"] == "PICKUP"
    assert pickup_order["status"] == "PENDING"

    # -------------------------------------------------------------
    # 8. Customer Delivery Order Flow
    # -------------------------------------------------------------
    print("\n[Flow 8] Customer Delivery Request Order creation")
    delivery_res = requests.post(f"{BASE_URL}/orders/", headers=cust_headers, json={
        "product_id": prod_id,
        "order_type": "DELIVERY",
        "quantity": 1,
        "delivery_fee": 45.0,
        "customer_name": "Jane Smith",
        "customer_phone": "9876543210",
        "delivery_address": "Flat 3A, Olive Heights, Cathedral Rd, Chennai"
    })
    assert delivery_res.status_code in [200, 201], f"Delivery order failed: {delivery_res.text}"
    delivery_order = delivery_res.json()
    delivery_order_id = delivery_order["id"]
    print(f"  [OK] Home Delivery Order placed successfully! ID: {delivery_order_id}")
    print(f"  [OK] Delivery specifics verified: Address: '{delivery_order['delivery_address']}', Delivery Fee: RS {delivery_order['delivery_fee']}")
    assert delivery_order["order_type"] == "DELIVERY"
    assert delivery_order["status"] == "PENDING"

    # -------------------------------------------------------------
    # 9. Shopkeeper Accept/Reject & Stock Reduction Flow
    # -------------------------------------------------------------
    print("\n[Flow 9] Shopkeeper Order Decision, Status update & Stock Deduction")
    
    # Check pre-acceptance stock in DB
    prod_before_res = requests.get(f"{BASE_URL}/products/?shop_id={shop_id}")
    prod_before = next(p for p in prod_before_res.json() if p["id"] == prod_id)
    print(f"  - Pre-Acceptance Product Stock: {prod_before['quantity']} units")
    assert prod_before["quantity"] == 8, "Expected initial quantity to be 8"

    # Accept pickup order (requires status update transition to ACCEPTED)
    accept_res = requests.patch(f"{BASE_URL}/orders/{pickup_order_id}/status", headers=headers, json={
        "status": "ACCEPTED"
    })
    assert accept_res.status_code == 200, f"Failed to accept order: {accept_res.text}"
    accepted_order = accept_res.json()
    print(f"  [OK] Order Status updated successfully to: {accepted_order['status']}")
    
    # Verify stock reduction
    prod_after_res = requests.get(f"{BASE_URL}/products/?shop_id={shop_id}")
    prod_after = next(p for p in prod_after_res.json() if p["id"] == prod_id)
    print(f"  [OK] Post-Acceptance Product Stock: {prod_after['quantity']} units (Stock Reduced by 2!)")
    assert prod_after["quantity"] == 6, f"Expected stock to reduce to 6, got {prod_after['quantity']}"

    # -------------------------------------------------------------
    # 10. Prevent Negative Stock / Validate Order Quantity Flow
    # -------------------------------------------------------------
    print("\n[Flow 10] Prevent Negative Stock Validation")
    # Try to place order with quantity 10 (available stock is currently 6)
    excess_res = requests.post(f"{BASE_URL}/orders/", headers=cust_headers, json={
        "product_id": prod_id,
        "order_type": "PICKUP",
        "quantity": 10
    })
    assert excess_res.status_code == 400, f"Expected 400 bad request, got {excess_res.status_code}"
    print(f"  [OK] Prevention check passed. Backend rejected excess order request: '{excess_res.json()['detail']}'")

    # -------------------------------------------------------------
    # 11. Order Status Updates Timeline Flow
    # -------------------------------------------------------------
    print("\n[Flow 11] Full Order status transition workflow (ACCEPTED -> OUT_FOR_DELIVERY -> DELIVERED)")
    
    # 11.a Update Delivery order status to ACCEPTED
    accept_del_res = requests.patch(f"{BASE_URL}/orders/{delivery_order_id}/status", headers=headers, json={
        "status": "ACCEPTED"
    })
    assert accept_del_res.status_code == 200
    print("  [OK] Delivery Order status transitioned to: ACCEPTED (Stock reduced by 1)")
    
    # Check current stock is 5
    prod_after_del_res = requests.get(f"{BASE_URL}/products/?shop_id={shop_id}")
    prod_after_del = next(p for p in prod_after_del_res.json() if p["id"] == prod_id)
    assert prod_after_del["quantity"] == 5

    # 11.b Transition to OUT_FOR_DELIVERY
    out_res = requests.patch(f"{BASE_URL}/orders/{delivery_order_id}/status", headers=headers, json={
        "status": "OUT_FOR_DELIVERY"
    })
    assert out_res.status_code == 200
    assert out_res.json()["status"] == "OUT_FOR_DELIVERY"
    print("  [OK] Delivery Order status transitioned to: OUT_FOR_DELIVERY")

    # 11.c Transition to DELIVERED
    delivered_res = requests.patch(f"{BASE_URL}/orders/{delivery_order_id}/status", headers=headers, json={
        "status": "DELIVERED"
    })
    assert delivered_res.status_code == 200
    assert delivered_res.json()["status"] == "DELIVERED"
    print("  [OK] Delivery Order status transitioned to: DELIVERED (Completed successfully)")

    # -------------------------------------------------------------
    # 12. Delete Product Flow
    # -------------------------------------------------------------
    print("\n[Flow 12] Product Delete Flow")
    delete_res = requests.delete(f"{BASE_URL}/products/{prod_id}", headers=headers)
    assert delete_res.status_code == 200
    print("  [OK] Product deleted from store successfully.")
    
    # Verify product is removed from list
    after_delete_res = requests.get(f"{BASE_URL}/products/")
    assert not any(d["id"] == prod_id for d in after_delete_res.json()), "Product was not deleted successfully"
    print("  [OK] Verified product removed from deals page.")

    # -------------------------------------------------------------
    # 13. Secure API Protection / Logout Verification
    # -------------------------------------------------------------
    print("\n[Flow 13] Secure Protection & Logout Checks")
    protected_res = requests.get(f"{BASE_URL}/users/me") # No Auth Header
    assert protected_res.status_code == 401
    print("  [OK] Secure protection verified: Request rejected without JWT Token (401 Unauthorized)")

    print("\n" + "=" * 70)
    print("* ALL 13 CORE WEB APPLICATION FLOW TESTS PASSED FLAWLESSLY! *")
    print("=" * 70)

if __name__ == "__main__":
    run_complete_testing()
