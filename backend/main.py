import os
from collections.abc import Generator

import models
from bootstrap import ensure_schema_compatibility, seed_default_users_if_empty
from database import SessionLocal, engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import leave, users
from sqlalchemy.orm import Session

models.Base.metadata.create_all(bind=engine)
ensure_schema_compatibility()
seed_default_users_if_empty()

app = FastAPI(
    title="API for Leave Management System",
    description="Backend API for the Leave Management System",
    version="1.0.0",
)

_allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
_allowed_origins_raw = (
    _allowed_origins_env
    if _allowed_origins_env and _allowed_origins_env.strip()
    else "http://localhost:5173,http://127.0.0.1:5173"
)
_allowed_origins = [
    o.strip() for o in _allowed_origins_raw.split(",") if o.strip() and o.strip() != "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
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
