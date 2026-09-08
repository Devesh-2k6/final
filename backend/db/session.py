import os
import time
import logging
from collections.abc import Generator
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool, NullPool, QueuePool
from sqlalchemy.exc import OperationalError, DBAPIError
from db.base import Base
from config import settings

logger = logging.getLogger("expirygo.database")

_backend_dir = Path(__file__).resolve().parent.parent
LOCAL_DEV_DB = f"sqlite:///{(_backend_dir / 'expirygo_local_dev.db').as_posix()}"
DEFAULT_URL = LOCAL_DEV_DB


def get_database_url() -> str:
    url = settings.DATABASE_URL.strip() if settings.DATABASE_URL else DEFAULT_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("sqlite:///./") or url == "sqlite:///expirygo_local_dev.db":
        url = LOCAL_DEV_DB
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
                pool_size=10,
                max_overflow=10,
                pool_timeout=20,
                pool_pre_ping=True,
                pool_recycle=1800,
                connect_args={"connect_timeout": 10}
            )
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Connected successfully to primary PostgreSQL database via Supavisor pooler.")
            return eng
        except Exception as e:
            sanitized_host = url.split("@")[-1] if "@" in url else "PostgreSQL"
            logger.critical(
                f"FATAL: Primary PostgreSQL database at {sanitized_host} is unreachable ({e}). "
                f"Aborting startup immediately to prevent silent data corruption or split-brain SQLite fallback."
            )
            raise RuntimeError(
                f"Fatal database connection failure on startup: Unable to reach PostgreSQL database at {sanitized_host}. Error: {e}"
            ) from e
            
    if "sqlite" in url:
        logger.warning(f"Using local SQLite database explicitly configured: {url}")
        eng = create_engine(
            url,
            connect_args={"check_same_thread": False, "timeout": 60},
            poolclass=NullPool
        )
        return eng

    eng = create_engine(
        url,
        connect_args={"check_same_thread": False, "timeout": 60},
        poolclass=NullPool
    )
    return eng


engine = _create_engine()


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in str(engine.url):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.close()
        except Exception:
            pass


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

                # photo_url
                if "photo_url" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN photo_url VARCHAR(500)"))

                # document_url
                if "document_url" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN document_url VARCHAR(500)"))

                # verification_document_url
                if "verification_document_url" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN verification_document_url TEXT"))

                # verification_document_name
                if "verification_document_name" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN verification_document_name VARCHAR(255)"))

                # location_override_by
                if "location_override_by" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN location_override_by VARCHAR(255)"))

                # location_override_at
                if "location_override_at" not in existing_shop_columns:
                    if dialect == "sqlite":
                        conn.execute(text("ALTER TABLE shops ADD COLUMN location_override_at DATETIME"))
                    else:
                        conn.execute(text("ALTER TABLE shops ADD COLUMN location_override_at TIMESTAMP WITHOUT TIME ZONE"))

                # location_override_reason
                if "location_override_reason" not in existing_shop_columns:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN location_override_reason TEXT"))

            # Create performance and composite indexes if missing
            index_statements = [
                "CREATE INDEX IF NOT EXISTS ix_users_role ON users (role)",
                "CREATE INDEX IF NOT EXISTS ix_users_created_at ON users (created_at)",
                "CREATE INDEX IF NOT EXISTS ix_shops_is_active ON shops (is_active)",
                "CREATE INDEX IF NOT EXISTS ix_shops_approval_status ON shops (approval_status)",
                "CREATE INDEX IF NOT EXISTS ix_shops_approval_loc ON shops (approval_status, location_verified_at DESC)",
                "CREATE INDEX IF NOT EXISTS ix_products_is_active ON products (is_active)",
                "CREATE INDEX IF NOT EXISTS ix_products_shop_active_exp ON products (shop_id, is_active, expiry_date, quantity)",
                "CREATE INDEX IF NOT EXISTS ix_orders_status ON orders (status)",
                "CREATE INDEX IF NOT EXISTS ix_orders_created_at ON orders (created_at)",
                "CREATE INDEX IF NOT EXISTS ix_orders_customer_created ON orders (customer_id, created_at DESC)",
                "CREATE INDEX IF NOT EXISTS ix_orders_shop_created ON orders (shop_id, created_at DESC)",
                "CREATE INDEX IF NOT EXISTS ix_reservations_status ON reservations (status)",
                "CREATE INDEX IF NOT EXISTS ix_reservations_pickup_code ON reservations (pickup_code)",
                "CREATE INDEX IF NOT EXISTS ix_reservations_shop_status_created ON reservations (shop_id, status, created_at DESC)",
                "CREATE INDEX IF NOT EXISTS ix_pantry_items_is_consumed ON pantry_items (is_consumed)",
                "CREATE INDEX IF NOT EXISTS ix_pantry_items_user_consumed_exp ON pantry_items (user_id, is_consumed, expiry_date ASC)",
            ]
            if dialect == "postgresql":
                try:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS ix_shops_location_gist ON shops USING GIST "
                        "((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography));"
                    ))
                except Exception as geo_err:
                    logger.warning(f"Notice enabling PostGIS / GIST index: {geo_err}")

            for idx_stmt in index_statements:
                try:
                    conn.execute(text(idx_stmt))
                except Exception:
                    pass

    except Exception as e:
        logger.info(f"Auto-migration check completed with notice: {e}")


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
            logger.info("Database schema initialization and auto-migration completed successfully.")
    except Exception as e:
        logger.critical(f"FATAL: Database initialization error: {e}", exc_info=True)
        raise RuntimeError(f"Database initialization failed: {e}") from e


def get_db() -> Generator[Session, None, None]:
    max_retries = 3
    base_delay = 0.2
    
    db: Session | None = None
    for attempt in range(1, max_retries + 1):
        try:
            db = SessionLocal()
            # Fast health check to ensure connection from pool is alive
            db.execute(text("SELECT 1"))
            break
        except (OperationalError, DBAPIError) as e:
            if db:
                try:
                    db.close()
                except Exception:
                    pass
                db = None
            logger.warning(
                f"Database connection attempt {attempt}/{max_retries} failed ({e}). "
                f"Retrying in {base_delay * attempt:.2f}s..."
            )
            if attempt == max_retries:
                logger.error("All database connection retry attempts exhausted. Raising HTTP 503.")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database service is temporarily unavailable or overloaded. Please retry in a few moments."
                )
            time.sleep(base_delay * attempt)
        except Exception as e:
            if db:
                try:
                    db.close()
                except Exception:
                    pass
            logger.error(f"Unexpected error acquiring database session: {e}", exc_info=True)
            raise

    try:
        yield db
    finally:
        if db:
            db.close()

