"""
ExpiryGo - Production Clean Slate & Sole Admin Setup
Wipes all demo/test accounts, benchmark users, dummy shops, orders, and products.
Provisions ONLY the single platform Administrator account:
  Email:    devpant2006@gmail.com
  Password: Sureshkumar12345@
  Role:     ADMIN
"""

import sys
import os
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from datetime import datetime, UTC
from db.session import SessionLocal, init_db, engine
from db.models import (
    User, Shop, Product, Reservation, Order,
    Notification, Favorite, PantryItem, Review, Follower
)
from auth_service import hash_password

ADMIN_EMAIL = "devpant2006@gmail.com"
ADMIN_PASSWORD = "Sureshkumar12345@"
ADMIN_NAME = "Platform Admin"


def setup_production_admin():
    print("=" * 70)
    print("🧹 EXPIRYGO - PRODUCTION CLEAN SLATE & SOLE ADMIN PROVISIONING")
    print("=" * 70)

    init_db()
    db = SessionLocal()
    try:
        print("\n[Step 1] Purging all demo data, benchmark members, shops, and products...")
        db.query(Review).delete()
        db.query(Favorite).delete()
        db.query(Follower).delete()
        db.query(PantryItem).delete()
        db.query(Notification).delete()
        db.query(Reservation).delete()
        db.query(Order).delete()
        db.query(Product).delete()
        db.query(Shop).delete()
        db.query(User).delete()
        db.commit()
        print("  ✓ All past demo accounts, benchmark records, and test entities completely wiped.")

        print("\n[Step 2] Creating Sole Platform Administrator Account...")
        admin_hash = hash_password(ADMIN_PASSWORD)
        admin_user = User(
            email=ADMIN_EMAIL,
            hashed_password=admin_hash,
            name=ADMIN_NAME,
            role="ADMIN",
            is_shop_owner=False,
            email_verified=True,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"  ✓ Administrator created successfully!")
        print(f"    • ID:             {admin_user.id}")
        print(f"    • Email:          {admin_user.email}")
        print(f"    • Role:           {admin_user.role}")
        print(f"    • Email Verified: {admin_user.email_verified}")

        print("\n[Step 3] Verifying Final Remote Database State:")
        total_users = db.query(User).count()
        total_shops = db.query(Shop).count()
        total_products = db.query(Product).count()
        total_orders = db.query(Order).count()
        total_reservations = db.query(Reservation).count()

        print(f"  • Total Users in DB:        {total_users} (ONLY {ADMIN_EMAIL})")
        print(f"  • Total Shops in DB:        {total_shops}")
        print(f"  • Total Products in DB:     {total_products}")
        print(f"  • Total Orders in DB:       {total_orders}")
        print(f"  • Total Reservations in DB: {total_reservations}")

        # Also synchronize local SQLite files if they exist
        import sqlite3
        for db_file in [
            backend_dir / "expirygo_local_dev.db",
            backend_dir.parent / "expirygo_local_dev.db",
            backend_dir / "expirygo_local_dev.db",
        ]:
            if db_file.exists():
                try:
                    s_conn = sqlite3.connect(str(db_file))
                    s_cur = s_conn.cursor()
                    for tbl in ["reviews", "favorites", "followers", "pantry_items", "notifications", "reservations", "orders", "products", "shops", "users"]:
                        try:
                            s_cur.execute(f'DELETE FROM "{tbl}";')
                        except Exception:
                            pass
                    s_cur.execute(
                        'INSERT INTO users (id, email, hashed_password, name, role, is_shop_owner, email_verified, created_at, total_money_saved, total_items_saved, co2_saved_kg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        ("admin-master-id", ADMIN_EMAIL, admin_hash, ADMIN_NAME, "ADMIN", 0, 1, datetime.now(UTC).isoformat(), 0.0, 0, 0.0)
                    )
                    s_conn.commit()
                    s_conn.close()
                    print(f"  ✓ Synchronized clean admin state to local SQLite: {db_file.name}")
                except Exception as ex:
                    print(f"  (Notice: SQLite {db_file.name} sync: {ex})")

        print("\n" + "=" * 70)
        print("✅ SUCCESS: PRODUCTION CLEAN SLATE ACTIVE!")
        print("=" * 70)
        print(f"  👑 Platform Administrator: {ADMIN_EMAIL}")
        print(f"  🔑 Admin Password:         {ADMIN_PASSWORD}")
        print("  🚫 All demo accounts removed (customer@test.com, shop1@test.com, etc. are gone)")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"❌ Error during clean slate: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    setup_production_admin()
