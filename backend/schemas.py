"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import List, Optional, Any, Dict, Union
from datetime import datetime
from db.models import ReservationStatus, PaymentStatus, ProductCategory


# =========================
# USERS
# =========================

class UserBase(BaseModel):
    email: str
    name: str
    role: str = "CUSTOMER"
    is_shop_owner: bool = False
    email_verified: bool = False
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
    dev_otp: Optional[str] = None

class ResendVerificationRequest(BaseModel):
    email: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not v_clean or "@" not in v_clean:
            raise ValueError("Please enter a valid email address.")
        return v_clean

class VerifyEmailResponse(BaseModel):
    success: bool
    message: str
    email: Optional[str] = None
    user: Optional[dict] = None

class SendOtpRequest(BaseModel):
    identifier: str  # email or phone number
    name: Optional[str] = None

    @field_validator('identifier')
    @classmethod
    def validate_id(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not v_clean or len(v_clean) < 3:
            raise ValueError("Identifier must be a valid email or phone number.")
        return v_clean

class SendOtpResponse(BaseModel):
    success: bool
    message: str
    expires_in_seconds: int = 600
    cooldown_remaining: Optional[int] = None
    dev_code: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    identifier: str
    otp: str
    name: Optional[str] = None
    is_shop_owner: bool = False
    phone_number: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def check_otp_or_code(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "otp" not in data and "code" in data:
                data["otp"] = data["code"]
        return data

    @field_validator('otp')
    @classmethod
    def validate_code(cls, v: str) -> str:
        v_clean = v.strip().replace(" ", "").replace("-", "")
        if len(v_clean) < 4:
            raise ValueError("Please enter a valid OTP code.")
        return v_clean


# =========================
# SHOPS
# =========================

class ShopLocationVerifyRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    address: str = Field(..., min_length=2, max_length=500)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)

    @field_validator('latitude')
    @classmethod
    def check_latitude(cls, v: float) -> float:
        import math
        if math.isnan(v) or math.isinf(v):
            raise ValueError("Latitude cannot be NaN or Infinity")
        return v

    @field_validator('longitude')
    @classmethod
    def check_longitude(cls, v: float) -> float:
        import math
        if math.isnan(v) or math.isinf(v):
            raise ValueError("Longitude cannot be NaN or Infinity")
        return v

class ShopLocationVerifyResponse(BaseModel):
    verified: bool
    is_error: bool = False
    provider: str = "nominatim"
    matched_business_name: Optional[str] = None
    matched_address: Optional[str] = None
    distance_meters: Optional[float] = None
    category: Optional[str] = None
    message: str

class ShopDocumentUploadResponse(BaseModel):
    document_url: str
    filename: str

class ShopBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    address: str = Field(..., min_length=2, max_length=500)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    description: Optional[str] = None
    verification_document_url: Optional[str] = None
    verification_document_name: Optional[str] = None

    @field_validator('latitude')
    @classmethod
    def check_latitude(cls, v: float) -> float:
        import math
        if math.isnan(v) or math.isinf(v):
            raise ValueError("Latitude cannot be NaN or Infinity")
        return v

    @field_validator('longitude')
    @classmethod
    def check_longitude(cls, v: float) -> float:
        import math
        if math.isnan(v) or math.isinf(v):
            raise ValueError("Longitude cannot be NaN or Infinity")
        return v

class ShopCreate(ShopBase):
    pass

class ShopResponse(BaseModel):
    id: str
    owner_id: Optional[str] = None
    owner_uid: Optional[str] = None
    name: str
    address: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    average_rating: float = 0.0
    rating_count: int = 0
    deal_count: Optional[int] = 0
    is_active: bool = False
    location_verified: bool = False
    location_verified_at: Optional[datetime] = None
    location_verification_provider: Optional[str] = None
    location_verification_name: Optional[str] = None
    location_verification_address: Optional[str] = None
    location_verification_distance_meters: Optional[float] = None
    location_verification_category: Optional[str] = None
    approval_status: str = "PENDING"
    approval_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    verification_document_url: Optional[str] = None
    verification_document_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    model_config = ConfigDict(from_attributes=True)

class ShopSummary(BaseModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    average_rating: float = 0.0
    rating_count: int = 0
    is_active: bool = False
    location_verified: bool = False

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
    front_image_url: Optional[str] = None
    expiry_image_url: Optional[str] = None
    voice_note_url: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    
    is_surprise_bag: bool = False
    auto_discount_enabled: bool = False
    auto_discount_min_price: Optional[float] = None
    discount_price: Optional[float] = None

    @field_validator('front_image_url', 'expiry_image_url')
    @classmethod
    def validate_images(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_strip = v.strip()
        if not v_strip:
            return None
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
    quantity: int = Field(..., gt=0, description="Quantity must be a positive number")

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
    rating: int = Field(..., ge=1, le=5, description="Rating must be between 1 and 5")
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
    quantity: int = Field(default=1, gt=0, description="Quantity must be a positive number")
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
    category: str = "OTHER"
    quantity: Union[int, str] = 1

class RecipeGenerationRequest(BaseModel):
    products: List[RecipeProductItem]

class RecipeIngredientItem(BaseModel):
    name: str
    is_deal: bool
    quantity: Union[str, int] = "1 unit"

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


# =========================
# BARCODE LOOKUP
# =========================

class BarcodeLookupResponse(BaseModel):
    barcode: str
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[ProductCategory] = None
    description: Optional[str] = None
    suggested_price: Optional[float] = None
    image_url: Optional[str] = None


# =========================
# DIGITAL FRIDGE / PANTRY
# =========================

class PantryItemBase(BaseModel):
    name: str
    category: ProductCategory = ProductCategory.PANTRY
    quantity: str = "1 unit"
    expiry_date: datetime
    image_url: Optional[str] = None
    notes: Optional[str] = None

class PantryItemCreate(PantryItemBase):
    pass

class PantryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[ProductCategory] = None
    quantity: Optional[str] = None
    expiry_date: Optional[datetime] = None
    is_consumed: Optional[bool] = None
    notes: Optional[str] = None

class PantryItem(PantryItemBase):
    id: str
    user_id: str
    purchase_date: datetime
    is_consumed: bool = False
    created_at: datetime
    days_left: int = 0
    hours_left: float = 0.0
    urgency_status: str = "FRESH" # FRESH, EXPIRING_SOON, CRITICAL, EXPIRED

    model_config = ConfigDict(from_attributes=True)

class PantryAiScanItem(BaseModel):
    name: str
    category: ProductCategory
    estimated_days_shelf_life: int
    suggested_quantity: str = "1 unit"
    confidence: float = 0.9

class PantryAiScanResponse(BaseModel):
    detected_items: List[PantryAiScanItem]
    scan_summary: str

class PantrySmartAlert(BaseModel):
    item_id: str
    item_name: str
    hours_left: float
    urgency: str
    alert_message: str
    suggested_recipe_title: Optional[str] = None
    recipe_preview: Optional[str] = None

# =========================
# ADMIN MODERATION & APPROVAL
# =========================

class AdminShopApprovalRequest(BaseModel):
    notes: Optional[str] = None

class AdminShopRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000, description="Mandatory reason for rejection")

    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: str) -> str:
        v_clean = v.strip()
        if len(v_clean) < 3:
            raise ValueError("Rejection reason must be at least 3 characters long.")
        return v_clean

class AdminShopSuspendRequest(BaseModel):
    reason: Optional[str] = None

class AdminShopResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    is_active: bool = False
    location_verified: bool = False
    location_verified_at: Optional[datetime] = None
    location_verification_provider: Optional[str] = None
    location_verification_name: Optional[str] = None
    location_verification_address: Optional[str] = None
    location_verification_distance_meters: Optional[float] = None
    location_verification_category: Optional[str] = None
    approval_status: str = "PENDING"
    approval_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    verification_document_url: Optional[str] = None
    verification_document_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AdminStatsResponse(BaseModel):
    total_users: int = 0
    total_customers: int = 0
    total_merchants: int = 0
    active_shops: int = 0
    pending_shops: int = 0
    rejected_shops: int = 0
    suspended_shops: int = 0
    total_products: int = 0
    total_deals: int = 0


