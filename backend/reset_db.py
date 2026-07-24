from dotenv import load_dotenv
load_dotenv()

from db.session import engine
from db.models import Base

print("Dropping all existing tables...")
Base.metadata.drop_all(bind=engine)

print("Creating all tables from new schema...")
Base.metadata.create_all(bind=engine)

print("Database reset successfully! ExpiryGo 2.0 schema is ready.")
