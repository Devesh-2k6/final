from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.models import Product, Shop
from db.session import get_db

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
def debug_db(db: Annotated[Session, Depends(get_db)]):
    from sqlalchemy import inspect
    from db.session import get_database_url
    from db.models import User
    
    url = get_database_url()
    masked_url = url
    if "@" in url:
        parts = url.split("@")
        masked_url = f"postgresql://****@{parts[-1]}"
        
    tables = []
    users_columns = []
    query_error = None
    try:
        inspector = inspect(db.get_bind())
        tables = inspector.get_table_names()
        if "users" in tables:
            users_columns = [col['name'] for col in inspector.get_columns('users')]
            try:
                db.query(User).first()
            except Exception as e:
                query_error = str(e)
    except Exception as e:
        query_error = f"Inspector error: {str(e)}"
        
    return {
        "database_url": masked_url,
        "tables": tables,
        "users_columns": users_columns,
        "query_error": query_error
    }
