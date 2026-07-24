import httpx
import time
import os

API_URL = "http://127.0.0.1:8000"

def run_tests():
    print("Testing Health Endpoint...")
    try:
        res = httpx.get(f"{API_URL}/health")
        print("Health Response:", res.status_code, res.text)
        if res.status_code != 200:
            return False
    except Exception as e:
        print("Failed to connect to API:", e)
        return False
        
    print("\nTesting Registration...")
    try:
        register_data = {
            "name": "Test Shopkeeper",
            "email": f"shopkeeper_{int(time.time())}@test.com",
            "password": "password123",
            "is_shop_owner": True
        }
        res = httpx.post(f"{API_URL}/auth/register", json=register_data)
        print("Register Response:", res.status_code, res.text)
        if res.status_code not in (200, 201):
            return False
        token = res.json()["access_token"]
    except Exception as e:
        print("Failed to register:", e)
        return False
        
    print("\nTesting Shop Creation...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        shop_data = {
            "name": "Supabase Test Shop",
            "address": "123 Cloud Street",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "description": "Testing Postgres connection"
        }
        res = httpx.post(f"{API_URL}/shops/", json=shop_data, headers=headers)
        print("Shop Response:", res.status_code, res.text)
        if res.status_code not in (200, 201):
            return False
    except Exception as e:
        print("Failed to create shop:", e)
        return False
        
    print("\nTesting Image Upload (Dummy file)...")
    try:
        files = {'file': ('test_image.png', b'dummy content', 'image/png')}
        res = httpx.post(f"{API_URL}/upload/image", files=files, headers=headers)
        print("Upload Response:", res.status_code, res.text)
        if res.status_code != 200:
            return False
    except Exception as e:
        print("Failed to upload image:", e)
        return False

    print("\nALL TESTS PASSED SUCCESSFULLY! Connected to Supabase!")
    return True

if __name__ == "__main__":
    run_tests()
