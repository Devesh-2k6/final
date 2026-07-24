import math
import logging
from datetime import datetime, UTC
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi_cache.decorator import cache
from sqlalchemy.orm import Session, contains_eager, joinedload

import schemas
from auth_service import get_current_user, get_current_shop_owner
from db.models import Product, Shop, User, Follower, Notification, ProductCategory
from db.session import get_db
from storage import upload_product_image
from services.email import send_email_notification
from services.ai import optimize_product_details, scan_date_label_vision, parse_semantic_search, get_recipe_ingredients, generate_recipe_from_deals
from services.ml import recommend_deals_for_user, generate_forecast_and_price_recommendation
from routers.shops import _get_owner_shop, _serialize_shop
from websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["Products"])
upload_router = APIRouter(tags=["Uploads"])


def _calculate_dynamic_price(p: Product, now: datetime) -> float:
    if not p.auto_discount_enabled or not p.auto_discount_min_price:
        return p.discount_price
    
    # Simple linear drop over the last 24 hours before expiry
    time_left = (p.expiry_date - now).total_seconds()
    if time_left <= 0:
        return p.auto_discount_min_price
    
    hours_left = time_left / 3600
    if hours_left > 24:
        return p.discount_price
    
    # It drops from discount_price to min_price over 24 hours
    drop_range = p.discount_price - p.auto_discount_min_price
    fraction = (24 - hours_left) / 24.0 # 0 at 24 hours, 1 at 0 hours
    
    current = p.discount_price - (drop_range * fraction)
    return round(current, 2)


def _calculate_automatic_discount(original_price: float, days_left: int) -> float:
    """
    Calculate automatic discount based on days until expiry.
    
    - 1–2 days left → 70%
    - 3–5 days → 50%
    - 6–10 days → 30%
    - More than 10 days → 10%
    """
    if days_left <= 2:
        discount_percent = 70
    elif days_left <= 5:
        discount_percent = 50
    elif days_left <= 10:
        discount_percent = 30
    else:
        discount_percent = 10
    
    discount_price = original_price * (1 - discount_percent / 100)
    return round(discount_price, 2)


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
@cache(expire=60)
def read_products(
    db: Annotated[Session, Depends(get_db)],
    shop_id: Optional[str] = None,
    hide_expired: bool = True,
    q: Optional[str] = None,
    category: Optional[ProductCategory] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = 50.0,
):
    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 6371.0 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    now = datetime.now(UTC).replace(tzinfo=None)
    query = db.query(Product).join(Product.shop).options(contains_eager(Product.shop)).filter(Product.quantity > 0)
    
    if shop_id:
        query = query.filter(Product.shop_id == shop_id)
    if hide_expired:
        query = query.filter(Product.expiry_date > now)
    if category:
        query = query.filter(Product.category == category)
    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))
        
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
            logger.info("No products found within range. Disabling geo-filter to show remote/mock deals for local testing.")
            bypass_geo = True

    products = query.order_by(Product.expiry_date.asc()).all()

    out: list[dict] = []
    products_with_distance = []
    for p in products:
        shop = p.shop
        dist = None
        # geo filter
        if lat is not None and lng is not None and not bypass_geo and shop:
            dist = haversine_distance(lat, lng, shop.latitude, shop.longitude)
            if dist > radius_km:
                continue
        products_with_distance.append((p, shop, dist))

    if lat is not None and lng is not None and not bypass_geo:
        # Sort by distance (closest first)
        products_with_distance.sort(key=lambda item: item[2] if item[2] is not None else 999999)

    for p, shop, dist in products_with_distance:
        out.append(_serialize_product(p, shop))
    return out


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
        parsed = await parse_semantic_search(q)
        parsed_keywords = parsed.get("keywords") or [q]
        parsed_categories = parsed.get("categories") or []
        parsed_max_price = parsed.get("max_price")
        parsed_min_discount_pct = parsed.get("min_discount_pct")
        parsed_expiry_urgency = parsed.get("expiry_urgency")

    query = db.query(Product).join(Product.shop).options(contains_eager(Product.shop)).filter(
        Product.quantity > 0,
        Product.expiry_date > now,
        Product.is_active == True
    )
    
    from sqlalchemy import or_
    if parsed_keywords:
        for token in parsed_keywords:
            if token:
                query = query.filter(
                    or_(
                        Product.name.ilike(f"%{token}%"),
                        Product.description.ilike(f"%{token}%"),
                        Shop.name.ilike(f"%{token}%")
                    )
                )
                
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
        if lat is not None and lng is not None and not bypass_geo and shop:
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


@router.get("/{product_id}/forecast")
def get_product_forecast(
    product_id: str,
    user: Annotated[User, Depends(get_current_shop_owner)],
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
    user: Annotated[User, Depends(get_current_shop_owner)],
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
    user: User = Depends(get_current_shop_owner)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")
    url = upload_product_image(file, request)
    return {"url": url}


@router.post("/scan-dates")
async def scan_product_dates(
    file: UploadFile = File(...),
    user: User = Depends(get_current_shop_owner)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")
    
    file_bytes = await file.read()
    result = await scan_date_label_vision(file_bytes)
    return result


@router.post("/optimize", response_model=schemas.ProductOptimizeResponse)
async def optimize_product(
    opt_in: schemas.ProductOptimizeRequest,
    user: Annotated[User, Depends(get_current_shop_owner)],
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
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    
    # Calculate days until expiry
    now = datetime.now(UTC).replace(tzinfo=None)
    days_left = (product_in.expiry_date.date() - now.date()).days
    
    # Auto-calculate discount based on days left (unless override is provided)
    if product_in.discount_price is not None:
        discount_price = product_in.discount_price
    else:
        discount_price = _calculate_automatic_discount(product_in.original_price, days_left)
    
    product = Product(
        shop_id=shop.id,
        name=product_in.name,
        category=product_in.category,
        original_price=product_in.original_price,
        discount_price=discount_price,
        quantity=product_in.quantity,
        manufacturing_date=product_in.manufacturing_date,
        expiry_date=product_in.expiry_date,
        front_image_url=product_in.front_image_url,
        expiry_image_url=product_in.expiry_image_url,
        voice_note_url=product_in.voice_note_url,
        description=product_in.description,
        is_active=product_in.is_active,
        is_surprise_bag=product_in.is_surprise_bag,
        auto_discount_enabled=product_in.auto_discount_enabled,
        auto_discount_min_price=product_in.auto_discount_min_price,
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
                        <p style="font-size: 0.8em; color: #999;">You are receiving this because you follow {shop.name} on ExpiryGo.</p>
                    </div>
                </body>
            </html>
            """
            email_text = f"Hello {follower.user.name},\n\nA new deal is available at {shop.name}!\n\n{product.name} is now available at {discount_pct}% off for only ₹{product.discount_price:.2f}.\nExpiry: {product.expiry_date.strftime('%Y-%m-%d %H:%M') if product.expiry_date else ''}\n\nReserve it on ExpiryGo!"
            send_email_notification(follower.user.email, email_subject, email_html, email_text)
            
    if followers:
        db.commit()

    serialized = _serialize_product(product, shop)
    
    # Broadcast the new deal to all connected clients!
    import asyncio
    asyncio.create_task(manager.broadcast({
        "type": "new_deal",
        "product": serialized
    }))

    return serialized


@router.put("/{product_id}")
def update_product(
    product_id: str,
    product_in: schemas.ProductCreate,
    user: Annotated[User, Depends(get_current_shop_owner)],
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
    return _serialize_product(product, shop)


@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    user: Annotated[User, Depends(get_current_shop_owner)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = _get_owner_shop(user, db)
    product = db.get(Product, product_id)
    if not product or product.shop_id != shop.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or not yours")
    
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}


@router.post("/recipe-generator", response_model=schemas.RecipeResponse)
async def generate_recipe(
    req: schemas.RecipeGenerationRequest
):
    products_list = [{"name": p.name, "category": p.category, "quantity": p.quantity} for p in req.products]
    result = await generate_recipe_from_deals(products_list)
    return result

