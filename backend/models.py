from sqlalchemy import Column, Integer, String, Enum
from database import Base
import enum

class RoleEnum(str, enum.Enum):
    user = "User"
    manager = "Manager"

class User(Base):
    """
    Database model for users
    Maps directly the Python class structure to the PostgreSQL table.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default=RoleEnum.user.value)
    position = Column(String, nullable=False)
    seniority = Column(String, nullable=False)