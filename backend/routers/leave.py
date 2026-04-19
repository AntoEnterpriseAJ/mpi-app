from collections.abc import Generator
from datetime import date, datetime, timezone
from typing import NoReturn

import models
import schemas
from database import SessionLocal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

router = APIRouter(prefix="/leave", tags=["Leave Management"])


def get_db() -> Generator[Session, None, None]:
    """Dependency to provide a database session.

    Yields:
        Session: A SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def calculate_available_days(hire_date: date, used_days: int) -> float:
    """Calculate the available leave days based on months worked.

    Rule: 1.5 leave days per month worked.

    Args:
        hire_date: The date the employee was hired.
        used_days: The number of days already approved or pending.

    Returns:
        The remaining leave balance.
    """
    today = datetime.now(timezone.utc).date()
    months_worked = (today.year - hire_date.year) * 12 + (today.month - hire_date.month)
    total_earned = max(0, months_worked * 1.5)
    return float(total_earned - used_days)


def _raise_user_not_found() -> NoReturn:
    raise HTTPException(status_code=404, detail="User not found")


def _raise_insufficient_leave_days(
    days_requested: int, available_days: float
) -> NoReturn:
    raise HTTPException(
        status_code=400,
        detail=f"Not enough leave days. Requested: {days_requested}, Available: {available_days}",
    )


@router.post(
    "/request",
    response_model=schemas.LeaveRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_leave_request(
    request: schemas.LeaveRequestCreate, db: Session = Depends(get_db)
) -> models.LeaveRequest:
    """Create a new leave request for a user.

    Validates if the user exists and has enough leave balance.

    Args:
        request: The leave request payload containing dates.
        db: The database session.

    Returns:
        The created leave request record.

    Raises:
        HTTPException: If user is not found or balance is insufficient.
    """
    try:
        user = db.query(models.User).filter(models.User.id == request.user_id).first()
        if not user:
            _raise_user_not_found()

        days_requested = (request.end_date - request.start_date).days + 1

        approved_or_pending = (
            db.query(models.LeaveRequest)
            .filter(
                models.LeaveRequest.user_id == user.id,
                models.LeaveRequest.status != models.LeaveStatusEnum.REJECTED,
            )
            .all()
        )
        used_days = sum(req.days_requested for req in approved_or_pending)

        available_days = calculate_available_days(user.hire_date, used_days)
        if days_requested > available_days:
            _raise_insufficient_leave_days(days_requested, available_days)

        new_request = models.LeaveRequest(
            user_id=request.user_id,
            start_date=request.start_date,
            end_date=request.end_date,
            days_requested=days_requested,
            status=models.LeaveStatusEnum.PENDING,
        )

        db.add(new_request)
        db.commit()
        db.refresh(new_request)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as err:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create leave request due to a database error.",
        ) from err

    return new_request


@router.get("/my-requests/{user_id}", response_model=list[schemas.LeaveRequestResponse])
def get_user_leave_requests(
    user_id: int, db: Session = Depends(get_db)
) -> list[models.LeaveRequest]:
    """Retrieve all leave requests for a specific user.

    Args:
        user_id: The ID of the user.
        db: The database session.

    Returns:
        A list of leave requests ordered chronologically (newest first).

    Raises:
        HTTPException: If no requests are found.
    """
    try:
        requests = (
            db.query(models.LeaveRequest)
            .filter(models.LeaveRequest.user_id == user_id)
            .order_by(desc(models.LeaveRequest.created_at))
            .all()
        )
    except SQLAlchemyError as err:
        raise HTTPException(
            status_code=500,
            detail="Could not load leave requests due to a database error.",
        ) from err

    if not requests:
        raise HTTPException(
            status_code=404, detail="No leave requests found for this user"
        )

    return requests
