from __future__ import annotations

import os
import uuid
from datetime import date, timedelta

import models
import pytest
from database import SessionLocal


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

    return TestClient(app)


def _create_user_with_hire_date(hire_date: date) -> int:
    """Create a unique user record for test scenarios and return user id."""
    db = SessionLocal()
    try:
        unique_suffix = uuid.uuid4().hex[:8]
        user = models.User(
            name=f"QA User {unique_suffix}",
            role="User",
            position="QA Engineer",
            seniority="Mid",
            hire_date=hire_date,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id
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
    assert "/leave/my-requests/{user_id}" in paths


def test_create_leave_request_rejects_invalid_date_range(client: object) -> None:
    """Verify validation rejects payload where end_date is before start_date."""
    user_id = _create_user_with_hire_date(date.today() - timedelta(days=365))
    try:
        payload = {
            "user_id": user_id,
            "start_date": (date.today() + timedelta(days=10)).isoformat(),
            "end_date": (date.today() + timedelta(days=9)).isoformat(),
        }
        response = client.post("/leave/request", json=payload)
        assert response.status_code == 422
    finally:
        _cleanup_user_data(user_id)


def test_create_leave_request_rejects_unknown_user(client: object) -> None:
    """Verify create request returns 404 when user does not exist."""
    payload = {
        "user_id": 999_999_999,
        "start_date": (date.today() + timedelta(days=10)).isoformat(),
        "end_date": (date.today() + timedelta(days=10)).isoformat(),
    }
    response = client.post("/leave/request", json=payload)
    assert response.status_code == 404
    assert response.json().get("detail") == "User not found"


def test_create_leave_request_rejects_when_balance_exceeded(client: object) -> None:
    """Verify entitlement logic rejects a request when available balance is insufficient."""
    # Same-month hire date means earned days = 0 under current monthly accrual rule.
    user_id = _create_user_with_hire_date(date.today())
    try:
        payload = {
            "user_id": user_id,
            "start_date": (date.today() + timedelta(days=14)).isoformat(),
            "end_date": (date.today() + timedelta(days=14)).isoformat(),
        }
        response = client.post("/leave/request", json=payload)
        assert response.status_code == 400
        assert "Not enough leave days" in response.json().get("detail", "")
    finally:
        _cleanup_user_data(user_id)


def test_create_leave_request_consumes_balance_for_future_requests(client: object) -> None:
    """Verify previously created non-rejected requests reduce remaining available balance."""
    # One month worked => 1.5 earned days, so only one 1-day request should succeed.
    user_id = _create_user_with_hire_date(date.today() - timedelta(days=31))
    try:
        first_payload = {
            "user_id": user_id,
            "start_date": (date.today() + timedelta(days=20)).isoformat(),
            "end_date": (date.today() + timedelta(days=20)).isoformat(),
        }
        second_payload = {
            "user_id": user_id,
            "start_date": (date.today() + timedelta(days=21)).isoformat(),
            "end_date": (date.today() + timedelta(days=21)).isoformat(),
        }

        first_response = client.post("/leave/request", json=first_payload)
        assert first_response.status_code == 201

        second_response = client.post("/leave/request", json=second_payload)
        assert second_response.status_code == 400
        assert "Not enough leave days" in second_response.json().get("detail", "")
    finally:
        _cleanup_user_data(user_id)


def test_get_leave_history_is_newest_first(client: object) -> None:
    """Verify user leave history endpoint returns leave requests ordered newest first."""
    user_id = _create_user_with_hire_date(date.today() - timedelta(days=730))
    try:
        first_payload = {
            "user_id": user_id,
            "start_date": (date.today() + timedelta(days=30)).isoformat(),
            "end_date": (date.today() + timedelta(days=30)).isoformat(),
        }
        second_payload = {
            "user_id": user_id,
            "start_date": (date.today() + timedelta(days=40)).isoformat(),
            "end_date": (date.today() + timedelta(days=41)).isoformat(),
        }

        first_response = client.post("/leave/request", json=first_payload)
        assert first_response.status_code == 201
        first_id = first_response.json()["id"]

        second_response = client.post("/leave/request", json=second_payload)
        assert second_response.status_code == 201
        second_id = second_response.json()["id"]

        history_response = client.get(f"/leave/my-requests/{user_id}")
        assert history_response.status_code == 200

        requests = history_response.json()
        assert len(requests) >= 2
        assert requests[0]["id"] == second_id
        assert requests[1]["id"] == first_id
    finally:
        _cleanup_user_data(user_id)
