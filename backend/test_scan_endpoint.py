import requests
import io
import sys
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000"

def test_ai_scanner_endpoint():
    print("=" * 60)
    print("DIAGNOSTIC TEST: AI DATE LABEL SCANNER ENDPOINT")
    print("=" * 60)
    
    # 1. Signup shopkeeper to get auth token
    email = f"tester_{int(datetime.now().timestamp())}@test.com"
    password = "password123"
    print(f"Step 1: Signing up diagnostic shopkeeper: {email}")
    
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "name": "Diagnostic Tester",
        "is_shop_owner": True
    })
    
    if reg_res.status_code not in (200, 201):
        print(f"Error: Shopkeeper registration failed: {reg_res.text}")
        return
        
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Shopkeeper authenticated successfully.")
    
    # 2. Prepare a fake 1x1 transparent GIF image in-memory
    print("Step 2: Preparing mock image bytes...")
    gif_bytes = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    file_payload = {"file": ("mock_label.gif", io.BytesIO(gif_bytes), "image/gif")}
    
    # 3. Call scan-dates endpoint
    print("Step 3: Submitting mock image to /products/scan-dates...")
    scan_res = requests.post(
        f"{BASE_URL}/products/scan-dates",
        headers=headers,
        files=file_payload
    )
    
    if scan_res.status_code != 200:
        print(f"Error: Date scanning endpoint failed: {scan_res.status_code} - {scan_res.text}")
        return
        
    result = scan_res.json()
    print("\n" + "=" * 40)
    print("ENDPOINT RESPONSE SUCCESS:")
    print(f"  - Manufacturing Date Detected : {result.get('manufacturing_date')}")
    print(f"  - Expiry Date Detected        : {result.get('expiry_date')}")
    print(f"  - Classifier Confidence Score: {result.get('confidence_score')}")
    print(f"  - Text Raw Detection Output   : '{result.get('detected_text')}'")
    print("=" * 40)
    print("\n[OK] AI date label scanning verification completed successfully.")

if __name__ == "__main__":
    test_ai_scanner_endpoint()
