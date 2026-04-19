from collections.abc import Generator

import models
import schemas
from database import SessionLocal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

router = APIRouter(tags=["Users"])


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/health", status_code=200)
async def health_check() -> dict[str, str]:
    """Verify the status of the application.

    Returns:
        A dictionary with status and message fields.
    """
    return {"status": "OK", "message": "Backend is running smoothly"}


@router.get("/users", response_model=list[schemas.UserResponse])
async def get_users(db: Session = Depends(get_db)) -> list[models.User]:
    """Return the list of all users.

    Returns:
        A list of users serialised via UserResponse.

    Raises:
        HTTPException: 404 if no users exist.
        HTTPException: 500 if a database error occurs.
    """
    try:
        users = db.query(models.User).order_by(models.User.id.asc()).all()
    except SQLAlchemyError as err:
        raise HTTPException(
            status_code=500, detail="Could not load users from database."
        ) from err

    if not users:
        raise HTTPException(status_code=404, detail="No users found")

    return users
