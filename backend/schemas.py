from pydantic import BaseModel

class UserResponse(BaseModel):
    id: int
    name: str
    role: str
    position: str
    seniority: str

    class Config:
        from_attributes = True