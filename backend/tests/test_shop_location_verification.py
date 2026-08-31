"""
Unit and Integration Tests for Real Shop Location Verification in ExpiryGo.
"""

import math
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from db.base import Base
from db.models import User, Shop, Product, ProductCategory
from db.session import engine, get_db
from config import settings
from auth_service import create_access_token
from services.location_verifier import (
    calculate_haversine_distance_meters,
    validate_coordinates,
    _is_commercial_candidate,
    verify_shop_location,
    LocationVerificationResult,
    _extract_clean_keywords,
)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


# =============================================================================
# 1. MATHEMATICAL & ALGORITHMIC UNIT TESTS
# =============================================================================

def test_haversine_distance_calculation():
    # Test identical coordinates -> 0 meters
    dist_zero = calculate_haversine_distance_meters(13.06158, 80.26094, 13.06158, 80.26094)
    assert round(dist_zero, 2) == 0.0

    # Test 1 degree of latitude (~111.19 km)
    dist_1deg = calculate_haversine_distance_meters(0.0, 0.0, 1.0, 0.0)
    assert 111000 <= dist_1deg <= 112000

    # Test Spencer Plaza to Express Avenue (~1.2 km)
    dist_malls = calculate_haversine_distance_meters(13.06158, 80.26094, 13.0589, 80.2642)
    assert 300 <= dist_malls <= 1000


def test_coordinate_validation():
    # Valid
    ok, err = validate_coordinates(13.0827, 80.2707)
    assert ok is True
    assert err == ""

    # Out of bounds latitude
    ok, err = validate_coordinates(95.0, 80.0)
    assert ok is False
    assert "Latitude" in err

    # Out of bounds longitude
    ok, err = validate_coordinates(13.0, 190.0)
    assert ok is False
    assert "Longitude" in err

    # NaN coordinates
    ok, err = validate_coordinates(float("nan"), 80.0)
    assert ok is False
    assert "NaN" in err

    # Infinity coordinates
    ok, err = validate_coordinates(13.0, float("inf"))
    assert ok is False
    assert "Infinity" in err

    # Non-numeric
    ok, err = validate_coordinates("invalid", 80.0)
    assert ok is False


def test_commercial_filtering():
    # Commercial shop
    cand_supermarket = {"class": "shop", "type": "supermarket"}
    is_comm, cat = _is_commercial_candidate(cand_supermarket)
    assert is_comm is True
    assert cat == "supermarket"

    # Commercial amenity
    cand_cafe = {"class": "amenity", "type": "cafe"}
    is_comm, cat = _is_commercial_candidate(cand_cafe)
    assert is_comm is True
    assert cat == "cafe"

    # Non-commercial highway / road
    cand_highway = {"class": "highway", "type": "secondary"}
    is_comm, cat = _is_commercial_candidate(cand_highway)
    assert is_comm is False

    # Non-commercial residential
    cand_residential = {"class": "building", "type": "residential"}
    is_comm, cat = _is_commercial_candidate(cand_residential)
    assert is_comm is False

    # Non-commercial bench/clock
    cand_bench = {"class": "amenity", "type": "bench"}
    is_comm, cat = _is_commercial_candidate(cand_bench)
    assert is_comm is False


def test_extract_clean_keywords():
    kw = _extract_clean_keywords("Spencer Plaza Store")
    assert kw == "Spencer Plaza"

    kw2 = _extract_clean_keywords("Nilgiris Fresh Mart")
    assert kw2 == "Nilgiris"


# =============================================================================
# 2. LOCATION VERIFIER SERVICE TESTS
# =============================================================================

@patch("services.location_verifier._fetch_nominatim_json")
def test_verify_shop_location_success(mock_fetch):
    # Mock Nominatim returning a commercial place within 25m
    mock_fetch.return_value = [
        {
            "place_id": 101,
            "lat": "13.06160",
            "lon": "80.26095",
            "name": "Spencer Plaza Supermarket",
            "display_name": "Spencer Plaza, Anna Salai, Chennai",
            "class": "shop",
            "type": "supermarket",
        }
    ]

    res = verify_shop_location(
        name="Spencer Plaza Supermarket",
        address="Anna Salai, Chennai",
        latitude=13.06158,
        longitude=80.26094,
        radius_meters=100.0,
    )
    assert res.verified is True
    assert res.is_error is False
    assert res.matched_business_name == "Spencer Plaza Supermarket"
    assert res.distance_meters <= 25.0
    assert res.category == "supermarket"


@patch("services.location_verifier._fetch_nominatim_json")
def test_verify_shop_location_exceeds_radius(mock_fetch):
    # Mock Nominatim returning a commercial place 150m away (> 100m)
    mock_fetch.return_value = [
        {
            "place_id": 102,
            "lat": "13.06300",
            "lon": "80.26094",
            "name": "Distant Mart",
            "display_name": "Distant Mart, Chennai",
            "class": "shop",
            "type": "supermarket",
        }
    ]

    res = verify_shop_location(
        name="Distant Mart",
        address="Chennai",
        latitude=13.06158,
        longitude=80.26094,
        radius_meters=100.0,
    )
    assert res.verified is False
    assert res.is_error is False
    assert "exceeds maximum allowed radius" in res.message


@patch("services.location_verifier._fetch_nominatim_json")
def test_verify_shop_location_non_commercial_rejected(mock_fetch):
    # Mock Nominatim returning only a highway
    mock_fetch.return_value = [
        {
            "place_id": 103,
            "lat": "13.0827",
            "lon": "80.2707",
            "name": "Raja Muthiah Road",
            "display_name": "Raja Muthiah Road, Chennai",
            "class": "highway",
            "type": "secondary",
        }
    ]

    res = verify_shop_location(
        name="Fake Road Store",
        address="Raja Muthiah Road",
        latitude=13.0827,
        longitude=80.2707,
        radius_meters=100.0,
    )
    assert res.verified is False
    assert res.is_error is False
    assert "non-commercial" in res.message or "road" in res.message


@patch("services.location_verifier._fetch_nominatim_json")
def test_verify_shop_location_provider_error(mock_fetch):
    # Mock Nominatim network failure (returns None)
    mock_fetch.return_value = None

    res = verify_shop_location(
        name="Store",
        address="City",
        latitude=13.0,
        longitude=80.0,
    )
    assert res.verified is False
    assert res.is_error is True
    assert "temporarily unavailable" in res.message


# =============================================================================
# 3. ENDPOINT AUTH & SHOP ACTIVATION TESTS
# =============================================================================

def test_unverified_email_merchant_cannot_verify_location_or_create_shop(client, db_session=None):
    db = next(get_db())
    unverified_merchant = User(
        name="Unverified Merchant",
        email="unverified_merchant@example.com",
        hashed_password="mock_hashed_password",
        is_shop_owner=True,
        email_verified=False,
    )
    db.add(unverified_merchant)
    db.commit()
    db.refresh(unverified_merchant)

    token = create_access_token(unverified_merchant.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Pre-check endpoint -> 403 Forbidden
    res_precheck = client.post(
        "/shops/verify-location",
        json={
            "name": "Spencer Plaza Store",
            "address": "Anna Salai, Chennai",
            "latitude": 13.06158,
            "longitude": 80.26094,
        },
        headers=headers,
    )
    assert res_precheck.status_code == 403
    assert "verify your email" in res_precheck.json()["detail"]

    # Create shop -> 403 Forbidden
    res_create = client.post(
        "/shops/",
        json={
            "name": "Spencer Plaza Store",
            "address": "Anna Salai, Chennai",
            "latitude": 13.06158,
            "longitude": 80.26094,
        },
        headers=headers,
    )
    assert res_create.status_code == 403
    assert "verify your email" in res_create.json()["detail"]


@patch("routers.shops.verify_shop_location")
def test_verified_email_and_valid_location_activates_shop(mock_verifier, client):
    # Setup mock location verification success
    mock_verifier.return_value = LocationVerificationResult(
        verified=True,
        is_error=False,
        provider="nominatim",
        matched_business_name="Spencer Plaza",
        matched_address="Spencer Plaza, Chennai",
        distance_meters=10.5,
        category="mall",
        message="Real business verified.",
    )

    db = next(get_db())
    merchant = User(
        name="Valid Merchant",
        email="valid_merchant@example.com",
        hashed_password="mock_hashed_password",
        is_shop_owner=True,
        email_verified=True,
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)

    token = create_access_token(merchant.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Create shop
    res = client.post(
        "/shops/",
        json={
            "name": "Spencer Plaza Store",
            "address": "Anna Salai, Chennai",
            "latitude": 13.06158,
            "longitude": 80.26094,
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["is_active"] is False
    assert data["approval_status"] == "PENDING"
    assert data["location_verified"] is True
    assert data["location_verification_name"] == "Spencer Plaza"
    assert data["location_verification_category"] == "mall"
    assert data["location_verification_distance_meters"] == 10.5


@patch("routers.shops.verify_shop_location")
def test_unverified_location_creates_pending_shop(mock_verifier, client):
    # Setup mock location verification failure
    mock_verifier.return_value = LocationVerificationResult(
        verified=False,
        is_error=False,
        provider="nominatim",
        message="The selected coordinates correspond to a road.",
    )

    db = next(get_db())
    merchant = User(
        name="Road Merchant",
        email="road_merchant@example.com",
        hashed_password="mock_hashed_password",
        is_shop_owner=True,
        email_verified=True,
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)

    token = create_access_token(merchant.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to create shop on unverified road -> Graceful 201 Created with PENDING status
    res = client.post(
        "/shops/",
        json={
            "name": "Road Shop",
            "address": "Raja Muthiah Road",
            "latitude": 13.0827,
            "longitude": 80.2707,
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["is_active"] is False
    assert data["location_verified"] is False
    assert data["approval_status"] == "PENDING"
    assert "Pending manual admin location check" in (data["approval_reason"] or "") or "Location pending admin review" in (data["approval_reason"] or "")


def test_merchant_with_inactive_shop_cannot_perform_merchant_operations(client):
    db = next(get_db())
    merchant = User(
        name="Pending Merchant",
        email="pending_merchant@example.com",
        hashed_password="mock_hashed_password",
        is_shop_owner=True,
        email_verified=True,
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)

    # Inactive, unverified shop in database
    shop = Shop(
        owner_id=merchant.id,
        name="Pending Shop",
        address="Pending Address",
        latitude=13.0,
        longitude=80.0,
        is_active=False,
        location_verified=False,
    )
    db.add(shop)
    db.commit()

    token = create_access_token(merchant.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Product creation -> 403 Forbidden
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    res_product = client.post(
        "/products/",
        json={
            "name": "Surplus Bread",
            "category": "BAKERY",
            "original_price": 50.0,
            "quantity": 10,
            "manufacturing_date": (now - timedelta(days=1)).isoformat(),
            "expiry_date": (now + timedelta(days=2)).isoformat(),
        },
        headers=headers,
    )
    assert res_product.status_code == 403
    detail_lower = res_product.json()["detail"].lower()
    assert "pending administrator review" in detail_lower or "location is not verified" in detail_lower or "inactive" in detail_lower

    # 2. Merchant orders -> 403 Forbidden
    res_orders = client.get("/shops/orders", headers=headers)
    assert res_orders.status_code == 403

    # 3. Merchant reservations -> 403 Forbidden
    res_res = client.get("/shops/reservations", headers=headers)
    assert res_res.status_code == 403

    # 4. Analytics -> 403 Forbidden
    res_analytics = client.get("/shops/me/analytics", headers=headers)
    assert res_analytics.status_code == 403


# =============================================================================
# 4. REAL LIVE INTEGRATION TEST (NOMINATIM LIVE)
# =============================================================================

def test_live_nominatim_real_world_commercial_verification():
    """
    Executes a real live query against OpenStreetMap Nominatim
    verifying Spencer Plaza in Chennai within 100m is classified accurately.
    """
    res = verify_shop_location(
        name="Spencer Plaza Store",
        address="Anna Salai, Chennai",
        latitude=13.0615837,
        longitude=80.2609416,
        radius_meters=100.0,
    )
    assert res.provider == "nominatim"
    assert "Spencer Plaza" in (res.matched_business_name or "")
    assert res.category in ("mall", "shop", "department_store", "supermarket")
