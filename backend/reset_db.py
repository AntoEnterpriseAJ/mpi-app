from datetime import date

import bcrypt
import models
from database import SessionLocal, engine


def get_password_hash(password: str) -> str:
    """Generează hash-ul pentru o parolă folosind direct librăria bcrypt."""
    pwd_bytes = password.encode("utf-8")
    if len(pwd_bytes) > 72:
        raise ValueError("Password exceeds 72 bytes after UTF-8 encoding")
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode("utf-8")


def reset_and_seed() -> None:
    """Drops all tables, recreates them, and seeds initial mock data."""
    print("🗑️  Dropping all existing tables...")
    models.Base.metadata.drop_all(bind=engine)

    print("🏗️  Creating new tables based on current models...")
    models.Base.metadata.create_all(bind=engine)

    print("🌱 Seeding mock users...")
    db = SessionLocal()
    try:
        default_password = get_password_hash("password123")

        mock_users = [
            models.User(
                email="ion@example.com",
                password_hash=default_password,
                name="Ion Popescu",
                role=models.RoleEnum.user.value,
                position="Backend Developer",
                seniority="Mid",
                hire_date=date(2022, 1, 15),
            ),
            models.User(
                email="maria@example.com",
                password_hash=default_password,
                name="Maria Ionescu",
                role=models.RoleEnum.manager.value,
                position="Engineering Manager",
                seniority="Senior",
                hire_date=date(2020, 5, 10),
            ),
        ]
        db.add_all(mock_users)
        db.commit()
        print("✅ Database reset and seeded successfully!")
        print("🔑 Test accounts:")
        print("   - User: ion@example.com / password123")
        print("   - Manager: maria@example.com / password123")
    except Exception as e:
        print(f"❌ An error occurred during seeding: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
