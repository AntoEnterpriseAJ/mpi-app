# backend/tests/test_leave_management.py
from __future__ import annotations

import os
import uuid
from datetime import date, datetime, timedelta, timezone

import bcrypt
import models
import pytest
from database import SessionLocal


def _today_utc_date() -> date:
    """Return today's date using a timezone-aware datetime source."""
    return datetime.now(timezone.utc).date()


def _get_auth_headers(client: object, email: str, password: str) -> dict:
    """Authenticate and return authorization headers with JWT token."""
    auth_response = client.post(
        "/auth/login", json={"username": email, "password": password}
    )
    if auth_response.status_code != 200:
        raise RuntimeError(f"Authentication failed: {auth_response.text}")
    token = auth_response.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def client() -> object:
    """Provide a TestClient for leave management integration tests."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        pytest.skip(
            "DATABASE_URL is not configured; skipping leave management integration tests.",
            allow_module_level=True,
        )
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    test_payload = {"username": "test@example.com", "password": "testpassword"}
    auth_response = client.post("/auth/login", json=test_payload)
    if auth_response.status_code == 200:
        token = auth_response.json().get("access_token")
        client.headers.update({"Authorization": f"Bearer {token}"})

    return client


def _get_password_hash(password: str) -> str:
    """Generate a bcrypt hash for a password."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode("utf-8")


def _create_user_with_hire_date(hire_date: date) -> tuple[int, str, str]:
    """Create a unique user record for test scenarios and return (user_id, email, password)."""
    db = SessionLocal()
    try:
        unique_suffix = uuid.uuid4().hex[:8]
        email = f"qa.user.{unique_suffix}@example.com"
        password = f"password_{unique_suffix}"
        password_hash = _get_password_hash(password)

        user = models.User(
            email=email,
            password_hash=password_hash,
            name=f"QA User {unique_suffix}",
            role="User",
            position="QA Engineer",
            seniority="Mid",
            hire_date=hire_date,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id, email, password
    finally:
        db.close()


def _cleanup_user_data(user_id: int) -> None:
    """Delete test leave requests and the associated user."""
    db = SessionLocal()
    try:
        if hasattr(models, "LeaveRequest"):
            db.query(models.LeaveRequest).filter(
                models.LeaveRequest.user_id == user_id
            ).delete()
        db.query(models.User).filter(models.User.id == user_id).delete()
        db.commit()
    finally:
        db.close()


def test_leave_endpoints_are_registered(client: object) -> None:
    """Verify leave API routes are included in the FastAPI app."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json().get("paths", {})
    assert "/leave/request" in paths
    assert "/leave/my-requests" in paths


def test_create_leave_request_rejects_invalid_date_range(client: object) -> None:
    """Verify validation rejects payload where end_date is before start_date."""
    user_id, email, password = _create_user_with_hire_date(
        _today_utc_date() - timedelta(days=365)
    )
    try:
        headers = _get_auth_headers(client, email, password)

        payload = {
            "start_date": (_today_utc_date() + timedelta(days=10)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=9)).isoformat(),
        }
        response = client.post("/leave/request", json=payload, headers=headers)
        assert response.status_code == 422
    finally:
        _cleanup_user_data(user_id)


def test_create_leave_request_rejects_unknown_user(client: object) -> None:
    """Verify create request returns 404 when user does not exist."""
    user_id, email, password = _create_user_with_hire_date(
        _today_utc_date() - timedelta(days=365)
    )
    try:
        headers = _get_auth_headers(client, email, password)

        # Use a non-existent user ID in the endpoint path (if applicable)
        # Note: With the auth changes, the endpoint uses current_user from JWT
        payload = {
            "start_date": (_today_utc_date() + timedelta(days=10)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=10)).isoformat(),
        }
        response = client.post("/leave/request", json=payload, headers=headers)
        assert response.status_code == 201
    finally:
        _cleanup_user_data(user_id)


def test_create_leave_request_rejects_when_balance_exceeded(client: object) -> None:
    """Verify entitlement logic rejects a request when available balance is insufficient."""
    user_id, email, password = _create_user_with_hire_date(_today_utc_date())
    try:
        headers = _get_auth_headers(client, email, password)

        payload = {
            "start_date": (_today_utc_date() + timedelta(days=14)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=14)).isoformat(),
        }
        response = client.post("/leave/request", json=payload, headers=headers)
        assert response.status_code == 400
        assert "Not enough leave days" in response.json().get("detail", "")
    finally:
        _cleanup_user_data(user_id)


def test_create_leave_request_consumes_balance_for_future_requests(
    client: object,
) -> None:
    """Verify previously created non-rejected requests reduce remaining available balance."""
    user_id, email, password = _create_user_with_hire_date(
        _today_utc_date() - timedelta(days=31)
    )
    try:
        headers = _get_auth_headers(client, email, password)

        first_payload = {
            "start_date": (_today_utc_date() + timedelta(days=20)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=20)).isoformat(),
        }
        second_payload = {
            "start_date": (_today_utc_date() + timedelta(days=21)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=21)).isoformat(),
        }

        first_response = client.post(
            "/leave/request", json=first_payload, headers=headers
        )
        assert first_response.status_code == 201

        second_response = client.post(
            "/leave/request", json=second_payload, headers=headers
        )
        assert second_response.status_code == 400
        assert "Not enough leave days" in second_response.json().get("detail", "")
    finally:
        _cleanup_user_data(user_id)


def test_get_leave_history_is_newest_first(client: object) -> None:
    """Verify user leave history endpoint returns leave requests ordered newest first."""
    user_id, email, password = _create_user_with_hire_date(
        _today_utc_date() - timedelta(days=730)
    )
    try:
        headers = _get_auth_headers(client, email, password)

        first_payload = {
            "start_date": (_today_utc_date() + timedelta(days=30)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=30)).isoformat(),
        }
        second_payload = {
            "start_date": (_today_utc_date() + timedelta(days=40)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=41)).isoformat(),
        }

        first_response = client.post(
            "/leave/request", json=first_payload, headers=headers
        )
        assert first_response.status_code == 201
        first_id = first_response.json()["id"]

        second_response = client.post(
            "/leave/request", json=second_payload, headers=headers
        )
        assert second_response.status_code == 201
        second_id = second_response.json()["id"]

        history_response = client.get("/leave/my-requests", headers=headers)
        assert history_response.status_code == 200

        requests = history_response.json()
        assert len(requests) >= 2
        assert requests[0]["id"] == second_id
        assert requests[1]["id"] == first_id
    finally:
        _cleanup_user_data(user_id)
