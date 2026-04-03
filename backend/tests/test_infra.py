from __future__ import annotations

import os
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy import Engine
    from sqlalchemy.engine.reflection import Inspector


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Provide a TestClient for the FastAPI app.

    Import the app lazily and only after confirming DATABASE_URL is set, so that
    test collection does not fail when the environment is not configured.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        pytest.skip(
            "DATABASE_URL is not configured; skipping integration tests that require the database.",
            allow_module_level=True,
        )
    from fastapi.testclient import TestClient
    from main import app

    return TestClient(app)


# TC01 & TC02: Server Startup & Health + Routing
def test_server_startup_and_docs(client: TestClient) -> None:
    """Verify Swagger UI loads and server is up."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "Swagger UI" in response.text

    """Verify the /users endpoint exists and returns 200."""
    response = client.get("/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# TC03: Database Connection Accessibility
def test_database_connection(db_engine: Engine) -> None:
    """Verify we can connect to the DB."""
    try:
        connection = db_engine.connect()
        assert not connection.closed
        connection.close()
    except Exception as exc:
        pytest.fail(f"Database connection failed: {exc}")


# TC04: Automated Schema Generation
def test_schema_generation_users_table(db_inspector: Inspector) -> None:
    """Verify 'users' table and columns exist."""
    # Check if table exists
    tables = db_inspector.get_table_names()
    assert "users" in tables, "Table 'users' was not created by SQLAlchemy"
    # Check columns
    columns = {col["name"]: col for col in db_inspector.get_columns("users")}
    expected_columns = ["id", "name", "role", "position", "seniority"]
    for col_name in expected_columns:
        assert col_name in columns, f"Column {col_name} is missing from 'users' table"
    # Validate primary key and coarse type expectations
    pk = db_inspector.get_pk_constraint("users")
    assert pk.get("constrained_columns") == ["id"], "Primary key must be 'id'"
    assert "int" in str(columns["id"]["type"]).lower(), "'id' must be Integer"
    for col_name in ["name", "role", "position", "seniority"]:
        col_type = str(columns[col_name]["type"]).lower()
        assert ("char" in col_type) or ("text" in col_type), (
            f"'{col_name}' must be String-like"
        )
