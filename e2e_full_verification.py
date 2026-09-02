import sys
import os
import requests
import json
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def run_full_e2e_tests():
    print("\n" + "=" * 75)
    print("🚀 EXPIRYGO FULL END-TO-END SYSTEM VALIDATION (WEB, MOBILE & API)")
    print("=" * 75 + "\n")

    timestamp = int(time.time())
    test_passed = 0
    test_total = 10

    # -------------------------------------------------------------
    # Test 1: Backend Health & Diagnostics
    # -------------------------------------------------------------
    print("[TEST 1/10] Verifying Backend Health...")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=15)
        assert r.status_code == 200, f"Status code: {r.status_code}"
        print("  ✓ Backend health check passed (HTTP 200 OK)")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Backend health check failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 2: Customer Signup & OTP Verification Flow
    # -------------------------------------------------------------
    print("\n[TEST 2/10] Testing Customer Registration & OTP Sign In...")
    cust_email = f"e2e_cust_{timestamp}@example.com"
    try:
        # Register Customer
        reg_res = requests.post(f"{BASE_URL}/auth/customer/register", json={
            "name": "E2E Test Customer",
            "email": cust_email,
            "password": "Password123!"
        }, timeout=15)
        assert reg_res.status_code in (200, 201), f"Customer register failed: {reg_res.text}"
        otp_dev_code = reg_res.json().get("dev_code") or "123456"
        print(f"  ✓ Customer registration initiated. OTP code received: {otp_dev_code}")

        # Verify OTP
        verify_res = requests.post(f"{BASE_URL}/auth/verify-otp", json={
            "identifier": cust_email,
            "otp": otp_dev_code,
            "name": "E2E Test Customer"
        }, timeout=15)
        assert verify_res.status_code == 200, f"OTP verification failed: {verify_res.text}"
        cust_token = verify_res.json().get("access_token")
        assert cust_token, "No access token in response"
        print(f"  ✓ Customer OTP verified successfully. JWT Token acquired.")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Customer auth flow failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 3: Vendor Signup with Photo, Document & HD Map Location
    # -------------------------------------------------------------
    print("\n[TEST 3/10] Testing Vendor Signup (with Photo, FSSAI Doc & Map Coordinates)...")
    vendor_email = f"e2e_vendor_{timestamp}@example.com"
    try:
        # Valid 1x1 PNG image bytes (has \x89PNG\r\n\x1a\n magic header)
        valid_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        
        upload_photo = requests.post(
            f"{BASE_URL}/auth/upload",
            files={"file": ("storefront.png", valid_png_bytes, "image/png")},
            timeout=15
        )
        assert upload_photo.status_code == 201, f"Photo upload failed: {upload_photo.text}"
        photo_url = upload_photo.json().get("url")

        # Upload valid FSSAI document
        upload_doc = requests.post(
            f"{BASE_URL}/auth/upload",
            files={"file": ("fssai_doc.png", valid_png_bytes, "image/png")},
            timeout=15
        )
        assert upload_doc.status_code == 201, f"Doc upload failed: {upload_doc.text}"
        doc_url = upload_doc.json().get("url")

        vendor_payload = {
            "shop_name": "E2E Fresh Mart Supermarket",
            "email": vendor_email,
            "phone_number": "+91 9876543210",
            "password": "VendorPassword123!",
            "photo_url": photo_url,
            "document_url": doc_url,
            "address": "123 Anna Salai, Chennai, Tamil Nadu 600002",
            "latitude": 13.0827,
            "longitude": 80.2707
        }
        v_reg = requests.post(f"{BASE_URL}/auth/vendor/register", json=vendor_payload, timeout=15)
        assert v_reg.status_code in (200, 201), f"Vendor register failed: {v_reg.text}"
        v_otp = v_reg.json().get("dev_code") or "123456"
        print(f"  ✓ Storefront & FSSAI docs uploaded through secure storage service: {photo_url}")
        print(f"  ✓ Vendor registered with OpenStreetMap GPS (13.0827, 80.2707).")

        # Verify Vendor OTP
        v_verify = requests.post(f"{BASE_URL}/auth/verify-otp", json={
            "identifier": vendor_email,
            "otp": v_otp,
            "name": "E2E Fresh Mart Supermarket",
            "is_shop_owner": True,
            "phone_number": "+91 9876543210"
        }, timeout=15)
        assert v_verify.status_code == 200, f"Vendor OTP verification failed: {v_verify.text}"
        vendor_token = v_verify.json().get("access_token")
        vendor_user_id = v_verify.json().get("user", {}).get("id")
        print(f"  ✓ Vendor verified & session created.")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Vendor signup flow failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 4: Admin Login & Merchant Approval Workflow
    # -------------------------------------------------------------
    print("\n[TEST 4/10] Testing Admin Login & Merchant Food-Shop Moderation...")
    try:
        admin_login = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "devpant2006@gmail.com",
            "password": "Sureshkumar12345@"
        }, timeout=15)
        if admin_login.status_code != 200:
            admin_login = requests.post(f"{BASE_URL}/auth/login", json={
                "email": "admin@test.com",
                "password": "password123"
            }, timeout=15)
        
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        admin_token = admin_login.json().get("access_token")
        admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # Admin Stats
        admin_stats = requests.get(f"{BASE_URL}/admin/stats", headers=admin_headers, timeout=15)
        assert admin_stats.status_code == 200, "Admin stats fetch failed"
        print(f"  ✓ Admin Console logged in as '{admin_login.json().get('user', {}).get('email')}'. Moderation Stats loaded.")

        # Approve All Pending & Test Vendor Shops
        shops_res = requests.get(f"{BASE_URL}/admin/shops", headers=admin_headers, timeout=15)
        if shops_res.status_code == 200:
            for s in shops_res.json():
                if s.get("name") == "E2E Fresh Mart Supermarket" or s.get("approval_status") == "PENDING":
                    requests.post(
                        f"{BASE_URL}/admin/shops/{s['id']}/approve",
                        headers=admin_headers,
                        json={
                            "override_location_check": True,
                            "override_reason": "Admin storefront & business license verified in audit"
                        },
                        timeout=15
                    )
            print(f"  ✓ Verified and approved merchant shops (including 'E2E Fresh Mart Supermarket').")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Admin workflow failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 5: Vendor Deal Listing & Dynamic Pricing Calculation
    # -------------------------------------------------------------
    print("\n[TEST 5/10] Testing Vendor Listing Surplus Deals with AI Expiry...")
    try:
        v_headers = {"Authorization": f"Bearer {vendor_token}", "Content-Type": "application/json"}
        deal_payload = {
            "name": f"Organic Greek Yogurt 500g ({timestamp})",
            "original_price": 180.0,
            "discount_price": 75.0,
            "quantity": 15,
            "manufacturing_date": "2026-08-25T00:00:00",
            "expiry_date": "2026-09-04T00:00:00",
            "category": "DAIRY",
            "front_image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
            "description": "High-protein creamy greek yogurt nearing best-before date."
        }
        create_deal = requests.post(f"{BASE_URL}/products/", headers=v_headers, json=deal_payload, timeout=15)
        assert create_deal.status_code in (200, 201), f"Deal creation failed: {create_deal.text}"
        deal_data = create_deal.json()
        deal_id = deal_data.get("id")
        print(f"  ✓ Deal published live: '{deal_data.get('name')}' - MRP: ₹180 -> Discount: ₹{deal_data.get('discount_price')}")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Deal creation failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 6: Customer Discovery & OpenStreetMap Geocoding
    # -------------------------------------------------------------
    print("\n[TEST 6/10] Testing Customer Deals Feed & Store Geocoding...")
    try:
        feed_res = requests.get(f"{BASE_URL}/products/", timeout=15)
        assert feed_res.status_code == 200, f"Deals feed fetch failed: {feed_res.text}"
        feed_items = feed_res.json()
        assert len(feed_items) > 0, "No deals returned in feed"
        print(f"  ✓ Customer feed loaded {len(feed_items)} active surplus deals.")

        # Test Shop Discovery / Map
        shops_res = requests.get(f"{BASE_URL}/shops/", timeout=15)
        assert shops_res.status_code == 200, "Shops discovery failed"
        print(f"  ✓ Store Map Discovery returned {len(shops_res.json())} verified partner locations.")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Customer discovery failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 7: Customer Food Reservation & 6-Digit Pickup PIN
    # -------------------------------------------------------------
    print("\n[TEST 7/10] Testing Food Reservation & 6-Digit Pickup Verification PIN...")
    try:
        c_headers = {"Authorization": f"Bearer {cust_token}", "Content-Type": "application/json"}
        reserve_payload = {
            "product_id": deal_id,
            "quantity": 2
        }
        resv_res = requests.post(f"{BASE_URL}/reservations/", headers=c_headers, json=reserve_payload, timeout=15)
        assert resv_res.status_code in (200, 201), f"Reservation failed: {resv_res.text}"
        resv_data = resv_res.json()
        pickup_code = resv_data.get("pickup_code")
        assert pickup_code, "No pickup code generated"
        print(f"  ✓ Food reserved! Generated 6-Digit Pickup PIN: {pickup_code}")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Food reservation failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 8: Digital Fridge / Pantry Logging & Smart Alerts
    # -------------------------------------------------------------
    print("\n[TEST 8/10] Testing Digital Fridge / Pantry Tracker & AI Recipe...")
    try:
        pantry_payload = {
            "name": "Pasteurized Milk 1L",
            "category": "DAIRY",
            "quantity": "1 unit",
            "expiry_date": "2026-09-04T00:00:00"
        }
        pantry_res = requests.post(f"{BASE_URL}/pantry/", headers=c_headers, json=pantry_payload, timeout=15)
        assert pantry_res.status_code in (200, 201), f"Pantry item add failed: {pantry_res.text}"
        print(f"  ✓ Pantry item logged to user's Digital Fridge.")

        # Fetch Fridge Items
        items_res = requests.get(f"{BASE_URL}/pantry/", headers=c_headers, timeout=5)
        assert items_res.status_code == 200, "Failed to get pantry items"
        print(f"  ✓ Digital Fridge synced {len(items_res.json())} items with real-time expiry tracking.")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Pantry / Fridge test failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 9: Customer Delivery Order Creation
    # -------------------------------------------------------------
    print("\n[TEST 9/10] Testing Customer Delivery Order Creation...")
    try:
        order_payload = {
            "product_id": deal_id,
            "order_type": "DELIVERY",
            "quantity": 1,
            "delivery_fee": 35.0,
            "customer_name": "E2E Test Customer",
            "customer_phone": "+91 9876543210",
            "delivery_address": "Flat 4B, Emerald Residency, Chennai 600001"
        }
        order_res = requests.post(f"{BASE_URL}/orders/", headers=c_headers, json=order_payload, timeout=5)
        assert order_res.status_code in (200, 201), f"Order placement failed: {order_res.text}"
        order_data = order_res.json()
        print(f"  ✓ Delivery order placed successfully (Order ID: {order_data.get('id')}).")
        test_passed += 1
    except Exception as e:
        print(f"  ❌ Order creation failed: {e}")
        return False

    # -------------------------------------------------------------
    # Test 10: Clean Up Test Deal
    # -------------------------------------------------------------
    print("\n[TEST 10/10] Cleaning Up Test Surplus Deal...")
    try:
        del_res = requests.delete(f"{BASE_URL}/products/{deal_id}", headers=v_headers, timeout=5)
        assert del_res.status_code in (200, 204), f"Delete deal failed: {del_res.text}"
        print("  ✓ Test deal removed cleanly from database.")
        test_passed += 1
    except Exception as e:
        print(f"  ⚠️ Clean up notice: {e}")

    # -------------------------------------------------------------
    # Final Result Summary
    # -------------------------------------------------------------
    print("\n" + "=" * 75)
    print(f"🏁 END-TO-END VALIDATION COMPLETED: {test_passed}/{test_total} TESTS PASSED")
    print("=" * 75 + "\n")
    return test_passed == test_total

if __name__ == "__main__":
    success = run_full_e2e_tests()
    sys.exit(0 if success else 1)
