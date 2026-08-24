import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from db.base import Base

from config import settings

from sqlalchemy import create_engine, text

_backend_dir = Path(__file__).resolve().parent.parent
LOCAL_DEV_DB = f"sqlite:///{_backend_dir / 'expirygo_local_dev.db'}"
DEFAULT_URL = LOCAL_DEV_DB


def get_database_url() -> str:
    url = settings.DATABASE_URL.strip() if settings.DATABASE_URL else DEFAULT_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def _create_engine():
    url = get_database_url()
    if url in ("sqlite:///:memory:", "sqlite://"):
        return create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    
    if url.startswith("postgresql"):
        try:
            eng = create_engine(
                url,
                pool_size=20,
                max_overflow=0,
                pool_pre_ping=True,
                pool_recycle=300,
                connect_args={"connect_timeout": 5}
            )
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("[INFO] Connected successfully to primary PostgreSQL database.")
            return eng
        except Exception as e:
            print(f"[WARNING] Primary PostgreSQL database unreachable ({e}). Seamlessly switching to local SQLite database ({LOCAL_DEV_DB})...")
            return create_engine(LOCAL_DEV_DB, connect_args={"check_same_thread": False})
            
    return create_engine(url, connect_args={"check_same_thread": False})


engine = _create_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    try:
        url = str(engine.url)
        if "sqlite" in url:
            db_file = url.replace("sqlite:///", "")
            if db_file and not db_file.startswith(":"):
                Path(db_file).parent.mkdir(parents=True, exist_ok=True)
            
        if os.getenv("SKIP_DB_INIT", "false").lower() != "true":
            Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[ERROR] Database init error: {e}")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
