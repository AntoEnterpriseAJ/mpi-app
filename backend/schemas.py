from pydantic import BaseModel


class UserResponse(BaseModel):
    """Pydantic schema for serialising a user in API responses."""

    id: int
    name: str
    role: str
    position: str
    seniority: str

    class Config:
        """Pydantic model configuration."""

        from_attributes = True
