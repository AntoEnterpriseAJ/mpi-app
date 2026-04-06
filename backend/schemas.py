from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, model_validator


class LeaveStatus(str, Enum):
    """Enumeration of possible statuses for a leave request payload."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class LeaveRequestCreate(BaseModel):
    """Schema for creating a new leave request."""

    user_id: int
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_dates(self) -> "LeaveRequestCreate":
        """Ensure end_date is after or equal to start_date.

        Returns:
            The validated model.

        Raises:
            ValueError: If end_date is before start_date.
        """
        if self.end_date < self.start_date:
            raise ValueError("end_date must be strictly after or equal to start_date")
        return self


class LeaveRequestResponse(BaseModel):
    """Schema for returning a leave request to the client."""

    id: int
    user_id: int
    start_date: date
    end_date: date
    days_requested: int
    status: LeaveStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    """Schema for returning user data to the client."""

    id: int
    name: str
    role: str
    position: str
    seniority: str

    model_config = ConfigDict(from_attributes=True)
