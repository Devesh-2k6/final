"""
Comprehensive Delivery, UPI Payment, and Adversarial Security Tests for ExpiryGo
"""

import pytest
from datetime import datetime, timedelta, UTC
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from db.base import Base
from db.models import Product, Shop, User, Order, ProductCategory, Reservation
from db.session import engine, get_db
from services.location_verifier import LocationVerificationResult


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with patch("routers.shops.verify_shop_location") as mock:
        mock.return_value = LocationVerificationResult(
            verified=True,
            is_error=False,
            provider="nominatim",
            matched_business_name="Test Commercial Shop",
            matched_address="123 Market St",
            distance_meters=0.0,
            category="supermarket",
            message="Verified location.",
        )
        yield


@pytest.fixture
def client() -> TestClient:
    from main import app
    with TestClient(app) as test_client:
        yield test_client


def setup_verified_vendor(client: TestClient, email: str, shop_name: str, upi_id: str = "vendor@okhdfcbank"):
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "name": f"{shop_name} Owner",
            "is_shop_owner": True,
        },
    )
    token = reg.json()["access_token"]
    
    # Verify email and approve shop in DB
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == email).first()
        user.email_verified = True
        user.role = "VENDOR"
        db.commit()
    finally:
        db.close()

    # Create/setup shop
    shop_res = client.post(
        "/shops/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": shop_name,
            "address": "123 Market St, Chennai",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "description": "A quality food surplus store",
            "upi_id": upi_id,
            "delivery_enabled": True,
            "delivery_fee": 30.0,
            "min_order_amount": 50.0,
        }
    )
    assert shop_res.status_code == 201, shop_res.text
    shop_id = shop_res.json()["id"]

    # Approve and activate shop
    db = next(get_db())
    try:
        shop = db.get(Shop, shop_id)
        shop.location_verified = True
        shop.approval_status = "APPROVED"
        shop.is_active = True
        db.commit()
    finally:
        db.close()

    return token, shop_id


def setup_customer(client: TestClient, email: str):
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "name": "Test Customer",
            "is_shop_owner": False,
        },
    )
    token = reg.json()["access_token"]
    cust_id = None
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == email).first()
        user.email_verified = True
        user.phone_number = "9876543210"
        cust_id = str(user.id)
        db.commit()
    finally:
        db.close()
    return token, cust_id


def add_product(client: TestClient, vendor_token: str, name: str, price: float, qty: int = 10):
    now = datetime.now(UTC)
    mfg = (now - timedelta(days=1)).isoformat()
    exp = (now + timedelta(days=3)).isoformat()
    res = client.post(
        "/products/",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "name": name,
            "category": "BAKERY",
            "original_price": price * 2,
            "discount_price": price,
            "quantity": qty,
            "manufacturing_date": mfg,
            "expiry_date": exp,
            "description": "Fresh surplus bakery items",
            "front_image_url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a",
            "expiry_image_url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a",
        }
    )
    assert res.status_code in [200, 201], res.text
    return res.json()["id"]


# ==============================================================================
# 1. VENDOR REGISTRATION & UPI ID VALIDATION
# ==============================================================================

def test_vendor_registration_upi_validation(client: TestClient):
    import pydantic
    from schemas import VendorRegisterRequest

    # Invalid UPI format rejected by schema
    with pytest.raises(pydantic.ValidationError):
        VendorRegisterRequest(
            shop_name="Bakery Test",
            email="vendor_bad_upi@test.com",
            phone_number="9876543210",
            upi_id="invalid-upi-handle-without-at",
            photo_url="https://example.com/photo.jpg",
            document_url="https://example.com/doc.pdf",
        )

    # Valid UPI format accepted by schema
    req = VendorRegisterRequest(
        shop_name="Bakery Test",
        email="vendor_good_upi@test.com",
        phone_number="9876543210",
        upi_id="freshbakery@okhdfcbank",
        photo_url="https://example.com/photo.jpg",
        document_url="https://example.com/doc.pdf",
    )
    assert req.upi_id == "freshbakery@okhdfcbank"

    # Testing shop creation endpoint with invalid UPI format returns 422
    token, _ = setup_customer(client, "shopowner_test@test.com")
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == "shopowner_test@test.com").first()
        user.role = "VENDOR"
        user.is_shop_owner = True
        db.commit()
    finally:
        db.close()

    res_bad_shop = client.post(
        "/shops/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Bad UPI Shop",
            "address": "123 Street",
            "latitude": 13.0,
            "longitude": 80.0,
            "upi_id": "invalidupi",
        }
    )
    assert res_bad_shop.status_code == 422


# ==============================================================================
# 2. SHOP DELIVERY AVAILABILITY & UPI CONFIGURATION
# ==============================================================================

def test_shop_delivery_availability_checks(client: TestClient):
    vendor_token, shop_id = setup_verified_vendor(client, "vendor1@test.com", "Green Grocery", upi_id="greengrocer@upi")
    cust_token, _ = setup_customer(client, "cust1@test.com")
    prod_id = add_product(client, vendor_token, "Apples", price=60.0, qty=10)

    # Disable delivery for the shop
    client.put(
        f"/shops/{shop_id}",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={
            "name": "Green Grocery",
            "address": "123 Market St, Chennai",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "upi_id": "greengrocer@upi",
            "delivery_enabled": False,
            "delivery_fee": 0.0,
            "min_order_amount": 0.0,
        }
    )

    # Attempt delivery order -> must fail with 400
    res_order = client.post(
        "/orders/",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={
            "product_id": prod_id,
            "quantity": 1,
            "order_type": "DELIVERY",
            "delivery_address": "45 Park Avenue, Chennai",
        }
    )
    assert res_order.status_code == 400
    assert "delivery is currently disabled" in res_order.json()["detail"].lower()


# ==============================================================================
# 3. SINGLE SHOP PER ORDER ENFORCEMENT
# ==============================================================================

def test_single_shop_per_order_enforcement(client: TestClient):
    v1_token, shop1_id = setup_verified_vendor(client, "v1@test.com", "Shop Alpha", upi_id="alpha@upi")
    v2_token, shop2_id = setup_verified_vendor(client, "v2@test.com", "Shop Beta", upi_id="beta@upi")
    cust_token, _ = setup_customer(client, "cust_multi@test.com")

    prod1 = add_product(client, v1_token, "Alpha Bread", price=50.0)
    prod2 = add_product(client, v2_token, "Beta Milk", price=40.0)

    # Mixed items from Shop Alpha and Shop Beta
    res_mixed = client.post(
        "/orders/",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={
            "items": [
                {"product_id": prod1, "quantity": 1},
                {"product_id": prod2, "quantity": 1}
            ],
            "order_type": "DELIVERY",
            "delivery_address": "12 Cross St, Chennai",
        }
    )
    assert res_mixed.status_code == 400
    assert "one shop per order is strictly required" in res_mixed.json()["detail"].lower()


# ==============================================================================
# 4. DELIVERY PIN GENERATION & UPI PAYMENT FLOW
# ==============================================================================

def test_complete_delivery_and_upi_payment_lifecycle(client: TestClient):
    vendor_token, shop_id = setup_verified_vendor(client, "freshshop@test.com", "Fresh Market", upi_id="fresh@icici")
    cust_token, cust_id = setup_customer(client, "shopper@test.com")
    prod_id = add_product(client, vendor_token, "Sourdough Loaf", price=100.0, qty=10)

    # 1. Customer creates DELIVERY order
    res_order = client.post(
        "/orders/",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={
            "product_id": prod_id,
            "quantity": 2,
            "order_type": "DELIVERY",
            "delivery_address": "100 Beach Road, Chennai",
            "delivery_notes": "Leave at front gate",
        }
    )
    assert res_order.status_code == 201, res_order.text
    order_data = res_order.json()
    order_id = order_data["id"]

    assert order_data["order_type"] == "DELIVERY"
    assert order_data["status"] == "PENDING"
    assert order_data["payment_status"] == "UNPAID"
    assert order_data["total_price"] > 0.0
    assert order_data["delivery_fee"] == 30.0
    assert len(order_data["delivery_pin"]) == 4  # 4-digit PIN generated

    # 2. Customer self-confirm attack: Customer cannot PATCH payment to PAID
    res_hack = client.patch(
        f"/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={"status": "ACCEPTED"}
    )
    assert res_hack.status_code in [401, 403]

    # 3. Direct vendor verify before customer reports payment must fail
    res_direct_verify = client.post(
        f"/orders/{order_id}/verify-payment",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"confirmed": True}
    )
    assert res_direct_verify.status_code == 400
    assert "customer_reported_unverified" in res_direct_verify.json()["detail"].lower()

    # 4. Customer reports payment with 12-digit UTR
    res_report = client.post(
        f"/orders/{order_id}/report-payment",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={"upi_transaction_id": "UTR482910492810"}
    )
    assert res_report.status_code == 200
    assert res_report.json()["payment_status"] == "CUSTOMER_REPORTED_UNVERIFIED"
    assert res_report.json()["upi_transaction_id"] == "UTR482910492810"

    # 5. Vendor accepts order before payment verification must fail
    res_early_accept = client.patch(
        f"/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"status": "ACCEPTED"}
    )
    assert res_early_accept.status_code == 400
    assert "verify customer upi payment first" in res_early_accept.json()["detail"].lower()

    # 6. Vendor verifies payment
    res_verify = client.post(
        f"/orders/{order_id}/verify-payment",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"confirmed": True}
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["payment_status"] == "PAID"

    # 7. Vendor transitions: ACCEPTED -> OUT_FOR_DELIVERY
    res_acc = client.patch(
        f"/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"status": "ACCEPTED"}
    )
    assert res_acc.status_code == 200
    assert res_acc.json()["status"] == "ACCEPTED"

    res_out = client.patch(
        f"/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"status": "OUT_FOR_DELIVERY"}
    )
    assert res_out.status_code == 200
    assert res_out.json()["status"] == "OUT_FOR_DELIVERY"

    # 8. Direct status patch to DELIVERED without PIN must be rejected
    res_bypass = client.patch(
        f"/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"status": "DELIVERED"}
    )
    assert res_bypass.status_code == 400
    assert "pin verification" in res_bypass.json()["detail"].lower()

    # 9. Verify with wrong PIN fails
    res_wrong_pin = client.post(
        f"/orders/{order_id}/verify-delivery-pin",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"pin": "0000" if order_data["delivery_pin"] != "0000" else "9999"}
    )
    assert res_wrong_pin.status_code == 400
    assert "invalid delivery pin" in res_wrong_pin.json()["detail"].lower()

    # 10. Verify with correct PIN succeeds
    res_correct_pin = client.post(
        f"/orders/{order_id}/verify-delivery-pin",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"pin": order_data["delivery_pin"]}
    )
    assert res_correct_pin.status_code == 200
    assert res_correct_pin.json()["status"] == "DELIVERED"
    assert res_correct_pin.json()["completed_at"] is not None


# ==============================================================================
# 5. BRUTE-FORCE DELIVERY PIN LOCKOUT (5 ATTEMPTS)
# ==============================================================================

def test_delivery_pin_lockout_after_5_failed_attempts(client: TestClient):
    vendor_token, _ = setup_verified_vendor(client, "lockvendor@test.com", "Lock Shop", upi_id="lock@upi")
    cust_token, _ = setup_customer(client, "lockcust@test.com")
    prod_id = add_product(client, vendor_token, "Cake", price=200.0)

    # Place order, report payment, verify payment, set out for delivery
    res_order = client.post(
        "/orders/",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={"product_id": prod_id, "quantity": 1, "order_type": "DELIVERY", "delivery_address": "1 Road"}
    )
    order_id = res_order.json()["id"]
    client.post(f"/orders/{order_id}/report-payment", headers={"Authorization": f"Bearer {cust_token}"}, json={"upi_transaction_id": "UTR123456789"})
    client.post(f"/orders/{order_id}/verify-payment", headers={"Authorization": f"Bearer {vendor_token}"}, json={"confirmed": True})
    client.patch(f"/orders/{order_id}/status", headers={"Authorization": f"Bearer {vendor_token}"}, json={"status": "ACCEPTED"})
    client.patch(f"/orders/{order_id}/status", headers={"Authorization": f"Bearer {vendor_token}"}, json={"status": "OUT_FOR_DELIVERY"})

    # 4 failed attempts
    for i in range(1, 5):
        res_fail = client.post(
            f"/orders/{order_id}/verify-delivery-pin",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={"pin": "0000"}
        )
        assert res_fail.status_code == 400
        assert f"{5 - i} attempt(s) remaining" in res_fail.json()["detail"].lower()

    # 5th failed attempt locks PIN
    res_lock = client.post(
        f"/orders/{order_id}/verify-delivery-pin",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"pin": "0000"}
    )
    assert res_lock.status_code == 423
    assert "locked" in res_lock.json()["detail"].lower()

    # 6th attempt remains locked even with correct PIN
    res_after = client.post(
        f"/orders/{order_id}/verify-delivery-pin",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"pin": res_order.json()["delivery_pin"]}
    )
    assert res_after.status_code == 423


# ==============================================================================
# 6. ORDER CANCELLATION AUDIT TRAIL & REFUND GUIDANCE
# ==============================================================================

def test_order_cancellation_audit_trail_and_refund_guidance(client: TestClient):
    vendor_token, _ = setup_verified_vendor(client, "cancelvendor@test.com", "Cancel Store", upi_id="cancel@upi")
    cust_token, _ = setup_customer(client, "cancelcust@test.com")
    prod_id = add_product(client, vendor_token, "Pie", price=80.0, qty=10)

    # Place order and report payment
    res_order = client.post(
        "/orders/",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={"product_id": prod_id, "quantity": 2, "order_type": "DELIVERY", "delivery_address": "88 Tree Ave"}
    )
    order_id = res_order.json()["id"]
    client.post(f"/orders/{order_id}/report-payment", headers={"Authorization": f"Bearer {cust_token}"}, json={"upi_transaction_id": "UTR999999999999"})
    client.post(f"/orders/{order_id}/verify-payment", headers={"Authorization": f"Bearer {vendor_token}"}, json={"confirmed": True})
    client.patch(f"/orders/{order_id}/status", headers={"Authorization": f"Bearer {vendor_token}"}, json={"status": "ACCEPTED"})

    # Check stock was reduced to 8
    db = next(get_db())
    try:
        p = db.get(Product, prod_id)
        assert p.quantity == 8
    finally:
        db.close()

    # Vendor cancels accepted order
    res_cancel = client.post(
        f"/orders/{order_id}/cancel",
        headers={"Authorization": f"Bearer {vendor_token}"},
        json={"reason": "Item unavailable"}
    )
    assert res_cancel.status_code == 200
    cancelled_order = res_cancel.json()
    assert cancelled_order["status"] == "CANCELLED"
    assert cancelled_order["cancelled_by"] == "VENDOR"
    assert "refund directly to your source upi account" in cancelled_order["refund_guidance"].lower()

    # Verify inventory stock was restored to 10
    db = next(get_db())
    try:
        p = db.get(Product, prod_id)
        assert p.quantity == 10
    finally:
        db.close()


# ==============================================================================
# 7. MULTI-TENANT ISOLATION SECURITY
# ==============================================================================

def test_multi_tenant_order_isolation(client: TestClient):
    v_a_token, shop_a = setup_verified_vendor(client, "va@test.com", "Shop A", upi_id="va@upi")
    v_b_token, shop_b = setup_verified_vendor(client, "vb@test.com", "Shop B", upi_id="vb@upi")
    cust_token, _ = setup_customer(client, "cust_iso@test.com")
    prod_a = add_product(client, v_a_token, "Product A", price=50.0)

    # Customer orders from Shop A
    res_order = client.post(
        "/orders/",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={"product_id": prod_a, "quantity": 1, "order_type": "DELIVERY", "delivery_address": "Street A"}
    )
    order_id = res_order.json()["id"]

    # Vendor B attempts to view or verify Vendor A's order -> 404 / 403 Forbidden
    res_leak = client.get(
        f"/orders/{order_id}",
        headers={"Authorization": f"Bearer {v_b_token}"}
    )
    assert res_leak.status_code == 403

    res_verify_hack = client.post(
        f"/orders/{order_id}/verify-payment",
        headers={"Authorization": f"Bearer {v_b_token}"},
        json={"confirmed": True}
    )
    assert res_verify_hack.status_code == 404


# ==============================================================================
# 8. EXISTING PICKUP RESERVATION REGRESSION TEST
# ==============================================================================

def test_existing_pickup_reservation_flow_unaffected(client: TestClient):
    v_token, shop_id = setup_verified_vendor(client, "pickupvendor@test.com", "Pickup Shop", upi_id="pickup@upi")
    cust_token, _ = setup_customer(client, "pickupcust@test.com")
    prod_id = add_product(client, v_token, "Pickup Bagel", price=30.0, qty=5)

    # 1. Create pickup reservation
    res_res = client.post(
        "/reservations/",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={"product_id": prod_id, "quantity": 1}
    )
    assert res_res.status_code == 201
    res_data = res_res.json()
    pickup_code = res_data["pickup_code"]
    res_id = res_data["id"]

    # 2. Verify via 6-digit code endpoint
    res_verify = client.post(
        f"/reservations/verify/{pickup_code}",
        headers={"Authorization": f"Bearer {v_token}"}
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["status"] == "COMPLETED"
