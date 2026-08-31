"""API tests with in-memory SQLite."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from db.base import Base
from db.models import Product, Shop, User  # noqa: F401
from db.session import engine, get_db


def verify_user(email: str):
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.email_verified = True
            user.role = "SHOPKEEPER" if user.is_shop_owner else "CUSTOMER"
            shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
            if shop:
                shop.location_verified = True
                shop.approval_status = "APPROVED"
                shop.is_active = True
            db.commit()
    finally:
        db.close()


def approve_user_shop(email: str):
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
            if shop:
                shop.location_verified = True
                shop.approval_status = "APPROVED"
                shop.is_active = True
                db.commit()
    finally:
        db.close()


from unittest.mock import patch
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
            matched_address="Test Commercial Address",
            distance_meters=0.0,
            category="supermarket",
            message="Verified test location.",
        )
        yield


@pytest.fixture
def client() -> TestClient:
    from main import app

    with TestClient(app) as test_client:
        yield test_client



def test_register_login_and_me(client: TestClient):
    reg = client.post(
        "/auth/register",
        json={
            "email": "owner@test.com",
            "password": "secret123",
            "name": "Test Owner",
            "is_shop_owner": True,
        },
    )
    assert reg.status_code in [200, 201], reg.text
    token = reg.json()["access_token"]
    assert reg.json()["user"]["is_shop_owner"] is True

    me = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "owner@test.com"

    # 1. Unverified user password login must strictly return 403 Forbidden
    login_unverified = client.post(
        "/auth/login",
        json={"email": "owner@test.com", "password": "secret123"},
    )
    assert login_unverified.status_code == 403
    assert "not verified" in login_unverified.json()["detail"].lower()

    # 2. Once verified, password login succeeds with 200 OK
    verify_user("owner@test.com")
    login_verified = client.post(
        "/auth/login",
        json={"email": "owner@test.com", "password": "secret123"},
    )
    assert login_verified.status_code == 200
    assert login_verified.json()["access_token"]


def test_shop_and_product_flow(client: TestClient):
    reg = client.post(
        "/auth/register",
        json={
            "email": "shop@test.com",
            "password": "pass1234",
            "name": "Shop User",
            "is_shop_owner": True,
        },
    )
    verify_user("shop@test.com")
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    shop = client.post(
        "/shops/",
        headers=headers,
        json={
            "name": "Test Market",
            "address": "1 High St",
            "latitude": 12.97,
            "longitude": 77.59,
            "description": "Demo",
        },
    )
    assert shop.status_code in [200, 201], shop.text
    shop_id = shop.json()["id"]
    approve_user_shop("shop@test.com")

    product = client.post(
        "/products/",
        headers=headers,
        json={
            "name": "Bananas",
            "original_price": 100,
            "manufacturing_date": "2024-01-01T00:00:00",
            "quantity": 5,
            "expiry_date": "2030-01-01T12:00:00",
            "category": "PRODUCE",
            "front_image_url": "https://via.placeholder.com/300x300?text=Banana+Front",
            "expiry_image_url": "https://via.placeholder.com/300x300?text=Banana+Expiry",
            "description": "Sweet bananas",
        },
    )
    assert product.status_code in [200, 201], product.text
    assert product.json()["shop_id"] == shop_id
    assert product.json()["description"] == "Sweet bananas"
    assert "discount_price" in product.json()  # Verify discount was calculated

    public = client.get("/products/")
    assert public.status_code == 200
    assert len(public.json()) >= 1


def test_products_require_auth_to_create(client: TestClient):
    res = client.post(
        "/products/",
        json={
            "name": "X",
            "original_price": 1,
            "manufacturing_date": "2024-01-01T00:00:00",
            "quantity": 1,
            "expiry_date": "2030-01-01T12:00:00",
            "category": "OTHER",
            "front_image_url": "a",
            "expiry_image_url": "b",
        },
    )
    assert res.status_code == 401


def test_product_discount_calculation(client: TestClient):
    reg = client.post(
        "/auth/register",
        json={
            "email": "shop_discount@test.com",
            "password": "pass1234",
            "name": "Shop User Discount",
            "is_shop_owner": True,
        },
    )
    verify_user("shop_discount@test.com")
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/shops/",
        headers=headers,
        json={
            "name": "Discount Market",
            "address": "2 High St",
            "latitude": 12.97,
            "longitude": 77.59,
            "description": "Demo",
        },
    )
    approve_user_shop("shop_discount@test.com")

    from datetime import datetime, timedelta

    # Fair-pricing tiers (see _calculate_automatic_discount):
    #   <=1 day / <=12h -> 40% off, 2-3 days -> 30% off, 4-7 days -> 20% off, 8+ days -> 15% off

    # 1. Expiry in 2 days -> 30% off -> 100 * 0.70 = 70.0
    expiry_2d = (datetime.now() + timedelta(days=2)).isoformat()
    p1 = client.post(
        "/products/",
        headers=headers,
        json={
            "name": "Milk 2 Days Left",
            "original_price": 100,
            "manufacturing_date": "2026-01-01T00:00:00",
            "quantity": 5,
            "expiry_date": expiry_2d,
            "category": "DAIRY",
            "front_image_url": "https://via.placeholder.com/300x300?text=Milk+Front",
            "expiry_image_url": "https://via.placeholder.com/300x300?text=Milk+Expiry",
            "description": "Milk expiring soon",
        },
    )
    assert p1.status_code in [200, 201], p1.text
    assert p1.json()["discount_price"] == 70.0
    assert p1.json()["description"] == "Milk expiring soon"

    # 2. Expiry in 5 days -> 20% off -> 100 * 0.80 = 80.0
    expiry_5d = (datetime.now() + timedelta(days=5)).isoformat()
    p2 = client.post(
        "/products/",
        headers=headers,
        json={
            "name": "Milk 5 Days Left",
            "original_price": 100,
            "manufacturing_date": "2026-01-01T00:00:00",
            "quantity": 5,
            "expiry_date": expiry_5d,
            "category": "DAIRY",
            "front_image_url": "https://via.placeholder.com/300x300?text=Milk+Front",
            "expiry_image_url": "https://via.placeholder.com/300x300?text=Milk+Expiry",
        },
    )
    assert p2.status_code in [200, 201], p2.text
    assert p2.json()["discount_price"] == 80.0
    assert p2.json()["description"] is None

    # 3. Expiry in 9 days -> 15% off -> 100 * 0.85 = 85.0
    expiry_9d = (datetime.now() + timedelta(days=9)).isoformat()
    p3 = client.post(
        "/products/",
        headers=headers,
        json={
            "name": "Milk 9 Days Left",
            "original_price": 100,
            "manufacturing_date": "2026-01-01T00:00:00",
            "quantity": 5,
            "expiry_date": expiry_9d,
            "category": "DAIRY",
            "front_image_url": "https://via.placeholder.com/300x300?text=Milk+Front",
            "expiry_image_url": "https://via.placeholder.com/300x300?text=Milk+Expiry",
        },
    )
    assert p3.status_code in [200, 201], p3.text
    assert p3.json()["discount_price"] == 85.0


def test_product_optimization(client: TestClient):
    reg = client.post(
        "/auth/register",
        json={
            "email": "opt_owner@test.com",
            "password": "pass1234",
            "name": "Opt Owner",
            "is_shop_owner": True,
        },
    )
    verify_user("opt_owner@test.com")
    assert reg.status_code in [200, 201], reg.text
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/shops/",
        headers=headers,
        json={
            "name": "Opt Store",
            "address": "123 Opt Road",
            "latitude": 13.0,
            "longitude": 80.0,
        },
    )
    approve_user_shop("opt_owner@test.com")

    opt = client.post(
        "/products/optimize",
        headers=headers,
        json={
            "name": "Organic Milk 1L",
            "mfg_date": "2026-05-01",
            "expiry_date": "2026-06-02",
            "original_price": 120.0,
            "quantity": 3
        }
    )
    assert opt.status_code in [200, 201], opt.text
    data = opt.json()
    assert "suggested_description" in data
    assert "suggested_discount_tier" in data
    assert "confidence_score" in data
    # Fair-pricing optimizer tiers: <=2 days -> 35%, <=6 days -> 25%, else 15%
    assert data["suggested_discount_percent"] in [15, 25, 35]


def test_order_flow(client: TestClient):
    # Register customer
    reg_cust = client.post(
        "/auth/register",
        json={
            "email": "cust_order_unique@test.com",
            "password": "customerpass",
            "name": "Customer User",
            "is_shop_owner": False,
        },
    )
    assert reg_cust.status_code in [200, 201], reg_cust.text
    verify_user("cust_order_unique@test.com")
    cust_token = reg_cust.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # Register shopkeeper
    reg_shop = client.post(
        "/auth/register",
        json={
            "email": "shop_owner_order_unique@test.com",
            "password": "shopownerpass",
            "name": "Shop Owner Order",
            "is_shop_owner": True,
        },
    )
    assert reg_shop.status_code in [200, 201], reg_shop.text
    verify_user("shop_owner_order_unique@test.com")
    shop_token = reg_shop.json()["access_token"]
    shop_headers = {"Authorization": f"Bearer {shop_token}"}

    # Create Shop
    shop = client.post(
        "/shops/",
        headers=shop_headers,
        json={
            "name": "Order Test Market",
            "address": "123 Order Way",
            "latitude": 12.97,
            "longitude": 77.59,
            "description": "Shop for Order testing",
        },
    )
    assert shop.status_code in [200, 201], shop.text
    shop_id = shop.json()["id"]
    approve_user_shop("shop_owner_order_unique@test.com")

    # Create Product
    product = client.post(
        "/products/",
        headers=shop_headers,
        json={
            "name": "Apples",
            "original_price": 200.0,
            "manufacturing_date": "2026-05-01T00:00:00",
            "quantity": 10,
            "expiry_date": "2030-06-10T00:00:00",
            "category": "PRODUCE",
            "front_image_url": "https://via.placeholder.com/300x300?text=Apples+Front",
            "expiry_image_url": "https://via.placeholder.com/300x300?text=Apples+Expiry",
            "description": "Fresh apples",
        },
    )
    assert product.status_code in [200, 201]
    prod_id = product.json()["id"]

    # 1. Create Pickup Order (Stock should remain 10 before confirmation)
    ord1 = client.post(
        "/orders/",
        headers=cust_headers,
        json={
            "product_id": prod_id,
            "order_type": "PICKUP",
            "quantity": 2,
        }
    )
    assert ord1.status_code in [200, 201], ord1.text
    ord1_id = ord1.json()["id"]
    assert ord1.json()["status"] == "PENDING"
    assert ord1.json()["order_type"] == "PICKUP"
    assert ord1.json()["delivery_fee"] == 0.0

    # Stock check - should still be 10
    prod_db = client.get(f"/products/")
    prod_obj = next(p for p in prod_db.json() if p["id"] == prod_id)
    assert prod_obj["quantity"] == 10

    # 2. Shopkeeper accepts Pickup Order -> stock reduces to 8
    accept_res = client.patch(
        f"/orders/{ord1_id}/status",
        headers=shop_headers,
        json={"status": "ACCEPTED"}
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"

    # Stock check - should be 8 now
    prod_db = client.get(f"/products/")
    prod_obj = next(p for p in prod_db.json() if p["id"] == prod_id)
    assert prod_obj["quantity"] == 8

    # 3. Create Delivery Order with quantity 3
    ord2 = client.post(
        "/orders/",
        headers=cust_headers,
        json={
            "product_id": prod_id,
            "order_type": "DELIVERY",
            "quantity": 3,
            "delivery_fee": 45.0,
            "customer_name": "John Doe",
            "customer_phone": "9876543210",
            "delivery_address": "456 Lane, City",
        }
    )
    assert ord2.status_code in [200, 201]
    ord2_id = ord2.json()["id"]
    assert ord2.json()["status"] == "PENDING"
    assert ord2.json()["order_type"] == "DELIVERY"
    assert ord2.json()["delivery_fee"] == 45.0
    assert ord2.json()["customer_name"] == "John Doe"
    assert ord2.json()["customer_phone"] == "9876543210"
    assert ord2.json()["delivery_address"] == "456 Lane, City"

    # 4. Try to update status of PICKUP order to OUT_FOR_DELIVERY -> Should fail (400)
    invalid_transition = client.patch(
        f"/orders/{ord1_id}/status",
        headers=shop_headers,
        json={"status": "OUT_FOR_DELIVERY"}
    )
    assert invalid_transition.status_code == 400

    # 5. Shopkeeper accepts Delivery Order -> stock reduces from 8 to 5
    accept_res2 = client.patch(
        f"/orders/{ord2_id}/status",
        headers=shop_headers,
        json={"status": "ACCEPTED"}
    )
    assert accept_res2.status_code == 200
    assert accept_res2.json()["status"] == "ACCEPTED"

    # Stock check - should be 5 now
    prod_db = client.get(f"/products/")
    prod_obj = next(p for p in prod_db.json() if p["id"] == prod_id)
    assert prod_obj["quantity"] == 5

    # 6. Shopkeeper updates Delivery Order to OUT_FOR_DELIVERY -> SUCCESS
    out_res = client.patch(
        f"/orders/{ord2_id}/status",
        headers=shop_headers,
        json={"status": "OUT_FOR_DELIVERY"}
    )
    assert out_res.status_code == 200
    assert out_res.json()["status"] == "OUT_FOR_DELIVERY"

    # 7. Shopkeeper updates Delivery Order to DELIVERED -> SUCCESS
    delivered_res = client.patch(
        f"/orders/{ord2_id}/status",
        headers=shop_headers,
        json={"status": "DELIVERED"}
    )
    assert delivered_res.status_code == 200
    assert delivered_res.json()["status"] == "DELIVERED"
    assert delivered_res.json()["completed_at"] is not None

    # 8. Check my orders (customer view)
    my_orders = client.get("/orders/me", headers=cust_headers)
    assert my_orders.status_code == 200
    assert len(my_orders.json()) == 2

    # 9. Check shop orders (shopkeeper view)
    shop_orders = client.get("/shops/orders", headers=shop_headers)
    assert shop_orders.status_code == 200
    assert len(shop_orders.json()) == 2

    # 10. Customer places another order and cancels it
    ord3 = client.post(
        "/orders/",
        headers=cust_headers,
        json={
            "product_id": prod_id,
            "order_type": "PICKUP",
            "quantity": 1,
        }
    )
    assert ord3.status_code in [200, 201]
    ord3_id = ord3.json()["id"]

    # Customer cancels ord3 -> SUCCESS
    cancel_res = client.post(
        f"/orders/{ord3_id}/cancel",
        headers=cust_headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Customer tries to cancel already cancelled order -> FAILS (400)
    cancel_res_again = client.post(
        f"/orders/{ord3_id}/cancel",
        headers=cust_headers,
    )
    assert cancel_res_again.status_code == 400

    # 11. Customer cannot cancel an accepted or delivered order
    ord4 = client.post(
        "/orders/",
        headers=cust_headers,
        json={
            "product_id": prod_id,
            "order_type": "PICKUP",
            "quantity": 1,
        }
    )
    assert ord4.status_code in [200, 201]
    ord4_id = ord4.json()["id"]

    # Shopkeeper accepts ord4 -> SUCCESS
    accept_ord4 = client.patch(
        f"/orders/{ord4_id}/status",
        headers=shop_headers,
        json={"status": "ACCEPTED"}
    )
    assert accept_ord4.status_code == 200
    assert accept_ord4.json()["status"] == "ACCEPTED"

    # Customer tries to cancel accepted ord4 -> FAILS (400)
    cancel_accepted = client.post(
        f"/orders/{ord4_id}/cancel",
        headers=cust_headers,
    )
    assert cancel_accepted.status_code == 400

    # Customer tries to cancel another customer's order
    reg_cust2 = client.post(
        "/auth/register",
        json={
            "email": "customer2@test.com",
            "password": "customerpass",
            "name": "Customer User 2",
            "is_shop_owner": False,
        },
    )
    cust2_token = reg_cust2.json()["access_token"]
    cust2_headers = {"Authorization": f"Bearer {cust2_token}"}

    cancel_other = client.post(
        f"/orders/{ord1_id}/cancel",
        headers=cust2_headers,
    )
    assert cancel_other.status_code == 404


def test_product_ai_forecast(client: TestClient):
    # 1. Register shopkeeper
    reg_shop = client.post(
        "/auth/register",
        json={
            "email": "ai_test_owner@test.com",
            "password": "ownerpass123",
            "name": "AI Owner",
            "is_shop_owner": True,
        },
    )
    verify_user("ai_test_owner@test.com")
    assert reg_shop.status_code in [200, 201], reg_shop.text
    token = reg_shop.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Shop
    shop = client.post(
        "/shops/",
        headers=headers,
        json={
            "name": "AI Intelligent Market",
            "address": "100 AI Lane",
            "latitude": 12.97,
            "longitude": 77.59,
            "description": "Store featuring AI intelligence testing",
        },
    )
    assert shop.status_code in [200, 201], shop.text
    shop_id = shop.json()["id"]
    approve_user_shop("ai_test_owner@test.com")

    # 3. Create Product
    product = client.post(
        "/products/",
        headers=headers,
        json={
            "name": "AI Sample Yogurt",
            "original_price": 120.0,
            "manufacturing_date": "2026-05-01T00:00:00",
            "quantity": 12,
            "expiry_date": "2030-06-10T00:00:00",
            "category": "DAIRY",
            "front_image_url": "https://via.placeholder.com/300x300?text=Yogurt+Front",
            "expiry_image_url": "https://via.placeholder.com/300x300?text=Yogurt+Expiry",
            "description": "Creamy strawberry yogurt",
        },
    )
    assert product.status_code in [200, 201], product.text
    product_id = product.json()["id"]

    # 4. Call Forecast endpoint
    forecast_res = client.get(
        f"/products/{product_id}/forecast",
        headers=headers,
    )
    assert forecast_res.status_code == 200, forecast_res.text
    data = forecast_res.json()

    # 5. Assert all required fields
    assert "rescue_probability" in data
    assert "rescue_confidence_tier" in data
    assert data["rescue_confidence_tier"] in ["Low", "Medium", "High"]
    
    assert "predicted_demand_24h" in data
    assert isinstance(data["predicted_demand_24h"], (int, float))
    
    assert "predicted_orders_trend" in data
    assert isinstance(data["predicted_orders_trend"], list)
    for pt in data["predicted_orders_trend"]:
        assert "hour" in pt
        assert "demand" in pt
        
    assert "optimal_discount_percent" in data
    assert isinstance(data["optimal_discount_percent"], int)
    
    assert "optimal_price" in data
    assert isinstance(data["optimal_price"], (int, float))
    
    assert "pricing_explanation" in data
    assert len(data["pricing_explanation"]) > 0
    
    assert "spoilage_risk_score" in data
    assert data["spoilage_risk_score"] in ["Low", "Medium", "High"]
    
    assert "explainability" in data
    exp = data["explainability"]
    assert "days_left_impact" in exp
    assert "stock_impact" in exp
    assert "discount_impact" in exp
    assert "category_demand_impact" in exp
    
    assert "sellout_hours" in data
    assert "model_confidence" in data


def test_ai_inventory_intelligence(client: TestClient):
    # 1. Register shopkeeper
    reg_shop = client.post(
        "/auth/register",
        json={
            "email": "ai_intelligence_owner@test.com",
            "password": "ownerpass123",
            "name": "AI Intelligence Owner",
            "is_shop_owner": True,
        },
    )
    verify_user("ai_intelligence_owner@test.com")
    assert reg_shop.status_code in [200, 201], reg_shop.text
    token = reg_shop.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Shop
    shop = client.post(
        "/shops/",
        headers=headers,
        json={
            "name": "AI Waste Intelligence Store",
            "address": "200 Smart Ave",
            "latitude": 12.97,
            "longitude": 77.59,
            "description": "Store featuring AI intelligence testing",
        },
    )
    assert shop.status_code in [200, 201], shop.text
    approve_user_shop("ai_intelligence_owner@test.com")

    # 3. Create Product
    product = client.post(
        "/products/",
        headers=headers,
        json={
            "name": "AI Intelligent Milk",
            "original_price": 80.0,
            "manufacturing_date": "2026-05-01T00:00:00",
            "quantity": 10,
            "expiry_date": "2030-06-05T00:00:00",
            "category": "DAIRY",
            "front_image_url": "https://via.placeholder.com/300x300?text=Milk+Front",
            "expiry_image_url": "https://via.placeholder.com/300x300?text=Milk+Expiry",
            "description": "Organic fresh milk",
        },
    )
    assert product.status_code in [200, 201], product.text
    product_id = product.json()["id"]

    # 4. Call product ai-insight endpoint
    insight_res = client.get(
        f"/products/{product_id}/ai-insight",
        headers=headers,
    )
    assert insight_res.status_code == 200, insight_res.text
    data = insight_res.json()
    assert "rescue_probability" in data
    assert "demand_score" in data
    assert isinstance(data["demand_score"], (int, float))
    assert "spoilage_risk_score" in data
    assert data["spoilage_risk_score"] in ["Low", "Medium", "High"]
    assert "sellout_hours" in data
    assert "optimal_price" in data
    assert "explainability" in data
    assert "days_left_impact" in data["explainability"]

    # 5. Call shop-wide analytics ai-inventory endpoint
    inventory_res = client.get(
        "/shops/me/analytics/ai-inventory",
        headers=headers,
    )
    assert inventory_res.status_code == 200, inventory_res.text
    agg = inventory_res.json()
    assert "average_rescue_probability" in agg
    assert isinstance(agg["average_rescue_probability"], (int, float))
    assert "risk_counts" in agg
    assert "Low" in agg["risk_counts"]
    assert "Medium" in agg["risk_counts"]
    assert "High" in agg["risk_counts"]
    assert "total_recovered_revenue" in agg
    assert "co2_saved_kg" in agg
    assert "water_saved_liters" in agg
    assert "items_rescued" in agg
    assert "predicted_sellout_within_24h" in agg





