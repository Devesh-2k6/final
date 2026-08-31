import pytest
from datetime import datetime, UTC, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch

from db.base import Base
from db.models import User, Shop, Product, ProductCategory, UserRole, ShopApprovalStatus
from db.session import engine, SessionLocal, get_db
from main import app
from auth_service import hash_password, create_access_token
from services.location_verifier import LocationVerificationResult


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_user():
    db = SessionLocal()
    user = User(
        email="admin@test.com",
        name="Platform Admin",
        role="ADMIN",
        is_shop_owner=False,
        email_verified=True,
        hashed_password=hash_password("adminpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    user_dict = {"id": user.id, "email": user.email, "role": user.role}
    db.close()
    return {"user": user_dict, "token": token}


@pytest.fixture
def verified_merchant():
    db = SessionLocal()
    user = User(
        email="merchant_verified@test.com",
        name="John Baker",
        role="SHOPKEEPER",
        is_shop_owner=True,
        email_verified=True,
        hashed_password=hash_password("merchantpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    user_dict = {"id": user.id, "email": user.email, "role": user.role}
    db.close()
    return {"user": user_dict, "token": token}


@pytest.fixture
def unverified_email_merchant():
    db = SessionLocal()
    user = User(
        email="merchant_unverified@test.com",
        name="Bob Merchant",
        role="SHOPKEEPER",
        is_shop_owner=True,
        email_verified=False,
        hashed_password=hash_password("merchantpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    user_dict = {"id": user.id, "email": user.email, "role": user.role}
    db.close()
    return {"user": user_dict, "token": token}


@pytest.fixture
def customer_user():
    db = SessionLocal()
    user = User(
        email="customer@test.com",
        name="Jane Shopper",
        role="CUSTOMER",
        is_shop_owner=False,
        email_verified=True,
        hashed_password=hash_password("customerpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    user_dict = {"id": user.id, "email": user.email, "role": user.role}
    db.close()
    return {"user": user_dict, "token": token}


def test_merchant_registration_sets_role_and_unverified(client):
    res = client.post(
        "/auth/register",
        json={
            "email": "new_baker@test.com",
            "password": "SecurePassword123!",
            "name": "Artisan Bakery Owner",
            "is_shop_owner": True,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["role"] == "SHOPKEEPER"
    assert data["user"]["email_verified"] is False


def test_unverified_email_merchant_cannot_access_shop_or_create(client, unverified_email_merchant):
    headers = {"Authorization": f"Bearer {unverified_email_merchant['token']}"}
    
    # Attempting to fetch /shops/me before email verification should return 403
    res = client.get("/shops/me", headers=headers)
    assert res.status_code == 403
    assert "verify your email" in res.json()["detail"].lower()

    # Attempting to create a shop before email verification should return 403
    res = client.post(
        "/shops/",
        headers=headers,
        json={
            "name": "Test Bakery",
            "address": "123 Market St",
            "latitude": 28.6139,
            "longitude": 77.2090,
        },
    )
    assert res.status_code == 403


def test_shop_creation_sets_pending_and_inactive(client, verified_merchant):
    headers = {"Authorization": f"Bearer {verified_merchant['token']}"}

    # Mock verify_shop_location to succeed as a food business
    mock_result = LocationVerificationResult(
        verified=True,
        provider="nominatim",
        matched_business_name="Artisan Bakery",
        matched_address="123 Connaught Place, New Delhi",
        distance_meters=15.0,
        category="bakery",
        message="Location verified.",
    )

    with patch("routers.shops.verify_shop_location", return_value=mock_result):
        res = client.post(
            "/shops/",
            headers=headers,
            json={
                "name": "Artisan Bakery",
                "address": "123 Connaught Place, New Delhi",
                "latitude": 28.6304,
                "longitude": 77.2177,
                "description": "Fresh artisan bread.",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["approval_status"] == "PENDING"
        assert data["is_active"] is False
        assert data["location_verified"] is True


def test_pending_merchant_cannot_create_products(client, verified_merchant):
    headers = {"Authorization": f"Bearer {verified_merchant['token']}"}

    # Set up pending shop in db
    db = SessionLocal()
    shop = Shop(
        owner_id=verified_merchant["user"]["id"],
        name="Artisan Bakery",
        address="123 Connaught Place, New Delhi",
        latitude=28.6304,
        longitude=77.2177,
        is_active=False,
        location_verified=True,
        approval_status="PENDING",
    )
    db.add(shop)
    db.commit()
    db.close()

    # Attempting to post a deal while pending should return 403
    future_date = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    now_date = datetime.now(UTC).isoformat()
    prod_payload = {
        "name": "Sourdough Loaf",
        "category": "BAKERY",
        "original_price": 100.0,
        "discount_price": 50.0,
        "quantity": 5,
        "manufacturing_date": now_date,
        "expiry_date": future_date,
    }

    res = client.post("/products/", headers=headers, json=prod_payload)
    assert res.status_code == 403
    assert "pending administrator review and approval" in res.json()["detail"].lower()


def test_non_admin_cannot_access_admin_endpoints(client, verified_merchant, customer_user):
    merchant_headers = {"Authorization": f"Bearer {verified_merchant['token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_user['token']}"}

    res = client.get("/admin/shops/pending", headers=merchant_headers)
    assert res.status_code == 403
    assert "administrator privileges required" in res.json()["detail"].lower()

    res = client.get("/admin/stats", headers=customer_headers)
    assert res.status_code == 403


def test_admin_can_list_pending_shops_and_approve(client, admin_user, verified_merchant):
    admin_headers = {"Authorization": f"Bearer {admin_user['token']}"}

    db = SessionLocal()
    shop = Shop(
        owner_id=verified_merchant["user"]["id"],
        name="Artisan Bakery",
        address="123 Connaught Place, New Delhi",
        latitude=28.6304,
        longitude=77.2177,
        photo_url="https://images.unsplash.com/photo-1555507036-ab1f4038808a",
        document_url="https://example.com/fssai_cert.pdf",
        is_active=False,
        location_verified=True,
        approval_status="PENDING",
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    shop_id = shop.id
    db.close()

    # 1. Admin lists pending shops
    res = client.get("/admin/shops/pending", headers=admin_headers)
    assert res.status_code == 200
    pending_list = res.json()
    assert len(pending_list) >= 1
    matched = next((s for s in pending_list if s["id"] == shop_id), None)
    assert matched is not None
    assert matched["approval_status"] == "PENDING"

    # 2. Admin approves shop
    res = client.post(f"/admin/shops/{shop_id}/approve", headers=admin_headers, json={"notes": "All documents verified."})
    assert res.status_code == 200
    approved_data = res.json()
    assert approved_data["approval_status"] == "APPROVED"
    assert approved_data["is_active"] is True
    assert approved_data["approved_by"] == "admin@test.com"

    # 3. Now merchant can create products!
    merchant_headers = {"Authorization": f"Bearer {verified_merchant['token']}"}
    future_date = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    now_date = datetime.now(UTC).isoformat()
    prod_payload = {
        "name": "Sourdough Loaf",
        "category": "BAKERY",
        "original_price": 100.0,
        "discount_price": 50.0,
        "quantity": 5,
        "manufacturing_date": now_date,
        "expiry_date": future_date,
    }
    res = client.post("/products/", headers=merchant_headers, json=prod_payload)
    assert res.status_code == 201
    assert res.json()["name"] == "Sourdough Loaf"


def test_admin_reject_shop_with_reason(client, admin_user, verified_merchant):
    admin_headers = {"Authorization": f"Bearer {admin_user['token']}"}

    db = SessionLocal()
    shop = Shop(
        owner_id=verified_merchant["user"]["id"],
        name="Electronics & Gadgets",
        address="456 Tech Park",
        latitude=28.6304,
        longitude=77.2177,
        is_active=False,
        location_verified=True,
        approval_status="PENDING",
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    shop_id = shop.id
    db.close()

    # Rejection without reason fails
    res = client.post(f"/admin/shops/{shop_id}/reject", headers=admin_headers, json={"reason": ""})
    assert res.status_code == 422 or res.status_code == 400

    # Rejection with clear reason succeeds
    res = client.post(
        f"/admin/shops/{shop_id}/reject",
        headers=admin_headers,
        json={"reason": "Business is an electronics retail store, not a food or grocery merchant."},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["approval_status"] == "REJECTED"
    assert data["is_active"] is False
    assert "electronics" in data["approval_reason"].lower()


import io

def test_shop_document_upload_and_persistence(client, admin_user, verified_merchant):
    merchant_headers = {"Authorization": f"Bearer {verified_merchant['token']}"}
    admin_headers = {"Authorization": f"Bearer {admin_user['token']}"}

    # 1. Upload FSSAI PDF license
    fake_pdf = io.BytesIO(b"%PDF-1.4 Fake FSSAI Certificate Content")
    files = {"file": ("fssai_license.pdf", fake_pdf, "application/pdf")}
    upload_res = client.post("/shops/upload-document", headers=merchant_headers, files=files)
    assert upload_res.status_code == 200
    doc_data = upload_res.json()
    assert "document_url" in doc_data
    assert doc_data["filename"] == "fssai_license.pdf"
    doc_url = doc_data["document_url"]

    # 2. Create shop with document attached
    with patch("routers.shops.verify_shop_location") as mock_loc:
        mock_loc.return_value = LocationVerificationResult(
            verified=True,
            is_error=False,
            provider="nominatim",
            matched_business_name="Organic Supermarket",
            matched_address="123 Food Street, Bengaluru",
            distance_meters=0.0,
            category="grocery",
            message="Verified",
        )
        shop_res = client.post(
            "/shops/",
            headers=merchant_headers,
            json={
                "name": "Organic Supermarket",
                "address": "123 Food Street, Bengaluru",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "verification_document_url": doc_url,
                "verification_document_name": "fssai_license.pdf",
            },
        )
    assert shop_res.status_code == 201
    created_shop = shop_res.json()
    assert created_shop["verification_document_url"] == doc_url
    assert created_shop["verification_document_name"] == "fssai_license.pdf"

    # 3. Admin views pending queue and inspects document
    pending_res = client.get("/admin/shops/pending", headers=admin_headers)
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    assert len(pending_list) >= 1
    target_shop = next(s for s in pending_list if s["id"] == created_shop["id"])
    assert target_shop["verification_document_url"] == doc_url
    assert target_shop["verification_document_name"] == "fssai_license.pdf"


def test_shop_document_upload_invalid_type_rejected(client, verified_merchant):
    merchant_headers = {"Authorization": f"Bearer {verified_merchant['token']}"}
    fake_exe = io.BytesIO(b"MZ executable content")
    files = {"file": ("malicious.exe", fake_exe, "application/x-msdownload")}
    upload_res = client.post("/shops/upload-document", headers=merchant_headers, files=files)
    assert upload_res.status_code == 400
    assert "invalid file format" in upload_res.json()["detail"].lower()

