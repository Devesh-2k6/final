import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-pytest-only"

# Register ORM models on Base.metadata before create_all
from db.models import Product, Shop, User  # noqa: F401
