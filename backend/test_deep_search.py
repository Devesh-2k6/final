import sys
from fastapi.testclient import TestClient
from main import app
from db.session import init_db
from seed_data import seed_database

def run_tests():
    init_db()
    seed_database()

    with TestClient(app) as client:
        # 1. Search for 'bread' (matches seeded items like 'Whole Wheat Bread' or 'Surplus Croissant')
        print("--- 1. Testing standard deep search for 'bread' ---")
        res = client.get("/products/search/deep?q=bread")
        print(f"Status Code: {res.status_code}")
        data = res.json()
        print(f"Recipe Mode: {data.get('recipe_mode')}")
        products = data.get('products', [])
        print(f"Found {len(products)} products:")
        for p in products:
            print(f" - {p['name']} (Category: {p['category']}, Current Price: {p['current_price']})")
        
        # 2. Search with semantic query parsing (local fallback handles it if Gemini key is missing)
        print("\n--- 2. Testing semantic deep search for 'milk under 200' ---")
        res = client.get("/products/search/deep?q=milk under 200&semantic=true")
        print(f"Status Code: {res.status_code}")
        data = res.json()
        products = data.get('products', [])
        print(f"Found {len(products)} products:")
        for p in products:
            print(f" - {p['name']} (Category: {p['category']}, Price: {p['current_price']})")

        # 3. Search in Recipe Mode (e.g. "pasta" to match pasta ingredients)
        print("\n--- 3. Testing recipe mode search for 'sandwich' ---")
        res = client.get("/products/search/deep?q=sandwich&recipe_mode=true")
        print(f"Status Code: {res.status_code}")
        data = res.json()
        print(f"Recipe Mode: {data.get('recipe_mode')}")
        print(f"Recipe Name: {data.get('recipe_name')}")
        print(f"Matched Deals: {[p['name'] for p in data.get('matched_deals', [])]}")
        print(f"Missing Ingredients: {data.get('missing_ingredients')}")

if __name__ == "__main__":
    run_tests()

