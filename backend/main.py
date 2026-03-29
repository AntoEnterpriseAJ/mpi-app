from collections.abc import Generator

import models
from database import SessionLocal, engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users
from sqlalchemy.orm import Session

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API for Leave Management System",
    description="Backend API for the Leave Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.include_router(users.router)
