import pytest
from fastapi.testclient import TestClient
from main import app
from db.base import Base
from db.models import User, Shop
from db.session import get_db, engine
from auth_service import hash_password
from services.otp import clear_otp_store

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_user():
    clear_otp_store()
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        # Create a test customer user
        test_email = "testreset@example.com"
        user = db.query(User).filter(User.email == test_email).first()
        if not user:
            user = User(
                email=test_email,
                name="Test Reset User",
                hashed_password=hash_password("OldPassword123"),
                role="CUSTOMER",
                is_shop_owner=False,
                email_verified=True,
            )
            db.add(user)
            db.commit()
        else:
            user.hashed_password = hash_password("OldPassword123")
            user.email_verified = True
            db.commit()
    finally:
        db.close()
    yield
    clear_otp_store()

def test_forgot_password_flow():
    # 1. Request forgot password
    res = client.post("/auth/forgot-password", json={"email": "testreset@example.com"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "dev_code" in data
    dev_code = data["dev_code"]
    assert dev_code is not None
    assert len(dev_code) == 6

    # 2. Try reset with wrong OTP -> should fail
    fail_res = client.post("/auth/reset-password", json={
        "email": "testreset@example.com",
        "otp": "000000",
        "new_password": "NewSecretPassword456"
    })
    assert fail_res.status_code == 400

    # 3. Reset with correct OTP -> should succeed
    succ_res = client.post("/auth/reset-password", json={
        "email": "testreset@example.com",
        "otp": dev_code,
        "new_password": "NewSecretPassword456"
    })
    assert succ_res.status_code == 200
    succ_data = succ_res.json()
    assert succ_data["success"] is True
    assert "access_token" in succ_data
    assert succ_data["access_token"] is not None

    # 4. Old password should fail on login
    old_login = client.post("/auth/login", json={
        "email": "testreset@example.com",
        "password": "OldPassword123"
    })
    assert old_login.status_code == 401

    # 5. New password should succeed on login
    new_login = client.post("/auth/login", json={
        "email": "testreset@example.com",
        "password": "NewSecretPassword456"
    })
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()
