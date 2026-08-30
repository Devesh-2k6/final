import pytest
from fastapi.testclient import TestClient
from main import app
from services.otp import send_otp_to_identifier, verify_otp_code, _OTP_STORE, clear_otp_store
from services.email import get_dev_mailbox, clear_dev_mailbox

client = TestClient(app)

def setup_function():
    clear_otp_store()
    clear_dev_mailbox()

def test_send_and_verify_otp_service():
    email = "otp_unit_test@example.com"
    
    # 1. Send OTP
    res = send_otp_to_identifier(email, name="Test User")
    assert res["success"] is True
    # Zero leak: dev_otp should not be in the dictionary
    assert "dev_otp" not in res
    
    # Code is securely stored in internal store & sent via email
    assert email in _OTP_STORE
    otp_code = _OTP_STORE[email]["code"]
    assert len(otp_code) == 6

    # 2. Verify with wrong OTP
    valid, msg = verify_otp_code(email, "000000")
    assert valid is False
    assert "Incorrect OTP" in msg

    # 3. Verify with correct OTP
    valid, msg = verify_otp_code(email, otp_code)
    assert valid is True
    assert "OTP verified" in msg

    # 4. Verify single-use consumption
    valid_again, msg_again = verify_otp_code(email, otp_code)
    assert valid_again is False


def test_send_otp_api_endpoint():
    email = "api_otp_test@example.com"
    response = client.post("/auth/send-otp", json={"identifier": email, "name": "API Tester"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # Zero-leak check: OTP must NOT be exposed in API JSON response
    assert "dev_otp" not in data or data.get("dev_otp") is None


def test_verify_otp_api_endpoint_registers_and_authenticates():
    email = "new_otp_user@example.com"
    
    # Send OTP first
    send_res = client.post("/auth/send-otp", json={"identifier": email, "name": "New Rescuer"})
    assert send_res.status_code == 200
    assert email in _OTP_STORE
    otp = _OTP_STORE[email]["code"]

    # Verify and auto-register
    verify_res = client.post("/auth/verify-otp", json={
        "identifier": email,
        "otp": otp,
        "name": "New Rescuer",
        "is_shop_owner": False
    })
    assert verify_res.status_code == 200
    auth_data = verify_res.json()
    assert "access_token" in auth_data
    assert auth_data["user"]["email"] == email
    assert auth_data["user"]["email_verified"] is True
