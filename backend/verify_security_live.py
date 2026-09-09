import os
import sys
import io
import json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_all_security():
    print("=" * 70)
    print("🔒 RUNNING LIVE SECURITY VERIFICATION & PENETRATION ATTEMPTS")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. OTP Verification Rate Limiting & Cooldown
    # -------------------------------------------------------------
    print("\n--- [1] Testing OTP Rate Limiting / Resend Cooldown ---")
    otp_email = "ratelimit_test@example.com"
    r1 = client.post("/auth/send-otp", json={"identifier": otp_email})
    print(f"  Attempt 1 Send OTP: Status={r1.status_code}, Body={r1.json()}")
    
    # Immediate second request to test cooldown
    r2 = client.post("/auth/send-otp", json={"identifier": otp_email})
    print(f"  Attempt 2 Send OTP (immediate): Status={r2.status_code}, Body={r2.json()}")
    assert r2.status_code == 429, f"Expected 429 Too Many Requests, got {r2.status_code}"
    print("  ✓ Cooldown rate limit enforced on OTP dispatch (HTTP 429).")

    # Test brute-forcing incorrect OTP
    print("\n--- [2] Testing OTP Verification with Invalid Code ---")
    bad_otp_res = client.post("/auth/verify-otp", json={"identifier": otp_email, "otp": "000000"})
    print(f"  Verify bad OTP: Status={bad_otp_res.status_code}, Body={bad_otp_res.json()}")
    assert bad_otp_res.status_code == 400

    # -------------------------------------------------------------
    # 3. File Upload Security Verification
    # -------------------------------------------------------------
    print("\n--- [3] Testing File Upload Security Controls ---")
    
    # Bad file extension (.exe)
    exe_file = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00BinaryExeContent")
    r_bad_ext = client.post("/auth/upload", files={"file": ("malware.exe", exe_file, "application/x-msdownload")})
    print(f"  Upload .exe file: Status={r_bad_ext.status_code}, Body={r_bad_ext.json()}")
    assert r_bad_ext.status_code == 400, "Bad extension should be rejected"

    # Oversized file (> 5MB)
    huge_file = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * (6 * 1024 * 1024))
    r_oversized = client.post("/auth/upload", files={"file": ("huge_image.png", huge_file, "image/png")})
    print(f"  Upload >5MB file: Status={r_oversized.status_code}, Body={r_oversized.json()}")
    assert r_oversized.status_code == 400, "Oversized file should be rejected"

    # Fake file signature (.png extension but plain text / php content inside)
    fake_png = io.BytesIO(b"<?php echo 'malicious payload'; ?>")
    r_fake_sig = client.post("/auth/upload", files={"file": ("fake_image.png", fake_png, "image/png")})
    print(f"  Upload fake PNG signature: Status={r_fake_sig.status_code}, Body={r_fake_sig.json()}")
    assert r_fake_sig.status_code == 400, "Fake signature should be rejected"

    # Valid PNG file
    valid_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82")
    r_valid = client.post("/auth/upload", files={"file": ("valid.png", valid_png, "image/png")})
    print(f"  Upload valid PNG file: Status={r_valid.status_code}, Body={r_valid.json()}")
    assert r_valid.status_code == 201, "Valid PNG should be accepted"

    # -------------------------------------------------------------
    # 4. IDOR / Horizontal Privilege Escalation Pen-Testing on 3 Endpoints
    # -------------------------------------------------------------
    print("\n--- [4] Testing IDOR & Cross-Tenant Data Isolation on 3 Endpoints ---")
    
    # Provision User A (Customer A): Register & Verify OTP
    r_ca = client.post("/auth/customer/register", json={"name": "Alice Customer", "email": "alice_idor@test.com", "password": "Password123!"})
    otp_ca = r_ca.json().get("dev_code") or "123456"
    verify_ca = client.post("/auth/verify-otp", json={"identifier": "alice_idor@test.com", "otp": otp_ca})
    token_ca = verify_ca.json()["access_token"]
    headers_ca = {"Authorization": f"Bearer {token_ca}"}
    print("  ✓ Customer A (Alice) registered and verified.")

    # Provision User B (Customer B): Register & Verify OTP
    r_cb = client.post("/auth/customer/register", json={"name": "Bob Customer", "email": "bob_idor@test.com", "password": "Password123!"})
    otp_cb = r_cb.json().get("dev_code") or "123456"
    verify_cb = client.post("/auth/verify-otp", json={"identifier": "bob_idor@test.com", "otp": otp_cb})
    token_cb = verify_cb.json()["access_token"]
    headers_cb = {"Authorization": f"Bearer {token_cb}"}
    print("  ✓ Customer B (Bob) registered and verified.")

    # Provision Vendor A: Register & Verify OTP
    valid_png.seek(0)
    upload_res = client.post("/auth/upload", files={"file": ("doc.png", valid_png, "image/png")}).json()
    doc_url = upload_res["url"]

    r_va = client.post("/auth/vendor/register", json={
        "shop_name": "Vendor A Supermarket", "email": "vendor_a_idor@test.com", "password": "Password123!",
        "phone_number": "+919876543210", "photo_url": doc_url, "document_url": doc_url,
        "upi_id": "vendora@okhdfcbank",
        "address": "123 Anna Salai, Chennai", "latitude": 13.0827, "longitude": 80.2707
    })
    otp_va = r_va.json().get("dev_code") or "123456"
    verify_va = client.post("/auth/verify-otp", json={"identifier": "vendor_a_idor@test.com", "otp": otp_va, "is_shop_owner": True})
    token_va = verify_va.json()["access_token"]
    headers_va = {"Authorization": f"Bearer {token_va}"}
    print("  ✓ Vendor A registered and verified.")

    # Provision Vendor B: Register & Verify OTP
    r_vb = client.post("/auth/vendor/register", json={
        "shop_name": "Vendor B Bakery", "email": "vendor_b_idor@test.com", "password": "Password123!",
        "phone_number": "+919876543211", "photo_url": doc_url, "document_url": doc_url,
        "upi_id": "vendorb@icici",
        "address": "456 Usman Road, Chennai", "latitude": 13.0406, "longitude": 80.2443
    })
    otp_vb = r_vb.json().get("dev_code") or "123456"
    verify_vb = client.post("/auth/verify-otp", json={"identifier": "vendor_b_idor@test.com", "otp": otp_vb, "is_shop_owner": True})
    token_vb = verify_vb.json()["access_token"]
    headers_vb = {"Authorization": f"Bearer {token_vb}"}
    print("  ✓ Vendor B registered and verified.")

    # Admin approves Vendor A and Vendor B
    token_admin = client.post("/auth/login", json={"email": "devpant2006@gmail.com", "password": "Sureshkumar12345@"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    admin_shops = client.get("/admin/shops", headers=headers_admin).json()
    for s in admin_shops:
        client.post(f"/admin/shops/{s['id']}/approve", headers=headers_admin, json={"override_location_check": True, "override_reason": "Audit verification"})
    print("  ✓ Admin approved Vendor A and Vendor B shops.")

    # Vendor A lists product
    prod_res = client.post("/products/", headers=headers_va, json={
        "name": "Organic Milk", "original_price": 50.0, "discount_price": 25.0, "quantity": 10,
        "manufacturing_date": "2026-09-01T00:00:00", "expiry_date": "2026-09-10T00:00:00", "category": "DAIRY"
    })
    prod_id = prod_res.json()["id"]

    # Customer A creates order with Vendor A
    order_res = client.post("/orders/", headers=headers_ca, json={"product_id": prod_id, "quantity": 1, "order_type": "DELIVERY", "delivery_address": "Flat 101, Chennai"})
    alice_order_id = order_res.json()["id"]
    print(f"  ✓ Created Alice's Order ID: {alice_order_id}")

    # Customer A adds private item to Digital Pantry
    pantry_res = client.post("/pantry/", headers=headers_ca, json={"name": "Alice Private Medication", "category": "OTHER", "quantity": "1 bottle", "expiry_date": "2026-12-31T00:00:00"})
    alice_pantry_id = pantry_res.json()["id"]
    print(f"  ✓ Created Alice's Private Pantry Item ID: {alice_pantry_id}")

    # -------------------------------------------------------------------------
    # IDOR ATTEMPT 1: GET /orders/{order_id}
    # Bob (Customer B) attempts to read Alice's (Customer A) Order Receipt
    # -------------------------------------------------------------------------
    print("\n  [IDOR 1] Bob attempts to read Alice's private Order Details (GET /orders/{alice_order_id})...")
    idor_order = client.get(f"/orders/{alice_order_id}", headers=headers_cb)
    print(f"    Result: Status={idor_order.status_code}, Body={idor_order.json()}")
    assert idor_order.status_code == 403, f"IDOR 1 FAILED: Expected 403 Forbidden, got {idor_order.status_code}"
    print("    ✓ IDOR 1 BLOCKED: Bob received HTTP 403 Forbidden.")

    # -------------------------------------------------------------------------
    # IDOR ATTEMPT 2: POST /orders/{order_id}/verify-payment
    # Vendor B attempts to verify payment on Vendor A's order
    # -------------------------------------------------------------------------
    # Alice reports payment first
    client.post(f"/orders/{alice_order_id}/report-payment", headers=headers_ca, json={"upi_transaction_id": "UTR1234567890"})
    print("\n  [IDOR 2] Vendor B attempts to verify payment on Vendor A's order (POST /orders/{alice_order_id}/verify-payment)...")
    idor_pay = client.post(f"/orders/{alice_order_id}/verify-payment", headers=headers_vb, json={})
    print(f"    Result: Status={idor_pay.status_code}, Body={idor_pay.json()}")
    assert idor_pay.status_code == 404, f"IDOR 2 FAILED: Expected 404 Not Found for non-owner shop, got {idor_pay.status_code}"
    print("    ✓ IDOR 2 BLOCKED: Vendor B received HTTP 404 Not Found for order not belonging to their shop.")

    # -------------------------------------------------------------------------
    # IDOR ATTEMPT 3: DELETE /pantry/{pantry_item_id}
    # Bob attempts to delete / tamper with Alice's Digital Pantry Item
    # -------------------------------------------------------------------------
    print("\n  [IDOR 3] Bob attempts to delete Alice's private Digital Pantry Item (DELETE /pantry/{alice_pantry_id})...")
    idor_pantry = client.delete(f"/pantry/{alice_pantry_id}", headers=headers_cb)
    print(f"    Result: Status={idor_pantry.status_code}, Body={idor_pantry.json()}")
    assert idor_pantry.status_code == 404, f"IDOR 3 FAILED: Expected 404 Not Found for cross-user pantry item, got {idor_pantry.status_code}"
    print("    ✓ IDOR 3 BLOCKED: Bob received HTTP 404 Not Found when trying to delete Alice's item.")

    # -------------------------------------------------------------
    # 5. Delivery PIN 5-Attempt Rate Limiting & Lockout
    # -------------------------------------------------------------
    print("\n--- [5] Testing Delivery PIN 5-Attempt Lockout Protection ---")
    # Vendor A verifies payment and updates status to ACCEPTED then OUT_FOR_DELIVERY
    v_verify_res = client.post(f"/orders/{alice_order_id}/verify-payment", headers=headers_va, json={})
    assert v_verify_res.status_code == 200, f"Verify payment failed: {v_verify_res.text}"

    v_accept_res = client.patch(f"/orders/{alice_order_id}/status", headers=headers_va, json={"status": "ACCEPTED"})
    assert v_accept_res.status_code == 200, f"Accept order failed: {v_accept_res.text}"

    v_dispatch_res = client.patch(f"/orders/{alice_order_id}/status", headers=headers_va, json={"status": "OUT_FOR_DELIVERY"})
    assert v_dispatch_res.status_code == 200, f"Dispatch order failed: {v_dispatch_res.text}"
    print("  ✓ Order progressed to OUT_FOR_DELIVERY.")

    # Now order is OUT_FOR_DELIVERY. Test 5 wrong PIN attempts.
    for attempt in range(1, 6):
        r_pin = client.post(f"/orders/{alice_order_id}/verify-delivery-pin", headers=headers_va, json={"pin": "9999"})
        print(f"    Wrong PIN Attempt #{attempt}: Status={r_pin.status_code}, Body={r_pin.json()}")
        if attempt < 5:
            assert r_pin.status_code == 400
        else:
            assert r_pin.status_code == 423, f"Attempt 5 must return HTTP 423 Locked, got {r_pin.status_code}"
            print("    ✓ Delivery PIN is now LOCKED (HTTP 423). Subsequent attempts blocked.")

    # 6th attempt should be blocked with 423 even with correct PIN
    r_locked = client.post(f"/orders/{alice_order_id}/verify-delivery-pin", headers=headers_va, json={"pin": "1234"})
    print(f"    6th Attempt after lockout: Status={r_locked.status_code}, Body={r_locked.json()}")
    assert r_locked.status_code == 423, "Lockout must persist on subsequent calls"
    print("    ✓ Delivery PIN lockout persisted authoritatively.")

    print("\n" + "=" * 70)
    print("✅ ALL LIVE SECURITY PENETRATION & AUTH CHECKS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    test_all_security()
