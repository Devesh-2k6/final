import math
import logging
import asyncio
from datetime import datetime, UTC
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi_cache.decorator import cache
from sqlalchemy import func, text, or_
from sqlalchemy.orm import Session, contains_eager, joinedload

import schemas
from auth_service import get_current_user, get_current_vendor, get_current_active_vendor
from db.models import Product, Shop, User, Follower, Notification, ProductCategory
from db.session import get_db
from storage import upload_product_image
from services.email import send_email_notification
from services.ai import (
    optimize_product_details,
    scan_date_label_vision,
    parse_semantic_search,
    get_recipe_ingredients,
    generate_recipe_from_deals,
    parse_voice_product_listing,
)
from services.ml import recommend_deals_for_user, generate_forecast_and_price_recommendation
from routers.shops import _get_owner_shop, _serialize_shop
from websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["Products"])
upload_router = APIRouter(tags=["Uploads"])


def _calculate_dynamic_price(p: Product, now: datetime) -> float:
    """
    Shopkeeper-controlled dynamic clearance pricing engine:
    Calculates live markdown bounded between MRP (original_price) and the Shopkeeper's Floor (auto_discount_min_price).
    Factors both:
    1. Time remaining until expiry (concave decay curve)
    2. Remaining stock quantity (inventory clearance pressure)
    GUARANTEE: The price NEVER drops below the shopkeeper's lowest acceptable floor price.
    """
    mrp = float(p.original_price or 0.0)
    if mrp <= 0:
        return 0.0

    # Floor price explicitly set by the shopkeeper (defaults to discount_price or 70% of MRP)
    min_floor = float(
        p.auto_discount_min_price
        if p.auto_discount_min_price is not None
        else (p.discount_price if p.discount_price is not None else mrp * 0.7)
    )
    if min_floor > mrp:
        min_floor = mrp

    headroom = mrp - min_floor
    if headroom <= 0.01:
        return round(mrp, 2)

    if not p.expiry_date:
        return round(p.discount_price or mrp, 2)

    exp = p.expiry_date.replace(tzinfo=None) if p.expiry_date.tzinfo else p.expiry_date
    now_naive = now.replace(tzinfo=None) if now.tzinfo else now

    total_seconds_left = (exp - now_naive).total_seconds()
    if total_seconds_left <= 0:
        return round(min_floor, 2)

    hours_left = total_seconds_left / 3600.0

    # 1. Time Factor (over an active 7-day / 168-hour window with concave decay)
    max_window_hours = 168.0  # 7 days
    normalized_time = min(1.0, max(0.0, hours_left / max_window_hours))
    # Concave decay factor: 0.0 at 7+ days left, up to 1.0 at 0 hours left
    time_factor = 1.0 - (normalized_time ** 0.65)

    # 2. Quantity / Inventory Pressure Multiplier
    qty = max(1, int(p.quantity or 1))
    qty_factor = min(1.20, max(0.85, 0.85 + 0.05 * math.log(qty + 1)))

    # Combined clearance progress (0.0 to 1.0)
    clearance_progress = min(1.0, max(0.0, time_factor * qty_factor))

    # Final price strictly clamped between min_floor and mrp
    current_price = mrp - (headroom * clearance_progress)
    current_price = max(min_floor, min(mrp, current_price))

    return round(current_price, 2)


def _calculate_automatic_discount(
    original_price: float,
    days_left: int,
    hours_left: float = 999.0,
    min_floor: Optional[float] = None,
    quantity: int = 1,
) -> float:
    """
    Calculates initial starting deal price respecting the shopkeeper's floor price, time left, and fair-pricing tiers.
    """
    mrp = float(original_price or 0.0)
    if mrp <= 0:
        return 0.0

    # Standard fair-pricing tiers
    if hours_left <= 12 or days_left <= 1:
        discount_pct = 0.40  # 40% off
    elif days_left <= 3:
        discount_pct = 0.30  # 30% off
    elif days_left <= 7:
        discount_pct = 0.20  # 20% off
    else:
        discount_pct = 0.15  # 15% off

    calc_price = mrp * (1.0 - discount_pct)

    if min_floor is not None and min_floor > 0:
        floor = min(mrp, float(min_floor))
        calc_price = max(floor, calc_price)

    return round(calc_price, 2)


def _serialize_product(product: Product, shop: Optional[Shop] = None) -> dict:
    now = datetime.now(UTC).replace(tzinfo=None)
    current_price = _calculate_dynamic_price(product, now)

    out = {
        "id": product.id,
        "shop_id": product.shop_id,
        "name": product.name,
        "original_price": product.original_price,
        "discount_price": product.discount_price,
        "current_price": current_price,
        "quantity": product.quantity,
        "manufacturing_date": product.manufacturing_date,
        "expiry_date": product.expiry_date,
        "category": product.category,
        "front_image_url": product.front_image_url,
        "expiry_image_url": product.expiry_image_url,
        "voice_note_url": product.voice_note_url,
        "description": product.description,
        "is_active": product.is_active,
        "created_at": product.created_at,
        "is_surprise_bag": product.is_surprise_bag,
        "auto_discount_enabled": product.auto_discount_enabled,
        "auto_discount_min_price": product.auto_discount_min_price,
    }
    if shop:
        out["shop"] = _serialize_shop(shop)
    else:
        out["shop"] = None
    return out


@router.get("/")
def read_products(
    db: Annotated[Session, Depends(get_db)],
    shop_id: Optional[str] = None,
    hide_expired: bool = True,
    q: Optional[str] = None,
    category: Optional[ProductCategory] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = 50.0,
    limit: Optional[int] = None,
    offset: int = 0,
):
    now = datetime.now(UTC).replace(tzinfo=None)
    query = db.query(Product).join(Product.shop).options(contains_eager(Product.shop)).filter(
        Product.quantity > 0,
        Product.is_active == True,
        Shop.is_active == True,
        Shop.approval_status == "APPROVED"
    )
    
    if shop_id:
        query = query.filter(Product.shop_id == shop_id)
    if hide_expired:
        query = query.filter(Product.expiry_date > now)
    if category:
        query = query.filter(Product.category == category)
    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))

    # PostGIS hardware-accelerated spatial filtering & distance ordering
    if lat is not None and lng is not None:
        effective_radius_meters = float(radius_km or 50.0) * 1000.0
        dialect = db.bind.dialect.name if db.bind else "postgresql"
        if dialect == "postgresql":
            # Direct PostGIS ST_DWithin powered by GIST R-Tree index
            query = query.filter(
                text(
                    "ST_DWithin("
                    "ST_SetSRID(ST_MakePoint(shops.longitude, shops.latitude), 4326)::geography, "
                    "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, "
                    ":radius_m"
                    ")"
                ).params(lng=lng, lat=lat, radius_m=effective_radius_meters)
            )
            products_query = query.order_by(
                text(
                    "ST_Distance("
                    "ST_SetSRID(ST_MakePoint(shops.longitude, shops.latitude), 4326)::geography, "
                    "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography"
                    ") ASC"
                ).params(lng=lng, lat=lat),
                Product.expiry_date.asc()
            )
        else:
            lat_delta = (radius_km or 50.0) / 111.0
            lng_delta = (radius_km or 50.0) / (111.0 * max(0.1, math.cos(math.radians(lat))))
            query = query.filter(
                Shop.latitude.between(lat - lat_delta, lat + lat_delta),
                Shop.longitude.between(lng - lng_delta, lng + lng_delta)
            )
            products_query = query.order_by(Product.expiry_date.asc())
    else:
        products_query = query.order_by(Product.expiry_date.asc())

    if limit is not None:
        capped_limit = min(max(1, limit), 500)
        products = products_query.offset(max(0, offset)).limit(capped_limit).all()
    else:
        products = products_query.all()

    return [_serialize_product(p, p.shop) for p in products]


@router.get("/search/deep")
async def deep_search_products(
    db: Annotated[Session, Depends(get_db)],
    q: Optional[str] = None,
    semantic: bool = False,
    recipe_mode: bool = False,
    max_price: Optional[float] = None,
    min_discount_pct: Optional[float] = None,
    expiry_urgency: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 10.0,
):
    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 6371.0 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    now = datetime.now(UTC).replace(tzinfo=None)

    # 1. Recipe Mode
    if recipe_mode and q:
        recipe_data = await get_recipe_ingredients(q)
        recipe_name = recipe_data.get("recipe_name", q)
        ingredients = recipe_data.get("ingredients", [])
        
        # Get all products matching ingredients
        query = db.query(Product).join(Product.shop).options(contains_eager(Product.shop)).filter(
            Product.quantity > 0,
            Product.expiry_date > now,
            Product.is_active == True
        )
        
        bypass_geo = False
        if lat is not None and lng is not None:
            lat_delta = radius_km / 111.0
            lng_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
            geo_query = query.filter(
                Shop.latitude.between(lat - lat_delta, lat + lat_delta),
                Shop.longitude.between(lng - lng_delta, lng + lng_delta)
            )
            if geo_query.count() > 0:
                query = geo_query
            else:
                bypass_geo = True
                
        products = query.order_by(Product.expiry_date.asc()).all()
        
        filtered_products = []
        for p in products:
            if lat is not None and lng is not None and not bypass_geo and p.shop:
                dist = haversine_distance(lat, lng, p.shop.latitude, p.shop.longitude)
                if dist > radius_km:
                    continue
            filtered_products.append(p)
            
        matched_deals = []
        missing_ingredients = []
        
        for ing in ingredients:
            ing_match = None
            ing_lower = ing.lower()
            for p in filtered_products:
                if ing_lower in p.name.lower() or (p.description and ing_lower in p.description.lower()):
                    ing_match = p
                    break
            if ing_match:
                matched_deals.append(ing_match)
            else:
                missing_ingredients.append(ing)
                
        estimated_total_cost = 0.0
        total_savings = 0.0
        serialized_matches = []
        for p in matched_deals:
            current_price = _calculate_dynamic_price(p, now)
            estimated_total_cost += current_price
            total_savings += (p.original_price - current_price)
            serialized_matches.append(_serialize_product(p, p.shop))
            
        return {
            "recipe_mode": True,
            "recipe_name": recipe_name,
            "ingredients": ingredients,
            "matched_deals": serialized_matches,
            "missing_ingredients": missing_ingredients,
            "estimated_total_cost": round(estimated_total_cost, 2),
            "total_savings": round(total_savings, 2)
        }

    # 2. Regular / Semantic Mode
    parsed_keywords = [q] if q else []
    parsed_categories = []
    parsed_max_price = None
    parsed_min_discount_pct = None
    parsed_expiry_urgency = None
    
    if semantic and q:
        try:
            parsed = await parse_semantic_search(q)
            parsed_keywords = parsed.get("keywords") or [q]
            parsed_categories = parsed.get("categories") or []
            parsed_max_price = parsed.get("max_price")
            parsed_min_discount_pct = parsed.get("min_discount_pct")
            parsed_expiry_urgency = parsed.get("expiry_urgency")
        except Exception as e:
            logger.error(f"Semantic search parsing failed, using fallback: {e}")
            # Reliable local fallback already exists in services/ai.py but we wrap here too
            parsed_keywords = [q]

    query = db.query(Product).join(Product.shop).options(contains_eager(Product.shop)).filter(
        Product.quantity > 0,
        Product.expiry_date > now,
        Product.is_active == True
    )
    
    from sqlalchemy import or_
    if parsed_keywords:
        # Optimization: use a single filter with OR logic for keywords to handle 500+ users
        keyword_filters = []
        for token in parsed_keywords:
            if token and len(token) > 1:
                pattern = f"%{token}%"
                keyword_filters.append(Product.name.ilike(pattern))
                keyword_filters.append(Product.description.ilike(pattern))
                keyword_filters.append(Shop.name.ilike(pattern))
        if keyword_filters:
            query = query.filter(or_(*keyword_filters))
                
    if parsed_categories:
        enum_categories = []
        for cat_str in parsed_categories:
            try:
                enum_categories.append(ProductCategory(cat_str))
            except ValueError:
                pass
        if enum_categories:
            query = query.filter(Product.category.in_(enum_categories))
            
    final_max_price = max_price if max_price is not None else parsed_max_price
    final_min_discount_pct = min_discount_pct if min_discount_pct is not None else parsed_min_discount_pct
    final_expiry_urgency = expiry_urgency if expiry_urgency is not None else parsed_expiry_urgency
    
    if final_max_price is not None:
        query = query.filter(Product.discount_price <= final_max_price)
        
    if final_min_discount_pct is not None:
        query = query.filter(
            ((Product.original_price - Product.discount_price) / Product.original_price) >= (final_min_discount_pct / 100.0)
        )
        
    if final_expiry_urgency == "today":
        today_end = now.replace(hour=23, minute=59, second=59)
        query = query.filter(Product.expiry_date <= today_end)
    elif final_expiry_urgency == "tomorrow":
        from datetime import timedelta
        tomorrow_end = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59)
        query = query.filter(Product.expiry_date <= tomorrow_end)
    elif final_expiry_urgency == "week":
        from datetime import timedelta
        week_end = (now + timedelta(days=7)).replace(hour=23, minute=59, second=59)
        query = query.filter(Product.expiry_date <= week_end)

    bypass_geo = False
    if lat is not None and lng is not None:
        radius_m = float(radius_km) * 1000.0
        dialect = db.bind.dialect.name if db.bind else "postgresql"
        if dialect == "postgresql":
            query = query.filter(
                text(
                    "ST_DWithin("
                    "ST_SetSRID(ST_MakePoint(shops.longitude, shops.latitude), 4326)::geography, "
                    "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, "
                    ":radius_m"
                    ")"
                ).params(lng=lng, lat=lat, radius_m=radius_m)
            )
        else:
            lat_delta = radius_km / 111.0
            lng_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
            geo_query = query.filter(
                Shop.latitude.between(lat - lat_delta, lat + lat_delta),
                Shop.longitude.between(lng - lng_delta, lng + lng_delta)
            )
            if geo_query.count() > 0:
                query = geo_query
            else:
                bypass_geo = True
            
    products = query.order_by(Product.expiry_date.asc()).all()
    
    out = []
    for p in products:
        shop = p.shop
        if lat is not None and lng is not None and not bypass_geo and shop and (db.bind and db.bind.dialect.name != "postgresql"):
            dist = haversine_distance(lat, lng, shop.latitude, shop.longitude)
            if dist > radius_km:
                continue
                
        current_price = _calculate_dynamic_price(p, now)
        if final_max_price is not None and current_price > final_max_price:
            continue
            
        out.append(_serialize_product(p, shop))
        
    return {
        "recipe_mode": False,
        "products": out
    }


@router.get("/recommended")
def get_recommended_deals(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    now = datetime.now(UTC).replace(tzinfo=None)
    active_deals = db.query(Product).join(Product.shop).options(contains_eager(Product.shop)).filter(
        Product.quantity > 0,
        Product.expiry_date > now,
        Product.is_active == True
    ).all()
    
    recommended = recommend_deals_for_user(db, user.id, active_deals)
    return [_serialize_product(p, p.shop) for p in recommended]


COMMON_BARCODE_CATALOG = {
    "8901234567890": {
        "name": "Amul Taaza Homogenised Toned Milk (1L)",
        "brand": "Amul",
        "category": ProductCategory.DAIRY,
        "description": "Long life toned milk, rich in calcium and vitamins.",
        "suggested_price": 72.0,
        "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80"
    },
    "8901030383748": {
        "name": "Britannia 100% Whole Wheat Bread (400g)",
        "brand": "Britannia",
        "category": ProductCategory.BAKERY,
        "description": "Wholesome and fibre-rich whole wheat brown bread.",
        "suggested_price": 50.0,
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80"
    },
    "8901063012345": {
        "name": "Mother Dairy Classic Curd / Dahi (400g)",
        "brand": "Mother Dairy",
        "category": ProductCategory.DAIRY,
        "description": "Thick and creamy probiotic dahi.",
        "suggested_price": 35.0,
        "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80"
    },
    "8901725132209": {
        "name": "Kellogg's Real Almond & Honey Corn Flakes (300g)",
        "brand": "Kellogg's",
        "category": ProductCategory.PANTRY,
        "description": "Crisp golden corn flakes with crunchy sliced almonds and honey.",
        "suggested_price": 185.0,
        "image_url": "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=600&q=80"
    },
    "8901058852882": {
        "name": "Maggi 2-Minute Masala Noodles (Pack of 4)",
        "brand": "Nestle Maggi",
        "category": ProductCategory.PANTRY,
        "description": "Classic instant noodles infused with signature aromatic spices.",
        "suggested_price": 60.0,
        "image_url": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&q=80"
    },
    "8901491101838": {
        "name": "Lay's India's Magic Masala Potato Chips (90g)",
        "brand": "Lay's",
        "category": ProductCategory.PANTRY,
        "description": "Crisp potato chips bursting with authentic Indian spice mix.",
        "suggested_price": 30.0,
        "image_url": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&q=80"
    }
}


@router.get("/barcode/{barcode}", response_model=schemas.BarcodeLookupResponse)
def lookup_product_by_barcode(
    barcode: str,
    db: Annotated[Session, Depends(get_db)]
):
    clean_barcode = barcode.strip()
    if not clean_barcode or len(clean_barcode) < 4 or len(clean_barcode) > 32 or not clean_barcode.replace("-", "").isalnum():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid barcode format. Barcode must be 4 to 32 alphanumeric characters."
        )

    # 1. Check known catalog
    if clean_barcode in COMMON_BARCODE_CATALOG:
        item = COMMON_BARCODE_CATALOG[clean_barcode]
        return schemas.BarcodeLookupResponse(
            barcode=clean_barcode,
            name=item["name"],
            brand=item["brand"],
            category=item["category"],
            description=item["description"],
            suggested_price=item["suggested_price"],
            image_url=item["image_url"]
        )

    # 2. Check existing database products matching barcode in description or name
    matched_prod = db.query(Product).filter(
        (Product.description.ilike(f"%{clean_barcode}%")) | (Product.name.ilike(f"%{clean_barcode}%"))
    ).first()

    if matched_prod:
        return schemas.BarcodeLookupResponse(
            barcode=clean_barcode,
            name=matched_prod.name,
            brand="Store Inventory",
            category=matched_prod.category,
            description=matched_prod.description,
            suggested_price=matched_prod.original_price,
            image_url=matched_prod.front_image_url
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Product with barcode '{clean_barcode}' not found in catalog."
    )


@router.get("/{product_id}/forecast")
def get_product_forecast(
    product_id: str,
    user: Annotated[User, Depends(get_current_active_vendor)],
    db: Annotated[Session, Depends(get_db)]
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    # Verify they own the product shop
    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if not shop or product.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this product's store")
        
    forecast = generate_forecast_and_price_recommendation(db, product)
    return forecast


@router.get("/{product_id}/ai-insight")
def get_product_ai_insight(
    product_id: str,
    user: Annotated[User, Depends(get_current_active_vendor)],
    db: Annotated[Session, Depends(get_db)]
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    # Verify they own the product shop
    shop = db.query(Shop).filter(Shop.owner_id == user.id).first()
    if not shop or product.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this product's store")
        
    insight = generate_forecast_and_price_recommendation(db, product)
    return insight


@upload_router.post("/upload/image")
def upload_image(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_active_vendor)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")
    url = upload_product_image(file, request)
    return {"url": url}


@router.post("/scan-dates")
async def scan_product_dates(
    file: UploadFile = File(...),
    user: User = Depends(get_current_active_vendor)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")
    
    file_bytes = await file.read()
    result = await scan_date_label_vision(file_bytes)
    return result


@router.post("/optimize", response_model=schemas.ProductOptimizeResponse)
async def optimize_product(
    opt_in: schemas.ProductOptimizeRequest,
    user: Annotated[User, Depends(get_current_active_vendor)],
):
    result = await optimize_product_details(
        name=opt_in.name,
        mfg_date_str=opt_in.mfg_date,
        expiry_date_str=opt_in.expiry_date,
        original_price=opt_in.original_price,
        quantity=opt_in.quantity,
    )
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: schemas.ProductCreate,
    user: Annotated[User, Depends(get_current_active_vendor)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    
    # Calculate days until expiry safely
    expiry_naive = product_in.expiry_date.replace(tzinfo=None) if product_in.expiry_date.tzinfo else product_in.expiry_date
    mfg_naive = product_in.manufacturing_date.replace(tzinfo=None) if product_in.manufacturing_date.tzinfo else product_in.manufacturing_date
    now = datetime.now(UTC).replace(tzinfo=None)
    days_left = (expiry_naive.date() - now.date()).days
    hours_left = max(0.0, (expiry_naive - now).total_seconds() / 3600.0)
    
    # Auto-calculate discount based on days, hours, shopkeeper floor price, and stock quantity
    auto_enabled = product_in.auto_discount_enabled or (product_in.auto_discount_min_price is not None and product_in.auto_discount_min_price > 0)
    if product_in.discount_price is not None and product_in.discount_price > 0:
        discount_price = product_in.discount_price
    else:
        discount_price = _calculate_automatic_discount(
            original_price=product_in.original_price,
            days_left=days_left,
            hours_left=hours_left,
            min_floor=product_in.auto_discount_min_price,
            quantity=product_in.quantity,
        )
    
    product = Product(
        shop_id=shop.id,
        name=product_in.name,
        category=product_in.category,
        original_price=product_in.original_price,
        discount_price=discount_price,
        quantity=product_in.quantity,
        manufacturing_date=mfg_naive,
        expiry_date=expiry_naive,
        front_image_url=product_in.front_image_url or "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
        expiry_image_url=product_in.expiry_image_url or product_in.front_image_url or "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
        voice_note_url=product_in.voice_note_url,
        description=product_in.description,
        is_active=product_in.is_active,
        is_surprise_bag=product_in.is_surprise_bag,
        auto_discount_enabled=auto_enabled,
        auto_discount_min_price=product_in.auto_discount_min_price if auto_enabled else None,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Notify followers of the shop about the new product deal (optimized with joinedload)
    followers = db.query(Follower).options(joinedload(Follower.user)).filter(Follower.shop_id == shop.id).all()
    for follower in followers:
        discount_pct = round(((product.original_price - product.discount_price) / product.original_price) * 100)
        notif = Notification(
            user_id=follower.user_id,
            title=f"New Deal at {shop.name}!",
            message=f"{product.name} is now available at {discount_pct}% off! Only ₹{product.discount_price:.2f}."
        )
        db.add(notif)
        
        # Send Email Alert
        if follower.user and follower.user.email:
            email_subject = f"🔥 New Deal Alert: {product.name} at {shop.name}!"
            email_html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #10b981;">New Deal Available!</h2>
                        <p>Hello {follower.user.name},</p>
                        <p>A new deal has been posted by a shop you follow: <strong>{shop.name}</strong>.</p>
                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">{product.name}</h3>
                            <p style="margin: 5px 0;"><strong>Original Price:</strong> <span style="text-decoration: line-through;">₹{product.original_price:.2f}</span></p>
                            <p style="margin: 5px 0; color: #10b981; font-size: 1.2em;"><strong>Deal Price:</strong> ₹{product.discount_price:.2f} ({discount_pct}% off!)</p>
                            <p style="margin: 5px 0;"><strong>Expiry Date:</strong> {product.expiry_date.strftime('%Y-%m-%d %H:%M') if product.expiry_date else ''}</p>
                            <p style="margin: 5px 0;"><strong>Available Stock:</strong> {product.quantity} left</p>
                            {f'<p style="margin: 5px 0;"><strong>Description:</strong> {product.description}</p>' if product.description else ''}
                        </div>
                        <p>Hurry and reserve it now before it's gone!</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 0.8em; color: #999;">You are receiving this because you follow {shop.name} on Meeva.</p>
                    </div>
                </body>
            </html>
            """
            email_text = f"Hello {follower.user.name},\n\nA new deal is available at {shop.name}!\n\n{product.name} is now available at {discount_pct}% off for only ₹{product.discount_price:.2f}.\nExpiry: {product.expiry_date.strftime('%Y-%m-%d %H:%M') if product.expiry_date else ''}\n\nReserve it on Meeva!"
            send_email_notification(follower.user.email, email_subject, email_html, email_text)
            
    if followers:
        db.commit()

    serialized = _serialize_product(product, shop)

    # Broadcast the new deal to all connected clients!
    try:
        manager.broadcast_sync({
            "type": "new_deal",
            "product": serialized
        })
    except Exception as e:
        logger.warning(f"Could not broadcast new_deal: {e}")

    return serialized


@router.get("/{product_id}", response_model=schemas.ProductWithShop)
def read_product(product_id: str, db: Annotated[Session, Depends(get_db)]):
    product = db.query(Product).options(joinedload(Product.shop)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _serialize_product(product, product.shop)


@router.put("/{product_id}")
def update_product(
    product_id: str,
    product_in: schemas.ProductCreate,
    user: Annotated[User, Depends(get_current_active_vendor)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    product = db.get(Product, product_id)
    if not product or product.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or not yours")

    # Recalculate discount based on new expiry date (unless override is provided)
    if product_in.discount_price is not None:
        discount_price = product_in.discount_price
    else:
        now = datetime.now(UTC).replace(tzinfo=None)
        days_left = (product_in.expiry_date.date() - now.date()).days
        discount_price = _calculate_automatic_discount(product_in.original_price, days_left)

    product.name = product_in.name
    product.category = product_in.category
    product.original_price = product_in.original_price
    product.discount_price = discount_price
    product.quantity = product_in.quantity
    product.manufacturing_date = product_in.manufacturing_date
    product.expiry_date = product_in.expiry_date
    product.front_image_url = product_in.front_image_url
    product.expiry_image_url = product_in.expiry_image_url
    product.voice_note_url = product_in.voice_note_url
    product.description = product_in.description
    product.is_active = product_in.is_active
    product.is_surprise_bag = product_in.is_surprise_bag
    product.auto_discount_enabled = product_in.auto_discount_enabled
    product.auto_discount_min_price = product_in.auto_discount_min_price

    db.commit()
    db.refresh(product)
    serialized = _serialize_product(product, shop)
    
    # Broadcast update event to all connected web and mobile clients
    try:
        manager.broadcast_sync({
            "type": "update_deal",
            "product": serialized
        })
    except Exception as e:
        logger.warning(f"Could not broadcast update_deal: {e}")

    return serialized


@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    user: Annotated[User, Depends(get_current_active_vendor)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    product = db.get(Product, product_id)
    if not product or product.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or not yours")
    
    prod_id_str = str(product.id)
    db.delete(product)
    db.commit()

    # Broadcast deletion event to all connected web and mobile clients
    try:
        manager.broadcast_sync({
            "type": "delete_deal",
            "product_id": prod_id_str
        })
    except Exception as e:
        logger.warning(f"Could not broadcast delete_deal: {e}")

    return {"message": "Product deleted successfully"}


@router.post("/recipe-generator", response_model=schemas.RecipeResponse)
async def generate_recipe(
    req: schemas.RecipeGenerationRequest
):
    products_list = [{"name": p.name, "category": p.category, "quantity": p.quantity} for p in req.products]
    result = await generate_recipe_from_deals(products_list)
    return result


@router.post("/voice-parse", response_model=schemas.VoiceProductParseResponse)
async def parse_voice_listing(
    req: schemas.VoiceProductParseRequest,
):
    """
    Multilingual AI Voice Assistant for Merchants:
    Converts spoken voice input in Tamil, Hindi, Telugu, or English into structured product fields.
    """
    result = await parse_voice_product_listing(req.transcript, language=req.language or "auto")
    return schemas.VoiceProductParseResponse(**result)

