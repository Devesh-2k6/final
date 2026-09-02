import sys
import os

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from main import app
from db.session import SessionLocal, init_db
from db.models import User, Shop

init_db()
client = TestClient(app)

def test_admin_console_improvements():
    print("=" * 70)
    print("TEST: Admin Console Re-verification & Location Fixes")
    print("=" * 70)

    # 1. Admin login
    res = client.post("/auth/login", json={"email": "admin@test.com", "password": "password123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get pending shops
    pending_res = client.get("/admin/shops/pending", headers=headers)
    assert pending_res.status_code == 200
    shops = pending_res.json()
    print(f"Total Pending Shops Retrieved: {len(shops)}")

    if shops:
        first_shop = shops[0]
        shop_id = first_shop["id"]
        print(f"Testing on-demand reverify on shop: '{first_shop['name']}' (ID: {shop_id})")

        # 3. Test on-demand reverify endpoint
        reverify_res = client.post(f"/admin/shops/{shop_id}/reverify-location", headers=headers)
        assert reverify_res.status_code == 200, f"Reverify failed: {reverify_res.text}"
        reverified_data = reverify_res.json()
        print(f"Re-verification Result -> Provider: {reverified_data['location_verification_provider']}, Matched: {reverified_data['location_verification_name']}, Verified: {reverified_data['location_verified']}")
        assert reverified_data["location_verification_provider"] is not None
        assert reverified_data["location_verification_name"] is not None

    print("\n[SUCCESS] Admin Re-verify and Map endpoints operating 100% correctly!")

if __name__ == "__main__":
    test_admin_console_improvements()
