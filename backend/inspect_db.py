import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.session import SessionLocal, engine
from db.models import User, Shop, Product, Order, Reservation, Notification, Review, Favorite, Follower, PantryItem
from sqlalchemy import text

def inspect():
    with SessionLocal() as db:
        print("=== DATABASE CONNECTION INFO ===")
        print("Engine URL:", engine.url.render_as_string(hide_password=True))
        
        # Check dialect and server version
        if "sqlite" in engine.url.drivername:
            res = db.execute(text("SELECT sqlite_version();")).scalar()
            print("SQLite Version:", res)
        else:
            try:
                res = db.execute(text("SELECT version();")).scalar()
                print("Postgres Version:", res)
                size_res = db.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()));")).scalar()
                print("Database Size:", size_res)
                conn_res = db.execute(text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();")).scalar()
                max_conn = db.execute(text("SHOW max_connections;")).scalar()
                print(f"Active Connections: {conn_res} / Max Configured: {max_conn}")
            except Exception as e:
                print(f"DB Metrics Note: {e}")

        print("\n=== USERS IN DATABASE ===")
        users = db.query(User).order_by(User.created_at).all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"  User id={u.id[:8]}... | email='{u.email}' | name='{u.name}' | role='{u.role}' | is_shop_owner={u.is_shop_owner} | email_verified={u.email_verified} | created={u.created_at}")

        print("\n=== SHOPS IN DATABASE ===")
        shops = db.query(Shop).all()
        print(f"Total Shops: {len(shops)}")
        for s in shops:
            print(f"  Shop id={s.id[:8]}... | owner_id={s.owner_id[:8]}... | name='{s.name}' | address='{s.address}' | status='{s.approval_status}' | is_active={s.is_active} | loc_verified={s.location_verified} | created={s.approved_at or 'N/A'}")

        print("\n=== PRODUCTS IN DATABASE ===")
        products = db.query(Product).all()
        print(f"Total Products: {len(products)}")
        for p in products:
            print(f"  Product id={p.id[:8]}... | shop_id={p.shop_id[:8]}... | name='{p.name}' | original_price={p.original_price} | discount_price={p.discount_price} | qty={p.quantity} | is_active={p.is_active}")

        print("\n=== ORDERS IN DATABASE ===")
        orders = db.query(Order).all()
        print(f"Total Orders: {len(orders)}")
        for o in orders:
            print(f"  Order id={o.id} | cust={o.customer_id[:8]}... | shop={o.shop_id[:8]}... | status='{o.status}' | pay_status='{o.payment_status}' | type='{o.order_type}' | created={o.created_at}")

        print("\n=== RESERVATIONS IN DATABASE ===")
        reservations = db.query(Reservation).all()
        print(f"Total Reservations: {len(reservations)}")
        for r in reservations:
            print(f"  Reservation id={r.id} | user={r.user_id[:8]}... | shop={r.shop_id[:8]}... | prod={r.product_id[:8]}... | status='{r.status}' | code='{r.pickup_code}' | total={r.total_price}")

        print("\n=== NOTIFICATIONS IN DATABASE ===")
        notifs = db.query(Notification).all()
        print(f"Total Notifications: {len(notifs)}")
        for n in notifs:
            print(f"  Notification id={n.id[:8]}... | user_id={n.user_id[:8]}... | title='{n.title}' | msg='{n.message}' | read={n.is_read}")

        print("\n=== DISTINCT ROLES IN DB ===")
        distinct_roles = db.execute(text("SELECT DISTINCT role FROM users")).fetchall()
        print("Roles found:", [r[0] for r in distinct_roles])

if __name__ == "__main__":
    inspect()
