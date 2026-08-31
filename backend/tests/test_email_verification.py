"""
Comprehensive test suite for ExpiryGo Real Email Verification & Security Protections.
"""

from datetime import datetime, UTC, timedelta
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from db.base import Base
from db.models import User, Shop, Product, ProductCategory
from db.session import engine, get_db
from auth_service import hash_verification_token, create_access_token, generate_verification_token


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client() -> TestClient:
    from main import app
    with TestClient(app) as test_client:
        yield test_client


def test_register_creates_unverified_user_and_token(client: TestClient):
    """Test that registration creates an unverified user with a hashed token and 24h expiration."""
    with patch("routers.auth.send_otp_to_identifier", return_value={"status": "dispatched", "dev_code": "123456"}) as mock_send:
        res = client.post(
            "/auth/register",
            json={
                "email": "freshuser@test.com",
                "password": "password123",
                "name": "Fresh User",
                "is_shop_owner": False,
            },
        )
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["user"]["email"] == "freshuser@test.com"
        assert data["user"]["email_verified"] is False
        assert mock_send.called

    # Query DB directly to verify token hashing and expiration
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == "freshuser@test.com").first()
        assert user is not None
        assert user.email_verified is False
        assert user.email_verification_token_hash is not None
        assert user.email_verification_expires_at is not None
        
        # Verify expiration is approximately 24 hours from now
        now = datetime.now(UTC).replace(tzinfo=None)
        diff_hours = (user.email_verification_expires_at - now).total_seconds() / 3600
        assert 23.5 <= diff_hours <= 24.5
    finally:
        db.close()


def test_verify_email_success(client: TestClient):
    """Test successful verification using the raw token provided to the verification endpoint."""
    raw_token, token_hash, expires_at = generate_verification_token(expire_hours=24)
    db = next(get_db())
    try:
        user = User(
            email="verify_me@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Verify Me",
            is_shop_owner=False,
            email_verified=False,
            email_verification_token_hash=token_hash,
            email_verification_expires_at=expires_at,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    # Call verification endpoint
    res = client.get(f"/auth/verify-email?token={raw_token}")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["email"] == "verify_me@test.com"

    # Confirm in DB that user is now verified and token is cleared
    db = next(get_db())
    try:
        updated_user = db.query(User).filter(User.email == "verify_me@test.com").first()
        assert updated_user.email_verified is True
        assert updated_user.email_verification_token_hash is None
        assert updated_user.email_verification_expires_at is None
    finally:
        db.close()


def test_verify_email_invalid_token(client: TestClient):
    """Test that a fake/tampered token returns 400 Bad Request."""
    res = client.get("/auth/verify-email?token=this_is_a_completely_fake_token_12345")
    assert res.status_code == 400
    assert "Invalid or expired" in res.json()["detail"]


def test_verify_email_expired_token(client: TestClient):
    """Test that an expired token (older than 24 hours) is rejected."""
    raw_token, token_hash, _ = generate_verification_token(expire_hours=24)
    expired_time = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=2)

    db = next(get_db())
    try:
        user = User(
            email="expired@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Expired User",
            is_shop_owner=False,
            email_verified=False,
            email_verification_token_hash=token_hash,
            email_verification_expires_at=expired_time,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    res = client.get(f"/auth/verify-email?token={raw_token}")
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()


def test_verify_email_single_use_prevent_reuse(client: TestClient):
    """Test that once verified, a token cannot be reused."""
    raw_token, token_hash, expires_at = generate_verification_token(expire_hours=24)
    db = next(get_db())
    try:
        user = User(
            email="singleuse@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Single Use",
            is_shop_owner=False,
            email_verified=False,
            email_verification_token_hash=token_hash,
            email_verification_expires_at=expires_at,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    # First attempt: SUCCESS
    res1 = client.get(f"/auth/verify-email?token={raw_token}")
    assert res1.status_code == 200

    # Second attempt with same token: REJECTED
    res2 = client.get(f"/auth/verify-email?token={raw_token}")
    assert res2.status_code == 400


def test_resend_verification_email(client: TestClient):
    """Test requesting a new verification email when unverified."""
    old_raw, old_hash, old_exp = generate_verification_token(expire_hours=24)
    old_sent_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=5)

    db = next(get_db())
    try:
        user = User(
            email="resend_test@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Resend Tester",
            is_shop_owner=False,
            email_verified=False,
            email_verification_token_hash=old_hash,
            email_verification_expires_at=old_exp,
            last_verification_email_sent_at=old_sent_at,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    with patch("routers.auth.send_verification_email", return_value=True) as mock_send:
        res = client.post("/auth/resend-verification", json={"email": "resend_test@test.com"})
        assert res.status_code == 200, res.text
        assert res.json()["success"] is True
        assert mock_send.called

    # Check that a new token hash was written to DB
    db = next(get_db())
    try:
        updated = db.query(User).filter(User.email == "resend_test@test.com").first()
        assert updated.email_verification_token_hash != old_hash
    finally:
        db.close()


def test_resend_verification_rate_limiting(client: TestClient):
    """Test that rapid consecutive resend requests trigger 429 Too Many Requests cooldown."""
    _, initial_hash, initial_exp = generate_verification_token(expire_hours=24)
    just_now = datetime.now(UTC).replace(tzinfo=None) - timedelta(seconds=10)

    db = next(get_db())
    try:
        user = User(
            email="ratelimit@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Rate Limit Tester",
            is_shop_owner=False,
            email_verified=False,
            email_verification_token_hash=initial_hash,
            email_verification_expires_at=initial_exp,
            last_verification_email_sent_at=just_now,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    res = client.post("/auth/resend-verification", json={"email": "ratelimit@test.com"})
    assert res.status_code == 429
    assert "Please wait" in res.json()["detail"]


def test_unverified_shopkeeper_blocked_from_creating_products(client: TestClient):
    """Test that an unverified shopkeeper is strictly forbidden from creating products."""
    db = next(get_db())
    try:
        merchant = User(
            email="unverified_shop@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Unverified Store Owner",
            is_shop_owner=True,
            email_verified=False,
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)

        shop = Shop(
            owner_id=merchant.id,
            name="Unverified Store",
            address="123 Test Road",
            latitude=13.0,
            longitude=80.0,
        )
        db.add(shop)
        db.commit()
        merchant_id = merchant.id
    finally:
        db.close()

    token = create_access_token(merchant_id)
    expiry = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    mfg = (datetime.now(UTC) - timedelta(days=2)).isoformat()

    res = client.post(
        "/products/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Surplus Apples",
            "category": "PRODUCE",
            "original_price": 100.0,
            "quantity": 10,
            "manufacturing_date": mfg,
            "expiry_date": expiry,
        },
    )
    assert res.status_code == 403, res.text
    assert "verify your email" in res.json()["detail"].lower()


def test_verified_shopkeeper_allowed_to_create_products(client: TestClient):
    """Test that once verified, a shopkeeper can successfully create products."""
    db = next(get_db())
    try:
        merchant = User(
            email="verified_shop@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Verified Store Owner",
            is_shop_owner=True,
            email_verified=True,
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)

        shop = Shop(
            owner_id=merchant.id,
            name="Verified Store",
            address="123 Test Road",
            latitude=13.0,
            longitude=80.0,
            is_active=True,
            location_verified=True,
            approval_status="APPROVED",
        )
        db.add(shop)
        db.commit()
        merchant_id = merchant.id
    finally:
        db.close()

    token = create_access_token(merchant_id)
    expiry = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    mfg = (datetime.now(UTC) - timedelta(days=2)).isoformat()

    res = client.post(
        "/products/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Surplus Apples",
            "category": "PRODUCE",
            "original_price": 100.0,
            "quantity": 10,
            "manufacturing_date": mfg,
            "expiry_date": expiry,
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["name"] == "Surplus Apples"


def test_unverified_customer_blocked_from_reserving_deal(client: TestClient):
    """Test that an unverified customer receives 403 Forbidden when trying to reserve a deal."""
    db = next(get_db())
    try:
        # Create verified merchant & product
        merchant = User(
            email="merchant_for_res@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Merchant For Res",
            is_shop_owner=True,
            email_verified=True,
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)

        shop = Shop(
            owner_id=merchant.id,
            name="Res Store",
            address="123 Res Road",
            latitude=13.0,
            longitude=80.0,
            is_active=True,
            location_verified=True,
            approval_status="APPROVED",
        )
        db.add(shop)
        db.commit()
        db.refresh(shop)

        expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=2)
        mfg = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=2)
        product = Product(
            shop_id=shop.id,
            name="Fresh Bread",
            category=ProductCategory.BAKERY,
            original_price=50.0,
            discount_price=25.0,
            quantity=5,
            manufacturing_date=mfg,
            expiry_date=expiry,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        product_id = product.id

        # Create unverified customer
        customer = User(
            email="unverified_cust@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Unverified Customer",
            is_shop_owner=False,
            email_verified=False,
        )
        db.add(customer)
        db.commit()
        customer_id = customer.id
    finally:
        db.close()

    token = create_access_token(customer_id)
    res = client.post(
        "/reservations/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_id": product_id,
            "quantity": 1,
        },
    )
    assert res.status_code == 403, res.text
    assert "verify your email" in res.json()["detail"].lower()


def test_verified_customer_allowed_to_reserve_deal(client: TestClient):
    """Test that a verified customer can successfully reserve a deal."""
    db = next(get_db())
    try:
        merchant = User(
            email="merchant_for_res2@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Merchant For Res 2",
            is_shop_owner=True,
            email_verified=True,
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)

        shop = Shop(
            owner_id=merchant.id,
            name="Res Store 2",
            address="123 Res Road",
            latitude=13.0,
            longitude=80.0,
        )
        db.add(shop)
        db.commit()
        db.refresh(shop)

        expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=2)
        mfg = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=2)
        product = Product(
            shop_id=shop.id,
            name="Fresh Bread 2",
            category=ProductCategory.BAKERY,
            original_price=50.0,
            discount_price=25.0,
            quantity=5,
            manufacturing_date=mfg,
            expiry_date=expiry,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        product_id = product.id

        # Create verified customer
        customer = User(
            email="verified_cust@test.com",
            hashed_password="hashed_pass_placeholder",
            name="Verified Customer",
            is_shop_owner=False,
            email_verified=True,
        )
        db.add(customer)
        db.commit()
        customer_id = customer.id
    finally:
        db.close()

    token = create_access_token(customer_id)
    with patch("routers.reservations.send_email_notification", return_value=True):
        res = client.post(
            "/reservations/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": product_id,
                "quantity": 1,
            },
        )
    assert res.status_code == 201, res.text
    assert res.json()["product_id"] == product_id

