from fastapi import APIRouter, HTTPException
from typing import List
import schemas

router = APIRouter(tags=["Users"])

MOCK_USERS = [
    {"id": 1, "name": "Ion Popescu", "role": "User", "position": "Backend Developer", "seniority": "Mid"},
    {"id": 2, "name": "Maria Ionescu", "role": "Manager", "position": "Engineering Manager", "seniority": "Senior"}
]

@router.get("/health", status_code=200)
async def health_check():
    """Simple Endpoint in order to verify the status of the application."""
    return {"status": "OK", "message": "Backend is running smoothly"}

@router.get("/users", response_model=List[schemas.UserResponse])
async def get_users():
    """ Returns the list of users (currently mock data)."""
    try:
        if not MOCK_USERS:
            raise HTTPException(status_code=404, detail="No users found")
        return MOCK_USERS
    except HTTPException:
        # Re-raise HTTP exceptions (like the 404 above) so they are not converted to 500 errors
        raise
    except Exception:
        # Return a generic 500 error without exposing internal exception details
        raise HTTPException(status_code=500, detail="Internal server error")