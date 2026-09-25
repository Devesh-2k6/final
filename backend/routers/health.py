from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.models import Product, Shop, User
from db.session import get_db
from auth_service import get_current_admin

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health_check():
    return {"status": "ok", "message": "Service is running"}

@router.get("/network")
def get_network_info():
    import socket
    import os
    import re
    lan_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        detected = s.getsockname()[0]
        s.close()
        if detected and not detected.startswith("127.") and not detected.startswith("169.254."):
            lan_ip = detected
    except Exception:
        pass

    if lan_ip == "127.0.0.1" and os.name == "nt":
        try:
            import subprocess
            out = subprocess.getoutput("ipconfig")
            sections = re.split(r"\n(?=[A-Za-z])", out)
            for sec in sections:
                if "Default Gateway" in sec and not re.search(r"Default Gateway[.\s]+:\s*$", sec, re.M):
                    m = re.search(r"IPv4 Address[.\s]+:\s*([0-9.]+)", sec)
                    if m and not m.group(1).startswith("127.") and not m.group(1).startswith("169.254."):
                        lan_ip = m.group(1)
                        break
        except Exception:
            pass

    if lan_ip == "127.0.0.1":
        try:
            detected = socket.gethostbyname(socket.gethostname())
            if detected and not detected.startswith("127."):
                lan_ip = detected
        except Exception:
            pass

    return {
        "status": "ok",
        "lan_ip": lan_ip,
        "api_url": f"http://{lan_ip}:8000",
        "web_url": f"http://{lan_ip}:3000",
        "expo_uri": f"exp://{lan_ip}:8081",
        "expo_web_url": f"http://{lan_ip}:8081",
    }

@router.get("/db")
def db_health_check(db: Annotated[Session, Depends(get_db)]):
    users = db.query(func.count(User.id)).scalar() or 0
    shops = db.query(func.count(Shop.id)).scalar() or 0
    products = db.query(func.count(Product.id)).scalar() or 0
    from db.models import Order, Reservation
    orders = db.query(func.count(Order.id)).scalar() or 0
    reservations = db.query(func.count(Reservation.id)).scalar() or 0
    return {
        "status": "ok",
        "storage": "postgres" if "postgresql" in db.bind.dialect.name else "sqlite",
        "users": users,
        "shops": shops,
        "products": products,
        "orders": orders,
        "reservations": reservations,
    }


@router.get("/platform-impact")
def get_platform_impact(db: Annotated[Session, Depends(get_db)]):
    total_co2 = db.query(func.sum(User.co2_saved_kg)).scalar() or 0.0
    total_items = db.query(func.sum(User.total_items_saved)).scalar() or 0
    total_money = db.query(func.sum(User.total_money_saved)).scalar() or 0.0
    active_shops = db.query(func.count(Shop.id)).filter(Shop.is_active == True, Shop.approval_status == "APPROVED").scalar() or 0
    active_products = db.query(func.count(Product.id)).filter(Product.is_active == True, Product.quantity > 0).scalar() or 0
    return {
        "status": "ok",
        "total_co2_kg": round(total_co2, 2),
        "total_items_rescued": total_items,
        "total_money_saved_inr": round(total_money, 2),
        "active_shops": active_shops,
        "live_deals": active_products,
        "water_saved_liters": int(total_items * 840),
    }

@router.get("/debug")
def debug_db(
    user: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)]
):
    from sqlalchemy import inspect
    
    table_count = 0
    try:
        inspector = inspect(db.get_bind())
        table_count = len(inspector.get_table_names())
    except Exception:
        table_count = 0
        
    return {
        "status": "healthy",
        "database_connected": True,
        "table_count": table_count,
        "environment": "production-hardened",
        "authenticated_admin": user.email,
    }
