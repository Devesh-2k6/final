import sqlite3
import os
import sys
import psycopg2
from config import settings

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("=" * 65)
print("🔍 DATABASE TABLES AUDIT & SCHEMA VERIFICATION")
print("=" * 65)

# 1. Inspect Local Database Tables
print("\n[1/2] 📁 Checking Local Database Tables (expirygo_local_dev.db)...")
db_file = os.path.join(os.path.dirname(__file__), "expirygo_local_dev.db")
if os.path.exists(db_file):
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [row[0] for row in cur.fetchall()]
    print(f"✔ Found {len(tables)} Tables in Local Database:\n")
    for tbl in tables:
        try:
            cur.execute(f"SELECT COUNT(*) FROM \"{tbl}\";")
            count = cur.fetchone()[0]
        except:
            count = 0
        cur.execute(f"PRAGMA table_info(\"{tbl}\");")
        cols = [c[1] for c in cur.fetchall()]
        print(f" • {tbl:<16} | Rows: {count:>4} | Columns ({len(cols)}): {', '.join(cols[:5])}...")
    conn.close()
else:
    print("❌ Local database file not found.")

# 2. Check Supabase Remote Database
print("\n[2/2] ☁️ Checking Remote Supabase Database Tables...")
supabase_url = settings.DATABASE_URL
print(f"Target URL: {supabase_url[:35]}...@{supabase_url.split('@')[-1] if '@' in supabase_url else ''}")

try:
    pg_conn = psycopg2.connect(supabase_url, connect_timeout=6)
    pg_cur = pg_conn.cursor()
    pg_cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    pg_tables = [r[0] for r in pg_cur.fetchall()]
    print(f"✔ Successfully connected to Supabase! Found {len(pg_tables)} tables in 'public' schema:\n")
    for t in pg_tables:
        pg_cur.execute(f'SELECT COUNT(*) FROM "{t}";')
        cnt = pg_cur.fetchone()[0]
        print(f" • {t:<16} | Rows: {cnt:>4}")
    pg_conn.close()
except Exception as e:
    print(f"⚠️ Remote Supabase connection note: {e}")
    print("\n📌 Supabase Cloud Connection Status:")
    print(" • Remote Host: db.gkyghgomyieqelsqudpz.supabase.co:5432")
    print(" • Table Definitions in Code: User, Shop, Product, Reservation, Order, Favorite, Follower, Review, Notification, PantryItem")
    print(" • Auto-Migration Hook: Base.metadata.create_all(bind=engine) will automatically create all tables upon successful cloud connection.")

print("\n" + "=" * 65)
