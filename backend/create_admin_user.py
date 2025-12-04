from database import SessionLocal, engine, Base
from models import User
from auth import get_password_hash

def create_admin():
    # Create all tables first
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            print("Creating admin user...")
            user = User(username="admin", hashed_password=get_password_hash("admin"), role="admin")
            db.add(user)
            db.commit()
            print("Admin user created successfully.")
        else:
            print("Admin user already exists. Resetting password to 'admin'...")
            user.hashed_password = get_password_hash("admin")
            db.commit()
            print("Admin password reset successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
