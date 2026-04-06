from datetime import date

import models
from database import SessionLocal, engine


def reset_and_seed() -> None:
    """Drops all tables, recreates them, and seeds initial mock data."""
    print("🗑️  Dropping all existing tables...")
    models.Base.metadata.drop_all(bind=engine)

    print("🏗️  Creating new tables based on current models...")
    models.Base.metadata.create_all(bind=engine)

    print("🌱 Seeding mock users...")
    db = SessionLocal()
    try:
        mock_users = [
            models.User(
                name="Ion Popescu",
                role=models.RoleEnum.user.value,
                position="Backend Developer",
                seniority="Mid",
                hire_date=date(2022, 1, 15),  # Angajat in 2022
            ),
            models.User(
                name="Maria Ionescu",
                role=models.RoleEnum.manager.value,
                position="Engineering Manager",
                seniority="Senior",
                hire_date=date(2020, 5, 10),  # Angajata in 2020
            ),
        ]
        db.add_all(mock_users)
        db.commit()
        print("✅ Database reset and seeded successfully!")
    except Exception as e:
        print(f"❌ An error occurred during seeding: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
