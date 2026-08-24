"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import List, Optional
from datetime import datetime
from db.models import ReservationStatus, PaymentStatus, ProductCategory


# =========================
# USERS
# =========================

class UserBase(BaseModel):
    email: str
    name: str
    is_shop_owner: bool = False
    phone_number: Optional[str] = None

class User(UserBase):
    id: Optional[str] = None
    total_money_saved: float = 0.0
    total_items_saved: int = 0
    co2_saved_kg: float = 0.0

    model_config = ConfigDict(from_attributes=True)

# =========================
# AUTH
# =========================

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    is_shop_owner: bool = False
    phone_number: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not v_clean or "@" not in v_clean or "." not in v_clean.split("@")[-1]:
            raise ValueError("Please enter a valid email address.")
        return v_clean

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_clean = v.strip()
        if not v_clean:
            raise ValueError("Name cannot be empty.")
        return v_clean

class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not v_clean:
            raise ValueError("Email cannot be empty.")
        return v_clean

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v:
            raise ValueError("Password cannot be empty.")
        return v

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# =========================
# SHOPS
# =========================

class ShopBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    description: Optional[str] = None

class ShopCreate(ShopBase):
    pass

class ShopSummary(BaseModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    average_rating: float = 0.0
    rating_count: int = 0

    model_config = ConfigDict(from_attributes=True)

# =========================
# PRODUCTS
# =========================

class ProductBase(BaseModel):
    name: str
    category: ProductCategory = ProductCategory.OTHER
    original_price: float = Field(..., ge=0.0, description="MRP Price cannot be negative")
    quantity: int = Field(..., ge=0, description="Stock quantity cannot be negative")
    manufacturing_date: datetime
    expiry_date: datetime
    front_image_url: str
    expiry_image_url: str
    voice_note_url: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    
    is_surprise_bag: bool = False
    auto_discount_enabled: bool = False
    auto_discount_min_price: Optional[float] = None
    discount_price: Optional[float] = None

    @field_validator('front_image_url', 'expiry_image_url')
    @classmethod
    def validate_images(cls, v: str) -> str:
        v_strip = v.strip()
        if not v_strip:
            raise ValueError("Image URL cannot be empty")
        if not (v_strip.startswith("http://") or v_strip.startswith("https://") or v_strip.startswith("/")):
            raise ValueError("Image must have a valid URL or path")
        return v_strip

    @model_validator(mode="after")
    def validate_dates(self) -> 'ProductBase':
        if self.manufacturing_date >= self.expiry_date:
            raise ValueError("Expiry date cannot be before or equal to manufacture date")
        
        if self.auto_discount_enabled:
            if self.auto_discount_min_price is None or self.auto_discount_min_price < 0:
                raise ValueError("Minimum discount price must be non-negative")
            if self.auto_discount_min_price >= self.original_price:
                raise ValueError("Minimum discount price must be strictly less than original price")
        return self



class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: str
    shop_id: str
    created_at: datetime
    current_price: Optional[float] = None # Calculated on the fly

    model_config = ConfigDict(from_attributes=True)


class ProductWithShop(Product):
    shop: Optional[ShopSummary] = None
    model_config = ConfigDict(from_attributes=True)

class Shop(ShopBase):
    id: str
    owner_uid: str
    products: List[Product] = []
    average_rating: float = 0.0
    rating_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class AnalyticsResponse(BaseModel):
    total_revenue: float
    total_items_saved: int
    active_reservations: int
    average_rating: float
    recent_reviews: List["ReviewResponse"] = []
    total_products: int = 0
    active_deals: int = 0
    orders_received: int = 0
    revenue_summary: float = 0.0


# =========================
# RESERVATIONS
# =========================

class ReservationCreate(BaseModel):
    product_id: str
    quantity: int

class ReservationVerify(BaseModel):
    pickup_code: str

class ReservationResponse(BaseModel):
    id: str
    user_id: str
    shop_id: str
    product_id: str
    quantity: int
    total_price: float
    status: ReservationStatus
    payment_status: PaymentStatus
    pickup_code: str
    created_at: datetime
    
    product: ProductWithShop

    model_config = ConfigDict(from_attributes=True)


# =========================
# FAVORITES
# =========================

class FavoriteCreate(BaseModel):
    product_id: str

class FavoriteResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    created_at: datetime
    product: ProductWithShop

    model_config = ConfigDict(from_attributes=True)

# =========================
# FOLLOWERS
# =========================

class FollowerResponse(BaseModel):
    id: str
    shop_id: str
    user_id: str
    created_at: datetime
    shop: ShopSummary

    model_config = ConfigDict(from_attributes=True)

# =========================
# REVIEWS
# =========================

class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: str
    user_id: str
    shop_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# =========================
# NOTIFICATIONS
# =========================

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# =========================
# AI OPTIMIZE
# =========================

class ProductOptimizeRequest(BaseModel):
    name: str
    mfg_date: str
    expiry_date: str
    original_price: float
    quantity: int

class ProductOptimizeResponse(BaseModel):
    suggested_description: str
    suggested_discount_tier: str # "high", "medium", "low"
    suggested_discount_percent: int
    confidence_score: float


# =========================
# ORDERS
# =========================

class OrderCreate(BaseModel):
    product_id: str
    order_type: str # "PICKUP" or "DELIVERY"
    quantity: int = 1
    delivery_fee: float = 0.0
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    customer_id: str
    shopkeeper_id: str
    shop_id: str
    product_id: str
    order_type: str
    status: str
    quantity: int
    total_price: float
    delivery_fee: float
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    product: ProductWithShop
    customer: User

    model_config = ConfigDict(from_attributes=True)

class OrderStatusUpdate(BaseModel):
    status: str # "ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"


# =========================
# AI RECIPE GENERATOR
# =========================

class RecipeProductItem(BaseModel):
    name: str
    category: str
    quantity: int = 1

class RecipeGenerationRequest(BaseModel):
    products: List[RecipeProductItem]

class RecipeIngredientItem(BaseModel):
    name: str
    is_deal: bool
    quantity: str

class RecipeStep(BaseModel):
    step_number: int
    instruction: str

class RecipeResponse(BaseModel):
    recipe_name: str
    description: str
    prep_time: str
    cook_time: str
    difficulty: str
    ingredients: List[RecipeIngredientItem]
    instructions: List[RecipeStep]
    waste_saved_summary: str



