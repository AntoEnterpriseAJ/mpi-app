import pytest
from sqlalchemy import create_engine, inspect
from database import SQLALCHEMY_DATABASE_URL

@pytest.fixture(scope="session")
def db_engine():
    # Use the same URL defined in your .env
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    yield engine
    engine.dispose()

@pytest.fixture(scope="session")
def db_inspector(db_engine):
    return inspect(db_engine)