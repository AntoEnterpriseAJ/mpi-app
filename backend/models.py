import enum

from database import Base
from sqlalchemy import Column, Integer, String


class RoleEnum(str, enum.Enum):
    """Allowed role values for a user."""

    user = "User"
    manager = "Manager"


class User(Base):
    """Database model for users.

    Maps directly the Python class structure to the PostgreSQL table.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default=RoleEnum.user.value)
    position = Column(String, nullable=False)
    seniority = Column(String, nullable=False)
