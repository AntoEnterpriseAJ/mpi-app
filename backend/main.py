from fastapi import FastAPI
try:
    from backend.routers import users
except ImportError:
    from routers import users

app = FastAPI(
    title="MPI App API",
    description="Backend API for the Leave Management System",
    version="1.0.0"
)

app.include_router(users.router)