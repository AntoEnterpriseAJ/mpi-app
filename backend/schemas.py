from pydantic import BaseModel
from typing import Optional

class UserResponse(BaseModel):
    id: int
    name: str
    role: str
    position: str
    seniority: str

    class Config:
        from_attributes = True