import uuid
import random
import string
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.base import Base
import enum

class ProductCategory(str, enum.Enum):
    BAKERY = "BAKERY"
    DAIRY = "DAIRY"
    PRODUCE = "PRODUCE"
    MEAT = "MEAT"
    PANTRY = "PANTRY"
    PREPARED_FOOD = "PREPARED_FOOD"
    OTHER = "OTHER"
def new_id() -> str:
    return str(uuid.uuid4())

def generate_pickup_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

class ReservationStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class PaymentStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PAID = "PAID"
    REFUNDED = "REFUNDED"

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_shop_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Impact Tracking (Gamification)
    total_money_saved: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_items_saved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    co2_saved_kg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    shop: Mapped["Shop | None"] = relationship(back_populates="owner", uselist=False)
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reviews: Mapped[list["Review"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    following: Mapped[list["Follower"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    orders_placed: Mapped[list["Order"]] = relationship("Order", foreign_keys="[Order.customer_id]", back_populates="customer", cascade="all, delete-orphan")
    orders_managed: Mapped[list["Order"]] = relationship("Order", foreign_keys="[Order.shopkeeper_id]", back_populates="shopkeeper", cascade="all, delete-orphan")

class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Trust Ratings
    average_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    owner: Mapped["User"] = relationship(back_populates="shop")
    products: Mapped[list["Product"]] = relationship(back_populates="shop", cascade="all, delete-orphan")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="shop", cascade="all, delete-orphan")
    reviews: Mapped[list["Review"]] = relationship(back_populates="shop", cascade="all, delete-orphan")
    followers: Mapped[list["Follower"]] = relationship(back_populates="shop", cascade="all, delete-orphan")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="shop", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    shop_id: Mapped[str] = mapped_column(String(36), ForeignKey("shops.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[ProductCategory] = mapped_column(Enum(ProductCategory), default=ProductCategory.OTHER, index=True, nullable=False)
    original_price: Mapped[float] = mapped_column(Float, nullable=False)
    discount_price: Mapped[float] = mapped_column(Float, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    manufacturing_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expiry_date: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    front_image_url: Mapped[str] = mapped_column(Text, nullable=False)
    expiry_image_url: Mapped[str] = mapped_column(Text, nullable=False)
    voice_note_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Surprise Bags
    is_surprise_bag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Dynamic Pricing
    auto_discount_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_discount_min_price: Mapped[float | None] = mapped_column(Float, nullable=True)

    shop: Mapped["Shop"] = relationship(back_populates="products")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="product", cascade="all, delete-orphan")

class Favorite(Base):
    __tablename__ = "favorites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="favorites")
    product: Mapped["Product"] = relationship(back_populates="favorites")

class Follower(Base):
    __tablename__ = "followers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    shop_id: Mapped[str] = mapped_column(String(36), ForeignKey("shops.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="following")
    shop: Mapped["Shop"] = relationship(back_populates="followers")

class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    shop_id: Mapped[str] = mapped_column(String(36), ForeignKey("shops.id"), index=True, nullable=False)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), index=True, nullable=False)
    
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    total_price: Mapped[float] = mapped_column(Float, nullable=False) # Price locked at reservation time
    status: Mapped[ReservationStatus] = mapped_column(Enum(ReservationStatus), default=ReservationStatus.PENDING, nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.UNPAID, nullable=False)
    pickup_code: Mapped[str] = mapped_column(String(6), default=generate_pickup_code, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="reservations")
    shop: Mapped["Shop"] = relationship(back_populates="reservations")
    product: Mapped["Product"] = relationship(back_populates="reservations")

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    shop_id: Mapped[str] = mapped_column(String(36), ForeignKey("shops.id"), index=True, nullable=False)
    
    rating: Mapped[int] = mapped_column(Integer, nullable=False) # 1 to 5
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="reviews")
    shop: Mapped["Shop"] = relationship(back_populates="reviews")

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="notifications")

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    shopkeeper_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    shop_id: Mapped[str] = mapped_column(String(36), ForeignKey("shops.id"), index=True, nullable=False)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), index=True, nullable=False)
    
    order_type: Mapped[str] = mapped_column(String(50), default="PICKUP", nullable=False) # "PICKUP" or "DELIVERY"
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False) # "PENDING", "ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_price: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id], back_populates="orders_placed")
    shopkeeper: Mapped["User"] = relationship("User", foreign_keys=[shopkeeper_id], back_populates="orders_managed")
    shop: Mapped["Shop"] = relationship("Shop", back_populates="orders")
    product: Mapped["Product"] = relationship("Product", back_populates="orders")
