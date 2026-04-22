from collections.abc import Generator
from datetime import date, datetime, timezone

import models
import schemas
from database import SessionLocal
from fastapi import APIRouter, Depends, HTTPException, status
from routers.auth import get_current_user
from sqlalchemy import desc
from sqlalchemy.orm import Session

router = APIRouter(prefix="/leave", tags=["Leave Management"])


def get_db() -> Generator[Session, None, None]:
    """Dependency to provide a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def calculate_available_days(hire_date: date, used_days: int) -> float:
    """Calculate the available leave days based on months worked."""
    today = datetime.now(timezone.utc).date()
    months_worked = (today.year - hire_date.year) * 12 + (today.month - hire_date.month)
    total_earned = max(0, months_worked * 1.5)
    return float(total_earned - used_days)


@router.post(
    "/request",
    response_model=schemas.LeaveRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_leave_request(
    request: schemas.LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.LeaveRequest:
    """Create a new leave request for the currently authenticated user."""
    days_requested = (request.end_date - request.start_date).days + 1

    overlapping_request = (
        db.query(models.LeaveRequest)
        .filter(
            models.LeaveRequest.user_id == current_user.id,
            models.LeaveRequest.status != models.LeaveStatusEnum.REJECTED,
            # Logica de suprapunere: Start1 <= End2 ȘI End1 >= Start2
            models.LeaveRequest.start_date <= request.end_date,
            models.LeaveRequest.end_date >= request.start_date,
        )
        .first()
    )
    if overlapping_request:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Requested dates overlap with an existing request (ID: {overlapping_request.id})",
        )

    approved_or_pending = (
        db.query(models.LeaveRequest)
        .filter(
            models.LeaveRequest.user_id == current_user.id,
            models.LeaveRequest.status != models.LeaveStatusEnum.REJECTED,
        )
        .all()
    )
    used_days = sum(req.days_requested for req in approved_or_pending)

    available_days = calculate_available_days(current_user.hire_date, used_days)
    if days_requested > available_days:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough leave days. Requested: {days_requested}, Available: {available_days}",
        )

    new_request = models.LeaveRequest(
        user_id=current_user.id,
        start_date=request.start_date,
        end_date=request.end_date,
        days_requested=days_requested,
        status=models.LeaveStatusEnum.PENDING,
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return new_request


@router.get("/my-requests", response_model=list[schemas.LeaveRequestResponse])
def get_user_leave_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[models.LeaveRequest]:
    """Retrieve all leave requests for the currently authenticated user."""
    requests = (
        db.query(models.LeaveRequest)
        .filter(models.LeaveRequest.user_id == current_user.id)
        .order_by(desc(models.LeaveRequest.created_at))
        .all()
    )

    if not requests:
        raise HTTPException(
            status_code=404, detail="No leave requests found for your account"
        )

    return requests


def require_manager(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Dependency care blochează accesul utilizatorilor simpli (HTTP 403 Forbidden)."""
    if current_user.role != models.RoleEnum.manager.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to Managers only",
        )
    return current_user


@router.get("/requests", response_model=list[schemas.LeaveRequestResponse])
def get_all_pending_requests(
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),  # <-- Doar managerii trec de asta!
) -> list[models.LeaveRequest]:
    """Retrieve all PENDING leave requests across the company (Manager only)."""
    requests = (
        db.query(models.LeaveRequest)
        .filter(models.LeaveRequest.status == models.LeaveStatusEnum.PENDING)
        .order_by(desc(models.LeaveRequest.created_at))
        .all()
    )
    return requests


@router.patch(
    "/requests/{request_id}/approve", response_model=schemas.LeaveRequestResponse
)
def approve_leave_request(
    request_id: int,
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> models.LeaveRequest:
    """Approve a specific pending leave request (Manager only)."""
    leave_req = (
        db.query(models.LeaveRequest)
        .filter(models.LeaveRequest.id == request_id)
        .first()
    )

    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave_req.status != models.LeaveStatusEnum.PENDING:
        raise HTTPException(
            status_code=400, detail="Only PENDING requests can be approved"
        )

    if leave_req.user_id == manager.id:
        raise HTTPException(
            status_code=403, detail="Managers cannot approve their own requests"
        )

    leave_req.status = models.LeaveStatusEnum.APPROVED
    leave_req.reviewed_by = manager.id
    leave_req.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(leave_req)
    return leave_req


@router.patch(
    "/requests/{request_id}/reject", response_model=schemas.LeaveRequestResponse
)
def reject_leave_request(
    request_id: int,
    payload: schemas.LeaveReject,
    db: Session = Depends(get_db),
    manager: models.User = Depends(require_manager),
) -> models.LeaveRequest:
    """Reject a specific pending leave request with an optional reason (Manager only)."""
    leave_req = (
        db.query(models.LeaveRequest)
        .filter(models.LeaveRequest.id == request_id)
        .first()
    )

    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave_req.status != models.LeaveStatusEnum.PENDING:
        raise HTTPException(
            status_code=400, detail="Only PENDING requests can be rejected"
        )

    if leave_req.user_id == manager.id:
        raise HTTPException(
            status_code=403, detail="Managers cannot reject their own requests"
        )

    leave_req.status = models.LeaveStatusEnum.REJECTED
    leave_req.reviewed_by = manager.id
    leave_req.reviewed_at = datetime.now(timezone.utc)
    leave_req.rejection_reason = payload.rejection_reason

    db.commit()
    db.refresh(leave_req)
    return leave_req
