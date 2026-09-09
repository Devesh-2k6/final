"""
ExpiryGo - Account Cleaner
Removes all accounts and associated records from the database EXCEPT Admin accounts.
Preserves users where role == 'ADMIN' (specifically devpant2006@gmail.com).
"""

import os
import sys
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
from auth_service import hash_password, verify_password

ADMIN_EMAIL = "devpant2006@gmail.com"
ADMIN_PASSWORD = "Sureshkumar12345@"
ADMIN_NAME = "Platform Admin"

def clean_non_admin_accounts():
    print("=" * 70)
    print("🧹 REMOVING ALL ACCOUNTS EXCEPT ADMINS")
    print("=" * 70)

    init_db()
    db = SessionLocal()
    try:
        # Step 1: Identify Admin Accounts to keep
        admin_users = db.query(User).filter(
            (User.role == "ADMIN") | (User.email == ADMIN_EMAIL)
        ).all()
        admin_ids = {u.id for u in admin_users}
        print(f"Found {len(admin_users)} existing Admin account(s) to preserve.")
        for adm in admin_users:
            print(f"  👑 Preserving Admin: {adm.email} (id: {adm.id[:8]}..., role: {adm.role})")

        # If admin doesn't exist, create it
        if not admin_users:
            print(f"  [+] Creating Platform Admin account: {ADMIN_EMAIL}...")
            admin_user = User(
                email=ADMIN_EMAIL,
                hashed_password=hash_password(ADMIN_PASSWORD),
                name=ADMIN_NAME,
                role="ADMIN",
                is_shop_owner=False,
                email_verified=True,
                created_at=datetime.now(UTC).replace(tzinfo=None),
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            admin_ids.add(admin_user.id)
            print(f"  ✓ Platform Admin created: {admin_user.email}")
        else:
            # Ensure admin properties
            for adm in admin_users:
                adm.role = "ADMIN"
                adm.email_verified = True
                if adm.email == ADMIN_EMAIL and not verify_password(ADMIN_PASSWORD, adm.hashed_password):
                    adm.hashed_password = hash_password(ADMIN_PASSWORD)
            db.commit()

        # Step 2: Identify Non-Admin Users
        non_admin_users = db.query(User).filter(~User.id.in_(admin_ids)).all()
        non_admin_ids = [u.id for u in non_admin_users]
        print(f"\nFound {len(non_admin_users)} non-admin account(s) to remove.")
        for u in non_admin_users:
            print(f"  🗑️ Marking for deletion: {u.email} (role: {u.role}, name: {u.name})")

        if non_admin_ids:
            # Delete dependent entities for non-admin users
            print("\nCleaning up associated records for non-admin accounts...")
            db.query(Review).filter(Review.user_id.in_(non_admin_ids)).delete(synchronize_session=False)
            db.query(Favorite).filter(Favorite.user_id.in_(non_admin_ids)).delete(synchronize_session=False)
            db.query(Follower).filter(Follower.user_id.in_(non_admin_ids)).delete(synchronize_session=False)
            db.query(PantryItem).filter(PantryItem.user_id.in_(non_admin_ids)).delete(synchronize_session=False)
            db.query(Notification).filter(Notification.user_id.in_(non_admin_ids)).delete(synchronize_session=False)
            db.query(Reservation).filter(Reservation.user_id.in_(non_admin_ids)).delete(synchronize_session=False)
            db.query(Order).filter(
                (Order.customer_id.in_(non_admin_ids)) | (Order.shopkeeper_id.in_(non_admin_ids))
            ).delete(synchronize_session=False)

            # Delete shops owned by non-admins & their products
            shops_to_delete = db.query(Shop).filter(Shop.owner_id.in_(non_admin_ids)).all()
            shop_ids = [s.id for s in shops_to_delete]
            if shop_ids:
                db.query(Product).filter(Product.shop_id.in_(shop_ids)).delete(synchronize_session=False)
                db.query(Shop).filter(Shop.id.in_(shop_ids)).delete(synchronize_session=False)

            # Delete the non-admin users
            db.query(User).filter(User.id.in_(non_admin_ids)).delete(synchronize_session=False)
            db.commit()
            print("  ✓ All non-admin accounts and associated entities deleted successfully.")
        else:
            print("  ✓ No non-admin accounts found to delete.")

        # Step 3: Verify remaining state
        print("\n=== VERIFICATION: DATABASE STATUS ===")
        remaining_users = db.query(User).all()
        print(f"Total Users Remaining in DB: {len(remaining_users)}")
        for u in remaining_users:
            print(f"  • User: {u.email} | Name: {u.name} | Role: {u.role} | Verified: {u.email_verified}")

        total_shops = db.query(Shop).count()
        total_products = db.query(Product).count()
        total_orders = db.query(Order).count()
        print(f"Total Shops in DB:    {total_shops}")
        print(f"Total Products in DB: {total_products}")
        print(f"Total Orders in DB:   {total_orders}")

        # Also clean local SQLite file if present
        import sqlite3
        for db_file in [
            backend_dir / "expirygo_local_dev.db",
            backend_dir.parent / "expirygo_local_dev.db",
        ]:
            if db_file.exists():
                try:
                    s_conn = sqlite3.connect(str(db_file))
                    s_cur = s_conn.cursor()
                    s_cur.execute("DELETE FROM users WHERE role != 'ADMIN' AND email != ?", (ADMIN_EMAIL,))
                    s_cur.execute("DELETE FROM shops WHERE owner_id NOT IN (SELECT id FROM users WHERE role = 'ADMIN')")
                    s_conn.commit()
                    s_conn.close()
                    print(f"  ✓ Synchronized clean admin state to local SQLite: {db_file.name}")
                except Exception as ex:
                    print(f"  (Notice: SQLite {db_file.name} sync: {ex})")

        print("\n" + "=" * 70)
        print("✅ DATABASE CLEANUP COMPLETE - ONLY ADMIN ACCOUNTS REMAIN")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"❌ Error during cleanup: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    clean_non_admin_accounts()
