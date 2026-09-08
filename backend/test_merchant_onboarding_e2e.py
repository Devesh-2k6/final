"""
End-to-End Verification Script for ExpiryGo Merchant Onboarding, Email Verification,
Food Business Classification & Admin Moderation Pipeline.
"""

import sys
import uuid
import requests

API_URL = "http://localhost:8000"


def log(msg: str, status: str = "INFO"):
    colors = {
        "INFO": "\033[94m[INFO]\033[0m",
        "PASS": "\033[92m[PASS]\033[0m",
        "WARN": "\033[93m[WARN]\033[0m",
        "FAIL": "\033[91m[FAIL]\033[0m",
    }
    prefix = colors.get(status, f"[{status}]")
    print(f"{prefix} {msg}")


def run_e2e():
    print("=" * 70)
    print("EXPIRYGO MERCHANT ONBOARDING & SECURITY SYSTEM E2E VERIFICATION")
    print("=" * 70)

    # 1. Health check
    try:
        r = requests.get(f"{API_URL}/health")
        assert r.status_code == 200, f"Health check failed: {r.text}"
        log("Backend API is UP and Healthy on port 8000", "PASS")
    except Exception as e:
        log(f"Backend unreachable: {e}", "FAIL")
        sys.exit(1)

    # 2. Login as Platform Administrator
    admin_login = requests.post(
        f"{API_URL}/auth/login",
        json={"email": "admin@test.com", "password": "password123"},
    )
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    log("Admin login succeeded with role ADMIN (admin@test.com)", "PASS")

    # 3. Check Admin Stats
    stats_res = requests.get(f"{API_URL}/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200, f"Admin stats failed: {stats_res.text}"
    stats = stats_res.json()
    log(f"Admin Stats: {stats['total_users']} users, {stats['active_shops']} active shops, {stats['pending_shops']} pending shops", "PASS")

    # 4. Check Pending Moderation Queue
    pending_res = requests.get(f"{API_URL}/admin/shops/pending", headers=admin_headers)
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    log(f"Admin Moderation Queue returned {len(pending_list)} pending shop(s)", "PASS")

    # 5. Test Non-Admin RBAC Security Lock
    customer_login = requests.post(
        f"{API_URL}/auth/login",
        json={"email": "customer@test.com", "password": "password123"},
    )
    assert customer_login.status_code == 200
    cust_token = customer_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    forbidden_res = requests.get(f"{API_URL}/admin/shops/pending", headers=cust_headers)
    assert forbidden_res.status_code == 403, f"Expected 403 for customer, got {forbidden_res.status_code}"
    log("Non-admin customer strictly blocked from /admin endpoints (403 Forbidden)", "PASS")

    # 6. Test Merchant Registration Flow
    uniq = uuid.uuid4().hex[:6]
    test_merchant_email = f"baker_{uniq}@test.com"
    reg_res = requests.post(
        f"{API_URL}/auth/register",
        json={
            "email": test_merchant_email,
            "password": "password123",
            "name": f"Master Baker {uniq.upper()}",
            "is_shop_owner": True,
        },
    )
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    merchant_user = reg_res.json()["user"]
    merchant_token = reg_res.json()["access_token"]
    merchant_headers = {"Authorization": f"Bearer {merchant_token}"}

    assert merchant_user["role"] == "VENDOR"
    assert merchant_user["email_verified"] is False
    log(f"Merchant registered: role=VENDOR, email_verified=False ({test_merchant_email})", "PASS")

    # 7. Unverified Merchant Cannot Access /shops/me or create products
    unver_res = requests.get(f"{API_URL}/shops/me", headers=merchant_headers)
    assert unver_res.status_code == 403, f"Expected 403 for unverified email, got {unver_res.status_code}"
    log("Unverified email merchant blocked from accessing merchant hub (403 Forbidden)", "PASS")

    # 8. Unverified Merchant Cannot Create Products
    unver_prod = requests.post(
        f"{API_URL}/products/",
        headers=merchant_headers,
        json={
            "name": "Croissant",
            "original_price": 120.0,
            "quantity": 5,
            "category": "BAKERY",
            "manufacturing_date": "2026-05-01T00:00:00",
            "expiry_date": "2030-05-03T00:00:00",
        },
    )
    assert unver_prod.status_code == 403, f"Expected 403 for product creation, got {unver_prod.status_code}"
    log("Unverified email merchant blocked from creating products (403 Forbidden)", "PASS")

    # 9. Verify Merchant Email (Directly or via token)
    # Using resend verification / DB verification for automated E2E
    from db.session import SessionLocal
    from db.models import User, Shop
    db = SessionLocal()
    u = db.query(User).filter(User.email == test_merchant_email).first()
    u.email_verified = True
    db.commit()
    db.close()
    log(f"Merchant email marked verified for {test_merchant_email}", "PASS")

    # 10. Test Shop Creation with OpenStreetMap Food Business Verification
    # Testing pre-check location verification
    precheck = requests.post(
        f"{API_URL}/shops/verify-location",
        headers=merchant_headers,
        json={
            "name": "Devi Sweets & Bakery",
            "address": "Connaught Place, New Delhi",
            "latitude": 28.6304,
            "longitude": 77.2177,
        },
    )
    assert precheck.status_code == 200
    log(f"Location Pre-check response: verified={precheck.json()['verified']}, message='{precheck.json()['message']}'", "PASS")

    # Create Shop
    create_shop_res = requests.post(
        f"{API_URL}/shops/",
        headers=merchant_headers,
        json={
            "name": f"Artisan Bakery {uniq.upper()}",
            "address": "Connaught Place, New Delhi",
            "latitude": 28.6304,
            "longitude": 77.2177,
            "description": "Authentic fresh bakery surplus.",
        },
    )
    assert create_shop_res.status_code == 201, f"Shop creation failed: {create_shop_res.text}"
    shop_data = create_shop_res.json()
    new_shop_id = shop_data["id"]

    assert shop_data["approval_status"] == "PENDING"
    assert shop_data["is_active"] is False
    assert shop_data["location_verified"] is True
    log(f"Shop created: approval_status=PENDING, is_active=False, location_verified=True (Shop ID: {new_shop_id})", "PASS")

    # 11. Pending Merchant CANNOT Create Products yet
    pending_prod_res = requests.post(
        f"{API_URL}/products/",
        headers=merchant_headers,
        json={
            "name": "Sourdough Loaf",
            "original_price": 100.0,
            "quantity": 5,
            "category": "BAKERY",
            "manufacturing_date": "2026-05-01T00:00:00",
            "expiry_date": "2030-05-03T00:00:00",
        },
    )
    assert pending_prod_res.status_code == 403, f"Expected 403 while pending, got {pending_prod_res.status_code}"
    log("Pending shop strictly locked from creating product deals before admin approval (403 Forbidden)", "PASS")

    # 12. Public deals and shops feed does NOT show unapproved shop
    public_shops = requests.get(f"{API_URL}/shops/").json()
    assert not any(s["id"] == new_shop_id for s in public_shops), "Unapproved shop found in public feed!"
    log("Unapproved shop is NOT visible to public customers in deals feed", "PASS")

    # 13. Admin Reviews & Approves Shop
    approve_res = requests.post(
        f"{API_URL}/admin/shops/{new_shop_id}/approve",
        headers=admin_headers,
        json={"notes": "Physical store location and food category verified."},
    )
    assert approve_res.status_code == 200, f"Approve failed: {approve_res.text}"
    approved_shop = approve_res.json()
    assert approved_shop["approval_status"] == "APPROVED"
    assert approved_shop["is_active"] is True
    assert approved_shop["approved_by"] == "admin@test.com"
    log(f"Admin approved shop '{approved_shop['name']}' -> approval_status=APPROVED, is_active=True", "PASS")

    # 14. Approved Merchant Can Now Create Surplus Deals!
    post_deal_res = requests.post(
        f"{API_URL}/products/",
        headers=merchant_headers,
        json={
            "name": f"Artisan Baguette {uniq.upper()}",
            "original_price": 90.0,
            "discount_price": 45.0,
            "quantity": 8,
            "category": "BAKERY",
            "manufacturing_date": "2026-05-01T00:00:00",
            "expiry_date": "2030-05-03T00:00:00",
            "description": "Crispy golden crust baguette.",
        },
    )
    assert post_deal_res.status_code == 201, f"Product creation failed: {post_deal_res.text}"
    deal_data = post_deal_res.json()
    log(f"Approved merchant posted surplus deal: {deal_data['name']} (Rs. {deal_data['discount_price']})", "PASS")

    # 15. Deal is now visible to customers in public feed!
    public_deals = requests.get(f"{API_URL}/products/").json()
    assert any(p["id"] == deal_data["id"] for p in public_deals), "New deal not found in public feed!"
    log("Surplus deal is now live on marketplace for customers!", "PASS")

    # 16. Admin Shop Suspension & Reactivation Test
    suspend_res = requests.post(
        f"{API_URL}/admin/shops/{new_shop_id}/suspend",
        headers=admin_headers,
        json={"reason": "Temporary policy check"},
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["approval_status"] == "SUSPENDED"
    assert suspend_res.json()["is_active"] is False
    log(f"Admin suspended shop -> approval_status=SUSPENDED, is_active=False", "PASS")

    reactivate_res = requests.post(
        f"{API_URL}/admin/shops/{new_shop_id}/reactivate",
        headers=admin_headers,
    )
    assert reactivate_res.status_code == 200
    assert reactivate_res.json()["approval_status"] == "APPROVED"
    assert reactivate_res.json()["is_active"] is True
    log(f"Admin reactivated shop -> approval_status=APPROVED, is_active=True", "PASS")

    print("=" * 70)
    print("\033[92mALL 16 PRODUCTION SECURITY & ONBOARDING INVARIANTS VERIFIED SUCCESSFULLY!\033[0m")
    print("=" * 70)


if __name__ == "__main__":
    run_e2e()
