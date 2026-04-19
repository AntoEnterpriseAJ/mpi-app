import os
from collections.abc import Generator

import models
from database import SessionLocal, engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import leave, users
from sqlalchemy.orm import Session

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API for Leave Management System",
    description="Backend API for the Leave Management System",
    version="1.0.0",
)

_allowed_origins_env = os.getenv("ALLOWED_ORIGINS")


def _parse_allowed_origins(raw_origins: str | None) -> list[str]:
    default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    if not raw_origins or not raw_origins.strip():
        return default_origins

    parsed_origins = [
        origin.strip()
        for origin in raw_origins.split(",")
        if origin.strip() and origin.strip() != "*"
    ]
    return parsed_origins or default_origins


_allowed_origins = _parse_allowed_origins(_allowed_origins_env)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
app.include_router(leave.router)
