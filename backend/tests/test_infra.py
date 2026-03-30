import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# TC01 & TC02: Server Startup & Health + Routing
def test_server_startup_and_docs():
    """Verify Swagger UI loads and server is up."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "Swagger UI" in response.text

def test_users_endpoint_routing():
    """Verify the /users endpoint exists and returns 200."""
    response = client.get("/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# TC03: Database Connection Accessibility
def test_database_connection(db_engine):
    """Verify we can connect to the DB."""
    try:
        connection = db_engine.connect()
        assert not connection.closed
        connection.close()
    except Exception as e:
        pytest.fail(f"Database connection failed: {e}")

# TC04: Automated Schema Generation
def test_schema_generation_users_table(db_inspector):
    """Verify 'users' table and columns exist."""
    # Check if table exists
    tables = db_inspector.get_table_names()
    assert "users" in tables, "Table 'users' was not created by SQLAlchemy"

    # Check columns
    columns = {col['name']: str(col['type']) for col in db_inspector.get_columns("users")}
    
    expected_columns = ["id", "name", "role", "position", "seniority"]
    for col_name in expected_columns:
        assert col_name in columns, f"Column {col_name} is missing from 'users' table"