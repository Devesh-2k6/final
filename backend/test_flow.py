#!/usr/bin/env python3
"""
Test script to verify the complete API is working
Run after starting the backend with: python backend/test_flow.py
"""

import requests
import json
from datetime import datetime, timedelta
import random
import string

BASE_URL = "http://localhost:8000"

def random_email():
    """Generate random email to avoid conflicts"""
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{rand}@test.com"

def test_auth():
    """Test authentication flow"""
    print("\n🔐 Testing Authentication...")
    
    email = random_email()
    # Register
    print("  • Registering new customer...")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": "Test Customer",
        "is_shop_owner": False
    })
    assert resp.status_code in (200, 201), f"Register failed: {resp.text}"
    data = resp.json()
    customer_token = data["access_token"]
    print(f"    ✅ Registered, token: {customer_token[:20]}...")
    
    # Login
    print("  • Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": "testpass123"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    print("    ✅ Login successful")
    
    return customer_token

def test_shop_flow(token, is_shop_owner=False):
    """Test shop and product flow"""
    print("\n🏪 Testing Shop & Product Flow...")
    
    if is_shop_owner:
        # Get my shop for shop owner
        print("  • Fetching my shop...")
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/shops/me", headers=headers)
        
        if resp.status_code == 404:
            print("    • No shop found, creating one...")
            resp = requests.post(f"{BASE_URL}/shops/", headers=headers, json={
                "name": "Test Shop",
                "address": "123 Test Street",
                "latitude": 40.7128,
                "longitude": -74.0060
            })
            assert resp.status_code in [200, 201], f"Create shop failed: {resp.text}"
            shop = resp.json()
        else:
            shop = resp.json()
        
        shop_id = shop["id"]
        print(f"    ✅ Shop ID: {shop_id}")
    else:
        print("  • Skipping my shop (customer account)")
    
    # Get products
    print("  • Fetching all products...")
    resp = requests.get(f"{BASE_URL}/products/")
    assert resp.status_code == 200, f"Get products failed: {resp.text}"
    products = resp.json()
    print(f"    ✅ Found {len(products)} products")
    
    if products:
        product = products[0]
        print(f"    • Sample product: {product['name']}")
        print(f"      Original: ₹{product['original_price']}")
        print(f"      Discounted: ₹{product['discount_price']}")
        discount_pct = ((product['original_price'] - product['discount_price']) / product['original_price']) * 100
        print(f"      Discount: {discount_pct:.0f}%")

def test_reservation_flow(token):
    """Test reservation flow"""
    print("\n📦 Testing Reservation Flow...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get products
    resp = requests.get(f"{BASE_URL}/products/")
    products = resp.json()
    
    if products:
        product_id = products[0]["id"]
        print(f"  • Reserving product: {products[0]['name']}")
        
        # Create reservation
        resp = requests.post(f"{BASE_URL}/reservations/", headers=headers, json={
            "product_id": product_id,
            "quantity": 1
        })
        assert resp.status_code in [200, 201], f"Create reservation failed: {resp.text}"
        reservation = resp.json()
        print(f"    ✅ Reservation created: {reservation['id']}")
        print(f"    • Pickup code: {reservation['pickup_code']}")
        
        # Get my reservations
        resp = requests.get(f"{BASE_URL}/reservations/", headers=headers)
        reservations = resp.json()
        print(f"    ✅ You have {len(reservations)} reservation(s)")

def test_health():
    """Test API is running"""
    print("\n💓 Testing API Health...")
    try:
        resp = requests.get(f"{BASE_URL}/health")
        if resp.status_code == 200:
            print("    ✅ Backend is running and healthy")
            return True
    except requests.exceptions.ConnectionError:
        print("    ❌ Cannot connect to backend on http://localhost:8000")
        print("    Make sure to run: python -m uvicorn backend.main:app --reload")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  🧪 EXPIRY GO - API TEST SUITE")
    print("=" * 60)
    
    if not test_health():
        exit(1)
    
    try:
        # Test shop owner flow
        print("\n👨‍💼 Testing Shop Owner...")
        shop_email = random_email()
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": shop_email,
            "password": "testpass123",
            "name": "Test Shop Owner",
            "is_shop_owner": True
        })
        if resp.status_code not in (200, 201):
            print(f"    ❌ Register failed: {resp.status_code}")
            print(f"    Response: {resp.text}")
            raise Exception(f"Shop owner registration failed: {resp.text}")
        data = resp.json()
        if "access_token" not in data:
            print(f"    ❌ Response missing access_token")
            print(f"    Response: {data}")
            raise Exception(f"Response missing access_token: {data}")
        shop_token = data["access_token"]
        print("    ✅ Shop owner registered")
        
        # Test customer flow
        customer_token = test_auth()
        test_shop_flow(customer_token, is_shop_owner=False)
        test_reservation_flow(customer_token)
        
        print("\n" + "=" * 60)
        print("  ✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\n🎉 Your API is working perfectly and ready to deploy!")
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        exit(1)
