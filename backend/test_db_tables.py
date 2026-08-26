from sqlalchemy import create_engine, inspect
from config import settings

db_url = settings.DATABASE_URL
try:
    engine = create_engine(db_url)
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    print("Users table columns:", columns)
except Exception as e:
    print("Error:", e)
