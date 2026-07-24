from sqlalchemy import create_engine, inspect

db_url = "postgresql://postgres:Sureshkumar12345%40@db.hfdgntprwcdjazbikozb.supabase.co:5432/postgres"
try:
    engine = create_engine(db_url)
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    print("Users table columns:", columns)
except Exception as e:
    print("Error:", e)
