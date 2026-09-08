"""
Production-grade Real Food-Shop Location Verification Service for ExpiryGo.
Uses OpenStreetMap / Nominatim to verify that a submitted shop location corresponds
to a legitimate commercial FOOD business entity (groceries, bakeries, dairies, produce,
restaurants, cafes) within the configured radius (default 100m).
Non-food businesses (electronics, clothing, furniture, banks, residential, roads) are rejected.
"""

import math
import time
import json
import logging
import threading
import urllib.request
import urllib.parse
import urllib.error
from dataclasses import dataclass
from typing import Optional, Any, List, Dict, Tuple

from config import settings

logger = logging.getLogger("expirygo.location_verifier")

# Earth radius in meters
EARTH_RADIUS_METERS = 6371000.0

# Supported Food Business Categories (OSM shop, amenity, craft, building values)
FOOD_BUSINESS_TYPES = {
    # Groceries, Supermarkets, Convenience Stores & Kiranas
    "supermarket", "grocery", "convenience", "general", "kiosk", "deli",
    "greengrocer", "department_store", "marketplace", "market", "food_court",
    "variety_store", "wholesale", "farm", "food", "packaged_food", "kirana", "provision",
    "hypermarket", "organic", "health_food", "bazaar", "provision_store", "store", "shop", "mall",
    # Bakeries, Pastries, Sweets, Desserts & Snacks
    "bakery", "pastry", "confectionery", "sweets", "sweet_shop", "sweet_stall", "ice_cream",
    "dessert", "cake", "snack", "chocolatier", "donuts", "bagel", "baker", "mithai", "mithai_shop",
    # Fresh Produce, Dairy, Meat & Fish
    "butcher", "seafood", "fishmonger", "dairy", "cheese", "milk", "fruit",
    "vegetables", "meat", "poultry", "fruit_stall", "vegetable_stall",
    # Beverages & Specialty Drinks
    "beverages", "tea", "tea_stall", "tea_shop", "coffee", "coffee_shop", "juice", "juice_bar", "juice_stall", "wine", "beer", "alcohol", "liquor",
    # Prepared Food, Dining, Cafeteria & Takeaway
    "cafeteria", "canteen", "cafe", "restaurant", "fast_food", "takeaway", "bistro", "pub", "bar",
    "food_truck", "food_stall", "eatery", "diner", "pizzeria", "sandwich", "dhaba", "mess", "hotel",
    "kitchen", "cloud_kitchen", "commercial", "tiffin", "parlour", "parlor", "drive_in",
}


# Explicit Non-Food Commercial Categories that MUST be rejected for food marketplace
NON_FOOD_COMMERCIAL_TYPES = {
    # Electronics, Mobiles & Hardware
    "electronics", "mobile_phone", "computer", "hardware", "doityourself", "tools",
    "appliance", "electrical", "lighting", "paint", "trade",
    # Automotive, Fuel & Transport
    "car", "car_repair", "car_parts", "motorcycle", "bicycle", "fuel", "gas_station",
    "tyres", "mechanic", "car_wash", "rental",
    # Fashion, Accessories & Luxury
    "clothes", "shoes", "boutique", "fashion", "tailor", "jewelry", "jewellery", "watch",
    "optician", "bag", "leather", "cosmetics", "perfumery", "beauty", "hairdresser",
    "salon", "barber",
    # Home & Furnishing
    "furniture", "interior_decoration", "bed", "carpet", "curtain",
    # Financial, Office & Real Estate
    "bank", "atm", "insurance", "financial", "bureau_de_change", "money_transfer",
    "real_estate", "estate_agent", "coworking", "office", "lawyer", "accountant",
    # Medical & Professional
    "chemist", "pharmacy", "doctor", "dentist", "clinic", "hospital", "veterinary",
    "travel_agency", "laundry", "dry_cleaning", "funeral_directors",
    # Entertainment, Sports & Education
    "school", "university", "college", "kindergarten", "gym", "fitness_centre",
    "cinema", "theatre", "casino", "nightclub", "books", "stationery", "florist",
    "pet", "pet_grooming", "toys", "gift", "sports", "hobby", "musical_instrument",
}

# Non-Commercial & Infrastructure Map Nodes
NON_COMMERCIAL_TYPES = {
    "highway", "road", "street", "residential", "house", "building", "boundary",
    "natural", "waterway", "park", "bench", "clock", "parking", "parking_space",
    "place_of_worship", "administrative", "postcode", "suburb", "neighbourhood",
    "city", "state", "county", "country", "secondary", "primary", "trunk",
    "motorway", "track", "footway", "path", "service", "unclassified", "tertiary",
    "living_street", "pedestrian", "bus_stop", "forest", "wood", "grass", "tree",
    "pitch", "playground", "toilets", "waste_basket", "shelter",
}

GENERIC_SHOP_SUFFIXES = {
    "store", "shop", "outlet", "branch", "mart", "center", "centre",
    "market", "point", "hub", "express", "supermarket", "bazaar",
    "grocers", "fresh", "'s", "s"
}

# Fast in-memory cache for location verification queries
_VERIFICATION_CACHE: Dict[str, tuple["LocationVerificationResult", float]] = {}
CACHE_TTL_SECONDS = 3600.0  # 1 hour


@dataclass
class LocationVerificationResult:
    verified: bool
    is_error: bool = False
    provider: str = "nominatim"
    matched_business_name: Optional[str] = None
    matched_address: Optional[str] = None
    distance_meters: Optional[float] = None
    category: Optional[str] = None
    message: str = ""

    def to_dict(self) -> dict:
        return {
            "verified": self.verified,
            "is_error": self.is_error,
            "provider": self.provider,
            "matched_business_name": self.matched_business_name,
            "matched_address": self.matched_address,
            "distance_meters": self.distance_meters,
            "category": self.category,
            "message": self.message,
        }


def calculate_haversine_distance_meters(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculates the geodesic distance between two points on Earth using the Haversine formula.
    Returns distance in meters.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def validate_coordinates(latitude: Any, longitude: Any) -> tuple[bool, str]:
    """Validates that coordinates are valid finite numbers within geographical bounds."""
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        return False, "Latitude and longitude must be valid numeric values."

    if math.isnan(lat) or math.isnan(lon) or math.isinf(lat) or math.isinf(lon):
        return False, "Coordinates cannot be NaN or Infinity."

    if not (-90.0 <= lat <= 90.0):
        return False, f"Latitude {lat} is out of bounds (must be between -90 and 90)."

    if not (-180.0 <= lon <= 180.0):
        return False, f"Longitude {lon} is out of bounds (must be between -180 and 180)."

    return True, ""


def _classify_candidate(item: dict) -> Tuple[str, Optional[str]]:
    """
    Classifies an OpenStreetMap / Nominatim node into:
    - ("FOOD", category_name) -> Valid food business
    - ("NON_FOOD_COMMERCIAL", category_name) -> Commercial business, but not food-related
    - ("NON_COMMERCIAL", None) -> Road, residential, park, or infrastructure node
    """
    item_class = str(item.get("class", "")).lower()
    item_type = str(item.get("type", "")).lower()
    address_type = str(item.get("addresstype", "")).lower()
    extratags = item.get("extratags", {}) or {}

    # Check extratags first for specific shop/amenity tags
    ext_shop = str(extratags.get("shop", "")).lower()
    ext_amenity = str(extratags.get("amenity", "")).lower()

    # 1. Direct Food Business Match
    for candidate_tag in (ext_shop, ext_amenity, item_type, address_type):
        if candidate_tag in FOOD_BUSINESS_TYPES:
            return "FOOD", candidate_tag

    # 2. Check if shop=* is a generic shop or class=shop with food tags
    if item_class in ("shop", "amenity", "commercial", "building") and item_type in FOOD_BUSINESS_TYPES:
        return "FOOD", item_type

    # 3. Check name or display_name for strong food indicator keywords
    display_str = (str(item.get("name", "")) + " " + str(item.get("display_name", ""))).lower()
    for food_kw in (
        "bakery", "sweet", "supermarket", "grocery", "cafe", "restaurant",
        "dairy", "produce", "market", "bazaar", "mart", "deli", "food", "cafeteria", "canteen"
    ):
        if food_kw in display_str:
            return "FOOD", food_kw

    # 4. Explicit Non-Food Commercial Check
    for candidate_tag in (ext_shop, ext_amenity, item_type, address_type):
        if candidate_tag in NON_FOOD_COMMERCIAL_TYPES:
            return "NON_FOOD_COMMERCIAL", candidate_tag

    if item_class in {"shop", "craft", "office", "tourism"} or (
        item_class == "amenity" and item_type not in NON_COMMERCIAL_TYPES
    ):
        return "NON_FOOD_COMMERCIAL", item_type or item_class

    # 5. Explicit Non-Commercial Check
    if item_class in NON_COMMERCIAL_TYPES or item_type in NON_COMMERCIAL_TYPES or address_type in NON_COMMERCIAL_TYPES:
        return "NON_COMMERCIAL", None

    return "NON_COMMERCIAL", None



def _is_commercial_candidate(item: dict) -> Tuple[bool, Optional[str]]:
    """Legacy helper maintained for backward compatibility with existing tests."""
    cls, cat = _classify_candidate(item)
    return (cls in ("FOOD", "NON_FOOD_COMMERCIAL")), cat


# Rate limit tracking for OpenStreetMap Nominatim usage policy (min 1.0s between requests)
_NOMINATIM_LOCK = threading.Lock()
_LAST_NOMINATIM_CALL_TIME = 0.0
NOMINATIM_MIN_INTERVAL_SECONDS = 1.0
DEFAULT_NOMINATIM_TIMEOUT_SECONDS = 2.5


def _fetch_nominatim_json(url: str, timeout: float = DEFAULT_NOMINATIM_TIMEOUT_SECONDS) -> Optional[Any]:
    """
    Fetches JSON data from Nominatim complying with OpenStreetMap Usage Policy:
    - Enforces mandatory minimum 1.0s throttle between consecutive HTTP requests.
    - Sends strict, identifiable User-Agent header.
    - Enforces hard 2.5s per-request timeout.
    - Gracefully catches socket/HTTP/timeout errors without crashing.
    """
    global _LAST_NOMINATIM_CALL_TIME

    with _NOMINATIM_LOCK:
        now = time.time()
        elapsed = now - _LAST_NOMINATIM_CALL_TIME
        if elapsed < NOMINATIM_MIN_INTERVAL_SECONDS:
            sleep_duration = NOMINATIM_MIN_INTERVAL_SECONDS - elapsed
            time.sleep(sleep_duration)
        _LAST_NOMINATIM_CALL_TIME = time.time()

    user_agent = settings.NOMINATIM_USER_AGENT or "ExpiryGo/1.0 (contact: support@expirygo.com)"
    logger.info(f"[NOMINATIM REQUEST] User-Agent: '{user_agent}' -> URL: {url}")

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": user_agent,
            "Accept": "application/json",
        },
    )
    try:
        effective_timeout = min(timeout, DEFAULT_NOMINATIM_TIMEOUT_SECONDS) if timeout else DEFAULT_NOMINATIM_TIMEOUT_SECONDS
        with urllib.request.urlopen(req, timeout=effective_timeout) as response:
            if response.status == 200:
                raw = response.read().decode("utf-8")
                return json.loads(raw)
            else:
                logger.warning(f"Nominatim returned non-200 status: {response.status}")
                return None
    except urllib.error.HTTPError as he:
        logger.warning(f"Nominatim HTTP error ({he.code}): {he.reason}")
        return None
    except urllib.error.URLError as ue:
        logger.warning(f"Nominatim URL/network error: {ue.reason}")
        return None
    except TimeoutError:
        logger.warning(f"Nominatim request timed out after {DEFAULT_NOMINATIM_TIMEOUT_SECONDS}s: {url}")
        return None
    except Exception as e:
        logger.warning(f"Nominatim unexpected request failure ({url}): {e}")
        return None


def _extract_clean_keywords(name: str) -> Optional[str]:
    """Strips generic suffix words to find core merchant name in OpenStreetMap."""
    words = name.split()
    filtered = [w for w in words if w.lower().strip("',.") not in GENERIC_SHOP_SUFFIXES]
    if filtered and len(filtered) < len(words):
        return " ".join(filtered)
    return None


def verify_shop_location(
    name: str,
    address: str,
    latitude: float,
    longitude: float,
    radius_meters: Optional[float] = None,
) -> LocationVerificationResult:
    """
    Verifies that the submitted shop coordinates correspond to a real commercial FOOD business on OpenStreetMap.
    """
    # 0. Check if verification is disabled via configuration
    if not settings.SHOP_LOCATION_VERIFICATION_ENABLED:
        return LocationVerificationResult(
            verified=True,
            provider="disabled",
            matched_business_name=name,
            matched_address=address,
            distance_meters=0.0,
            category="unverified_dev_override",
            message="Shop location verification is disabled via configuration.",
        )

    # 1. Validate coordinates
    valid_coords, coord_err = validate_coordinates(latitude, longitude)
    if not valid_coords:
        return LocationVerificationResult(
            verified=False,
            is_error=False,
            message=coord_err,
        )

    lat = float(latitude)
    lon = float(longitude)
    clean_name = (name or "").strip()
    clean_address = (address or "").strip()
    max_radius = radius_meters or settings.SHOP_LOCATION_RADIUS_METERS or 100.0

    # 2. Check in-memory cache to prevent redundant external API calls
    cache_key = f"{round(lat, 5)}:{round(lon, 5)}:{clean_name.lower()}:{clean_address.lower()}:{max_radius}"
    now_ts = time.time()
    if cache_key in _VERIFICATION_CACHE:
        cached_res, cached_time = _VERIFICATION_CACHE[cache_key]
        if now_ts - cached_time < CACHE_TTL_SECONDS:
            return cached_res

    base_url = settings.NOMINATIM_BASE_URL.rstrip("/")
    timeout = DEFAULT_NOMINATIM_TIMEOUT_SECONDS

    # 3. Gather candidates from Nominatim using focused query strategy with rate-throttling
    candidates: List[dict] = []
    seen_place_ids = set()
    any_request_succeeded = False

    def add_candidates(data: Any):
        nonlocal any_request_succeeded
        if data is not None:
            any_request_succeeded = True
        if isinstance(data, list):
            for item in data:
                pid = item.get("place_id")
                if pid and pid not in seen_place_ids:
                    seen_place_ids.add(pid)
                    candidates.append(item)
        elif isinstance(data, dict) and "place_id" in data:
            pid = data.get("place_id")
            if pid and pid not in seen_place_ids:
                seen_place_ids.add(pid)
                candidates.append(data)

    def has_food_candidate(cands: List[dict]) -> bool:
        for c in cands:
            c_class, _ = _classify_candidate(c)
            if c_class == "FOOD":
                return True
        return False

    # Strategy A: Reverse Geocoding at coordinates
    url_rev = f"{base_url}/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1&extratags=1"
    add_candidates(_fetch_nominatim_json(url_rev, timeout=timeout))

    # Strategy B: If reverse geocoding found no commercial food candidates, query by name & address
    if not has_food_candidate(candidates) and clean_name and clean_address:
        query_a = f"{clean_name}, {clean_address}"
        url_a = f"{base_url}/search?q={urllib.parse.quote(query_a)}&format=json&addressdetails=1&extratags=1&limit=5"
        add_candidates(_fetch_nominatim_json(url_a, timeout=timeout))

    # Strategy C: If still no food candidates, search with clean name or stripped core name
    if not has_food_candidate(candidates) and clean_name:
        core_name = _extract_clean_keywords(clean_name) or clean_name
        url_b = f"{base_url}/search?q={urllib.parse.quote(core_name)}&format=json&addressdetails=1&extratags=1&limit=5"
        add_candidates(_fetch_nominatim_json(url_b, timeout=timeout))

    # Handle provider outage or unreachable service gracefully
    if not any_request_succeeded:
        err_result = LocationVerificationResult(
            verified=False,
            is_error=True,
            message="Shop location verification service is temporarily unavailable. Submitted for admin manual review.",
        )
        return err_result

    if not candidates:
        no_result = LocationVerificationResult(
            verified=False,
            is_error=False,
            message="We could not verify a food business at this exact coordinate on OpenStreetMap. Submitted for administrator review.",
        )
        _VERIFICATION_CACHE[cache_key] = (no_result, now_ts)
        return no_result

    # 4. Evaluate candidates against Food Business classification and distance threshold
    valid_food_matches: List[dict] = []
    non_food_matches: List[dict] = []
    closest_food_dist = float("inf")
    closest_non_food_dist = float("inf")
    closest_non_commercial_dist = float("inf")

    name_tokens = {t.lower() for t in clean_name.replace(",", " ").split() if len(t) > 1}
    address_tokens = {t.lower() for t in clean_address.replace(",", " ").split() if len(t) > 1}

    for cand in candidates:
        try:
            cand_lat = float(cand.get("lat", 0.0))
            cand_lon = float(cand.get("lon", 0.0))
        except (ValueError, TypeError):
            continue

        distance = calculate_haversine_distance_meters(lat, lon, cand_lat, cand_lon)
        cand_class, cand_cat = _classify_candidate(cand)

        cand_name = str(cand.get("name") or cand.get("display_name", "")).strip()
        cand_display = str(cand.get("display_name", "")).strip()

        if cand_class == "FOOD":
            closest_food_dist = min(closest_food_dist, distance)
            if distance <= max_radius:
                cand_tokens = {t.lower() for t in cand_name.replace(",", " ").split() if len(t) > 1}
                common_name = name_tokens.intersection(cand_tokens)
                common_addr = address_tokens.intersection(cand_tokens)
                score = (len(common_name) * 25) + (len(common_addr) * 5) - distance
                valid_food_matches.append({
                    "candidate": cand,
                    "distance": distance,
                    "category": cand_cat or "grocery",
                    "name": cand_name if cand.get("name") else clean_name,
                    "address": cand_display,
                    "score": score,
                })
        elif cand_class == "NON_FOOD_COMMERCIAL":
            closest_non_food_dist = min(closest_non_food_dist, distance)
            if distance <= max_radius:
                non_food_matches.append({
                    "candidate": cand,
                    "distance": distance,
                    "category": cand_cat or "non_food_commercial",
                    "name": cand_name if cand.get("name") else "Commercial Entity",
                    "address": cand_display,
                })
        else:
            closest_non_commercial_dist = min(closest_non_commercial_dist, distance)

    # 5. Process verification outcome
    if valid_food_matches:
        valid_food_matches.sort(key=lambda m: (-m["score"], m["distance"]))
        best = valid_food_matches[0]
        dist_rounded = round(best["distance"], 1)

        result = LocationVerificationResult(
            verified=True,
            is_error=False,
            provider="nominatim",
            matched_business_name=best["name"],
            matched_address=best["address"],
            distance_meters=dist_rounded,
            category=best["category"],
            message=f"Real food business verified: {best['name']} ({best['category'].replace('_', ' ').title()}, {dist_rounded}m away). Submitted for Admin Review.",
        )
        _VERIFICATION_CACHE[cache_key] = (result, now_ts)
        return result

    # Non-food commercial rejection within radius
    if non_food_matches:
        non_food_matches.sort(key=lambda m: m["distance"])
        best_nf = non_food_matches[0]
        nf_cat = best_nf["category"].replace("_", " ").title()
        nf_name = best_nf["name"]
        fail_msg = (
            f"The business identified at this location ('{nf_name}') is classified as '{nf_cat}'. "
            f"ExpiryGo exclusively supports food and grocery businesses (groceries, bakeries, dairies, produce, restaurants, cafes). "
            f"Please select a verified food business location."
        )
        fail_result = LocationVerificationResult(
            verified=False,
            is_error=False,
            matched_business_name=nf_name,
            matched_address=best_nf["address"],
            distance_meters=round(best_nf["distance"], 1),
            category=best_nf["category"],
            message=fail_msg,
        )
        _VERIFICATION_CACHE[cache_key] = (fail_result, now_ts)
        return fail_result

    # Out of radius or non-commercial node
    if closest_food_dist != float("inf"):
        fail_msg = (
            f"A food business was found nearby, but it is {round(closest_food_dist, 1)}m away "
            f"(exceeds maximum allowed radius of {max_radius}m). Please adjust the map pin closer to your store."
        )
    elif closest_non_commercial_dist <= max_radius:
        fail_msg = (
            "The selected coordinates correspond to a road, residential area, or non-commercial map node. "
            "Please select a verified commercial food business location on the map."
        )
    else:
        fail_msg = (
            "We could not verify a food business at this location. "
            "Please select the correct shop location or verify that your food business is listed on the map."
        )

    fail_result = LocationVerificationResult(
        verified=False,
        is_error=False,
        distance_meters=round(closest_food_dist, 1) if closest_food_dist != float("inf") else None,
        message=fail_msg,
    )
    _VERIFICATION_CACHE[cache_key] = (fail_result, now_ts)
    return fail_result

