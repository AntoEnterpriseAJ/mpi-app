import os
from collections.abc import Generator
from pathlib import Path

import pytest
from dotenv import load_dotenv
from sqlalchemy import Engine, create_engine, inspect
from sqlalchemy.engine.reflection import Inspector

# Ensure pytest loads repo-level .env before any fixture reads env vars.
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")


@pytest.fixture(scope="session")
def db_engine() -> Generator[Engine, None, None]:
    """Create and dispose a SQLAlchemy engine for integration tests."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        pytest.skip("DATABASE_URL is not set; skipping database tests.")
    engine = create_engine(database_url)
    yield engine
    engine.dispose()


@pytest.fixture(scope="session")
def db_inspector(db_engine: Engine) -> Inspector:
    """Expose a DB inspector for schema assertions."""
    return inspect(db_engine)
