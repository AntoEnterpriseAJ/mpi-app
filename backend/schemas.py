from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    """Pydantic schema for serialising a user in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str
    position: str
    seniority: str
