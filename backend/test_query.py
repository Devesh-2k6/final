from sqlalchemy.orm import Session
from db.session import SessionLocal
from db.models import User

db = SessionLocal()
try:
    print("Querying user...")
    user = db.query(User).filter(User.email == "customer@test.com").first()
    print("User queried successfully:", user)
except Exception as e:
    import traceback
    print("Error querying user:")
    traceback.print_exc()
finally:
    db.close()
