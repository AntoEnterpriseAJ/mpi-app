from __future__ import annotations

from datetime import date

import models
from database import SessionLocal, engine
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

DEFAULT_USERS = [
    {
        "id": 1,
        "name": "Ion Popescu",
        "role": models.RoleEnum.user.value,
        "position": "Backend Developer",
        "seniority": "Mid",
        "hire_date": date(2022, 1, 15),
    },
    {
        "id": 2,
        "name": "Maria Ionescu",
        "role": models.RoleEnum.manager.value,
        "position": "Engineering Manager",
        "seniority": "Senior",
        "hire_date": date(2020, 5, 10),
    },
]


def _users_has_hire_date_column() -> bool:
    """Check if users table already contains the hire_date column."""
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    return "hire_date" in user_columns


def ensure_schema_compatibility() -> None:
    """Apply backward-compatible schema fixes for legacy databases."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    if _users_has_hire_date_column():
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN hire_date DATE"))
        if connection.dialect.name == "sqlite":
            connection.execute(
                text("UPDATE users SET hire_date = DATE('now') WHERE hire_date IS NULL")
            )
        else:
            connection.execute(
                text(
                    "UPDATE users SET hire_date = CURRENT_DATE WHERE hire_date IS NULL"
                )
            )


def seed_default_users_if_empty() -> None:
    """Insert default users when database starts empty."""
    db: Session = SessionLocal()
    try:
        if db.query(models.User.id).first() is not None:
            return

        db.add_all(
            [
                models.User(
                    id=user["id"],
                    name=user["name"],
                    role=user["role"],
                    position=user["position"],
                    seniority=user["seniority"],
                    hire_date=user["hire_date"],
                )
                for user in DEFAULT_USERS
            ]
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    finally:
        db.close()
