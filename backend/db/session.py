import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool, NullPool
from db.base import Base
from config import settings

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
            connect_args={"check_same_thread": False, "timeout": 30},
            poolclass=StaticPool,
        )
    
    if url.startswith("postgresql"):
        try:
            eng = create_engine(
                url,
                pool_size=100,
                max_overflow=100,
                pool_pre_ping=True,
                pool_recycle=300,
                connect_args={"connect_timeout": 10}
            )
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("[INFO] Connected successfully to primary PostgreSQL database.")
            return eng
        except Exception as e:
            print(f"[WARNING] Primary PostgreSQL database unreachable ({e}). Seamlessly switching to local SQLite database ({LOCAL_DEV_DB})...")
            return create_engine(
                LOCAL_DEV_DB,
                connect_args={"check_same_thread": False, "timeout": 30},
                poolclass=NullPool
            )
            
    return create_engine(
        url,
        connect_args={"check_same_thread": False, "timeout": 30},
        poolclass=NullPool
    )


engine = _create_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _auto_migrate_schema() -> None:
    """
    Safely adds missing email verification columns to existing SQLite / PostgreSQL databases without dropping data.
    """
    try:
        with engine.begin() as conn:
            # Detect dialect
            dialect = engine.dialect.name
            existing_columns = set()
            
            if dialect == "sqlite":
                result = conn.execute(text("PRAGMA table_info(users)"))
                existing_columns = {row[1] for row in result.fetchall()}
            elif dialect == "postgresql":
                result = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
                ))
                existing_columns = {row[0] for row in result.fetchall()}

            if not existing_columns:
                return

            # Migration: role
            if "role" not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'CUSTOMER' NOT NULL"))

            # Migration: email_verified
            if "email_verified" not in existing_columns:
                if dialect == "sqlite":
                    conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 1 NOT NULL"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT TRUE NOT NULL"))

            # Migration: email_verification_token_hash
            if "email_verification_token_hash" not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_token_hash VARCHAR(255)"))

            # Migration: email_verification_expires_at
            if "email_verification_expires_at" not in existing_columns:
                if dialect == "sqlite":
                    conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_expires_at DATETIME"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_expires_at TIMESTAMP WITHOUT TIME ZONE"))

            # Migration: last_verification_email_sent_at
            if "last_verification_email_sent_at" not in existing_columns:
                if dialect == "sqlite":
                    conn.execute(text("ALTER TABLE users ADD COLUMN last_verification_email_sent_at DATETIME"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN last_verification_email_sent_at TIMESTAMP WITHOUT TIME ZONE"))

            # -------------------------------------------------------------
            # Migration: shops table
            # -------------------------------------------------------------
            existing_shop_columns = set()
            if dialect == "sqlite":
                shop_result = conn.execute(text("PRAGMA table_info(shops)"))
                existing_shop_columns = {row[1] for row in shop_result.fetchall()}
            elif dialect == "postgresql":
                shop_result = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'shops'"
                ))
                existing_shop_columns = {row[0] for row in shop_result.fetchall()}

            if existing_shop_columns:
                # is_active
                if "is_active" not in existing_shop_columns:
                    if dialect == "sqlite":
                        conn.execute(text("ALTER TABLE shops ADD COLUMN is_active BOOLEAN DEFAULT 0 NOT NULL"))
                    else:
                        conn.execute(text("ALTER TABLE shops ADD COLUMN is_active BOOLEAN DEFAULT FALSE NOT NULL"))

                # location_verified
                if "location_verified" not in existing_shop_columns:
                    if dialect == "sqlite":
                        conn.execute(text("ALTER TABLE shops ADD COLUMN location_verified BOOLEAN DEFAULT 0 NOT NULL"))
                    else:
                        conn.execute(text("ALTER TABLE shops ADD COLUMN location_verified BOOLEAN DEFAULT FALSE NOT NULL"))

                # location_verified_at
                if "location_verified_at" not in existing_shop_columns:
                    if dialect == "sqlite":
                        conn.execute(text("ALTER TABLE shops ADD COLUMN location_verified_at DATETIME"))
                    else:
                        conn.execute(text("ALTER TABLE shops ADD COLUMN location_verified_at TIMESTAMP WITHOUT TIME ZONE"))

                # location_verification_provider
                if "location_verification_provider" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN location_verification_provider VARCHAR(50)"))

                # location_verification_name
                if "location_verification_name" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN location_verification_name VARCHAR(255)"))

                # location_verification_address
                if "location_verification_address" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN location_verification_address VARCHAR(500)"))

                # location_verification_distance_meters
                if "location_verification_distance_meters" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN location_verification_distance_meters FLOAT"))

                # location_verification_category
                if "location_verification_category" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN location_verification_category VARCHAR(100)"))

                # approval_status
                if "approval_status" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN approval_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL"))

                # approval_reason
                if "approval_reason" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN approval_reason TEXT"))

                # approved_at
                if "approved_at" not in existing_shop_columns:
                    if dialect == "sqlite":
                        conn.execute(text("ALTER TABLE shops ADD COLUMN approved_at DATETIME"))
                    else:
                        conn.execute(text("ALTER TABLE shops ADD COLUMN approved_at TIMESTAMP WITHOUT TIME ZONE"))

                # approved_by
                if "approved_by" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN approved_by VARCHAR(255)"))

                # rejected_at
                if "rejected_at" not in existing_shop_columns:
                    if dialect == "sqlite":
                        conn.execute(text("ALTER TABLE shops ADD COLUMN rejected_at DATETIME"))
                    else:
                        conn.execute(text("ALTER TABLE shops ADD COLUMN rejected_at TIMESTAMP WITHOUT TIME ZONE"))

                # Explicitly activate and approve only configured demo seed shops
                demo_active_sql = """
                    UPDATE shops 
                    SET is_active = (CASE WHEN :is_sqlite = 1 THEN 1 ELSE TRUE END),
                        location_verified = (CASE WHEN :is_sqlite = 1 THEN 1 ELSE TRUE END),
                        approval_status = 'APPROVED',
                        approved_by = 'system_seed',
                        location_verification_provider = 'nominatim',
                        location_verification_distance_meters = 0.0
                    WHERE owner_id IN (
                        SELECT id FROM users WHERE email IN ('shop1@test.com', 'shop2@test.com', 'shop3@test.com')
                    ) AND (approval_status IS NULL OR approval_status = 'PENDING' OR is_active = 0 OR is_active = FALSE)
                """
                conn.execute(text(demo_active_sql), {"is_sqlite": 1 if dialect == "sqlite" else 0})

    except Exception as e:
        print(f"[INFO] Auto-migration check completed with notice: {e}")


def init_db() -> None:
    try:
        url = str(engine.url)
        if "sqlite" in url:
            db_file = url.replace("sqlite:///", "")
            if db_file and not db_file.startswith(":"):
                Path(db_file).parent.mkdir(parents=True, exist_ok=True)
            
        if os.getenv("SKIP_DB_INIT", "false").lower() != "true":
            Base.metadata.create_all(bind=engine)
            _auto_migrate_schema()
    except Exception as e:
        print(f"[ERROR] Database init error: {e}")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
