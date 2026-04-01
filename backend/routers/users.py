import schemas
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["Users"])

MOCK_USERS = [
    {
        "id": 1,
        "name": "Ion Popescu",
        "role": "User",
        "position": "Backend Developer",
        "seniority": "Mid",
    },
    {
        "id": 2,
        "name": "Maria Ionescu",
        "role": "Manager",
        "position": "Engineering Manager",
        "seniority": "Senior",
    },
]


@router.get("/health", status_code=200)
async def health_check() -> dict[str, str]:
    """Verify the status of the application.

    Returns:
        A dictionary with status and message fields.
    """
    return {"status": "OK", "message": "Backend is running smoothly"}


@router.get("/users", response_model=list[schemas.UserResponse])
async def get_users() -> list[dict]:
    """Return the list of all users.

    Returns:
        A list of user dictionaries serialised via UserResponse.

    Raises:
        HTTPException: 404 if no users exist.
        HTTPException: 500 if an unexpected error occurs.
    """
    if not MOCK_USERS:
        raise HTTPException(status_code=404, detail="No users found")
    try:
        return MOCK_USERS
    except Exception as err:
        # Return a generic 500 error without exposing internal exception details
        raise HTTPException(status_code=500, detail="Internal server error") from err
