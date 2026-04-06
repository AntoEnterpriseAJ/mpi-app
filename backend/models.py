import enum
from datetime import date, datetime, timezone

from database import Base
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship


class RoleEnum(str, enum.Enum):
    """Enumeration of user roles within the application."""

    user = "User"
    manager = "Manager"


class LeaveStatusEnum(str, enum.Enum):
    """Enumeration of possible statuses for a leave request."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(Base):
    """Database model representing an employee/user in the system."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default=RoleEnum.user.value)
    position = Column(String, nullable=False)
    seniority = Column(String, nullable=False)
    hire_date = Column(Date, nullable=False, default=date.today)

    leave_requests = relationship("LeaveRequest", back_populates="user")


class LeaveRequest(Base):
    """Database model representing a leave request submitted by a user."""

    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days_requested = Column(Integer, nullable=False)
    status = Column(SQLEnum(LeaveStatusEnum), default=LeaveStatusEnum.PENDING)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="leave_requests")
