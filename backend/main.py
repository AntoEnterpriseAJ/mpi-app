from fastapi import FastAPI
from routers import users
from database import engine, SessionLocal
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MPI App API",
    description="Backend API for the Leave Management System",
    version="1.0.0"
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.include_router(users.router)