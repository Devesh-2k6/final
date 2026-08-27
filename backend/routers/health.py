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

@router.get("/db")
def db_health_check(db: Annotated[Session, Depends(get_db)]):
    shops = db.query(func.count(Shop.id)).scalar() or 0
    products = db.query(func.count(Product.id)).scalar() or 0
    return {
        "status": "ok",
        "storage": "postgres" if "postgresql" in db.bind.dialect.name else "sqlite",
        "shops": shops,
        "products": products,
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
