from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import models
import pytest
from database import SessionLocal


@pytest.fixture(scope="session")
def client() -> object:
    """Provide a TestClient for auth and RBAC integration tests."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        pytest.skip(
            "DATABASE_URL is not configured; skipping auth/RBAC integration tests.",
            allow_module_level=True,
        )

    from fastapi.testclient import TestClient
    from main import app

    return TestClient(app)


def _today_utc_date() -> datetime.date:
    """Return today's date using a timezone-aware datetime source."""
    return datetime.now(timezone.utc).date()


def _hash_password(password: str) -> str:
    """Hash plaintext password using bcrypt for test users."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _create_user(
    *,
    role: str,
    hire_days_ago: int = 365,
    email_prefix: str = "qa",
    password: str = "password123",  # noqa: S107
) -> tuple[int, str, str]:
    """Create a DB user and return (id, email, password)."""
    db = SessionLocal()
    try:
        suffix = uuid.uuid4().hex[:8]
        email = f"{email_prefix}.{suffix}@example.com"

        user = models.User(
            email=email,
            password_hash=_hash_password(password),
            name=f"QA {role} {suffix}",
            role=role,
            position="QA Engineer",
            seniority="Mid",
            hire_date=_today_utc_date() - timedelta(days=hire_days_ago),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id, email, password
    finally:
        db.close()


def _login_headers(client: object, email: str, password: str) -> dict[str, str]:
    """Authenticate and return Authorization headers."""
    response = client.post(
        "/auth/login",
        json={"username": email, "password": password},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _cleanup_users(user_ids: list[int]) -> None:
    """Delete test leave rows and users created by this test module."""
    db = SessionLocal()
    try:
        if not user_ids:
            return

        db.query(models.LeaveRequest).filter(
            models.LeaveRequest.user_id.in_(user_ids)
        ).delete(synchronize_session=False)
        db.query(models.LeaveRequest).filter(
            models.LeaveRequest.reviewed_by.in_(user_ids)
        ).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.id.in_(user_ids)).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


@pytest.fixture
def created_users() -> list[int]:
    """Track user ids created during a test and clean them at teardown."""
    user_ids: list[int] = []
    yield user_ids
    _cleanup_users(user_ids)


def test_register_hashes_password_and_prevents_duplicate(client: object) -> None:
    """Verify register creates a user, hashes password, and blocks duplicate email."""
    suffix = uuid.uuid4().hex[:8]
    email = f"register.{suffix}@example.com"
    payload = {
        "email": email,
        "password": "password123",
        "name": "Register QA",
        "position": "QA Engineer",
        "seniority": "Mid",
    }

    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201
    first_body = first.json()
    assert first_body["email"] == email
    assert first_body["role"] == models.RoleEnum.user.value
    assert "password" not in first_body
    assert "password_hash" not in first_body

    db = SessionLocal()
    try:
        db_user = db.query(models.User).filter(models.User.email == email).first()
        assert db_user is not None
        assert db_user.password_hash != payload["password"]
        assert bcrypt.checkpw(
            payload["password"].encode("utf-8"),
            db_user.password_hash.encode("utf-8"),
        )

        second = client.post("/auth/register", json=payload)
        assert second.status_code == 409
        assert second.json().get("detail") == "Email already registered"

        db.query(models.User).filter(models.User.email == email).delete()
        db.commit()
    finally:
        db.close()


def test_login_and_me_with_valid_and_invalid_tokens(
    client: object, created_users: list[int]
) -> None:
    """Verify login issues JWT and /auth/me enforces token validation."""
    user_id, email, password = _create_user(role=models.RoleEnum.user.value)
    created_users.append(user_id)

    login = client.post(
        "/auth/login",
        json={"username": email, "password": password},
    )
    assert login.status_code == 200
    login_body = login.json()
    assert login_body["token_type"] == "bearer"  # noqa: S105
    assert isinstance(login_body["access_token"], str)
    assert login_body["access_token"]

    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {login_body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == email

    wrong_login = client.post(
        "/auth/login",
        json={"username": email, "password": "wrong-password"},
    )
    assert wrong_login.status_code == 401

    missing_token = client.get("/auth/me")
    assert missing_token.status_code == 401

    invalid_token = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer definitely-not-a-valid-token"},
    )
    assert invalid_token.status_code == 401


def test_leave_endpoint_requires_authentication(client: object) -> None:
    """Verify protected leave endpoint rejects missing JWT."""
    payload = {
        "start_date": (_today_utc_date() + timedelta(days=3)).isoformat(),
        "end_date": (_today_utc_date() + timedelta(days=3)).isoformat(),
    }
    response = client.post("/leave/request", json=payload)
    assert response.status_code == 401


def test_regular_user_cannot_access_manager_endpoints(
    client: object, created_users: list[int]
) -> None:
    """Verify manager-only endpoints are blocked for regular users."""
    user_id, email, password = _create_user(role=models.RoleEnum.user.value)
    created_users.append(user_id)
    headers = _login_headers(client, email, password)

    all_requests = client.get("/leave/requests", headers=headers)
    assert all_requests.status_code == 403

    approve = client.patch("/leave/requests/999999/approve", headers=headers)
    assert approve.status_code == 403

    reject = client.patch(
        "/leave/requests/999999/reject",
        json={"rejection_reason": "No coverage"},
        headers=headers,
    )
    assert reject.status_code == 403


def test_user_sees_only_own_leave_history(client: object, created_users: list[int]) -> None:
    """Verify /leave/my-requests returns only authenticated user's rows."""
    user1_id, user1_email, user1_password = _create_user(
        role=models.RoleEnum.user.value,
        email_prefix="qa.user1",
        hire_days_ago=730,
    )
    user2_id, user2_email, user2_password = _create_user(
        role=models.RoleEnum.user.value,
        email_prefix="qa.user2",
        hire_days_ago=730,
    )
    created_users.extend([user1_id, user2_id])

    user1_headers = _login_headers(client, user1_email, user1_password)
    user2_headers = _login_headers(client, user2_email, user2_password)

    first = client.post(
        "/leave/request",
        json={
            "start_date": (_today_utc_date() + timedelta(days=10)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=10)).isoformat(),
        },
        headers=user1_headers,
    )
    assert first.status_code == 201
    assert first.json()["user_id"] == user1_id

    second = client.post(
        "/leave/request",
        json={
            "start_date": (_today_utc_date() + timedelta(days=12)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=12)).isoformat(),
        },
        headers=user2_headers,
    )
    assert second.status_code == 201
    assert second.json()["user_id"] == user2_id

    user1_history = client.get("/leave/my-requests", headers=user1_headers)
    assert user1_history.status_code == 200
    assert all(entry["user_id"] == user1_id for entry in user1_history.json())


def test_overlapping_leave_request_is_rejected(
    client: object, created_users: list[int]
) -> None:
    """Verify backend blocks overlapping leave requests for same authenticated user."""
    user_id, email, password = _create_user(
        role=models.RoleEnum.user.value,
        hire_days_ago=730,
    )
    created_users.append(user_id)
    headers = _login_headers(client, email, password)

    first = client.post(
        "/leave/request",
        json={
            "start_date": (_today_utc_date() + timedelta(days=20)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=22)).isoformat(),
        },
        headers=headers,
    )
    assert first.status_code == 201

    overlap = client.post(
        "/leave/request",
        json={
            "start_date": (_today_utc_date() + timedelta(days=22)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=24)).isoformat(),
        },
        headers=headers,
    )
    assert overlap.status_code == 409
    assert "overlap" in overlap.json().get("detail", "").lower()


def test_manager_can_approve_pending_request_with_audit_fields(
    client: object, created_users: list[int]
) -> None:
    """Verify manager can approve pending request and audit fields are populated."""
    user_id, user_email, user_password = _create_user(
        role=models.RoleEnum.user.value,
        email_prefix="qa.approve.user",
        hire_days_ago=730,
    )
    manager_id, manager_email, manager_password = _create_user(
        role=models.RoleEnum.manager.value,
        email_prefix="qa.approve.manager",
        hire_days_ago=1000,
    )
    created_users.extend([user_id, manager_id])

    user_headers = _login_headers(client, user_email, user_password)
    manager_headers = _login_headers(client, manager_email, manager_password)

    created = client.post(
        "/leave/request",
        json={
            "start_date": (_today_utc_date() + timedelta(days=25)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=25)).isoformat(),
        },
        headers=user_headers,
    )
    assert created.status_code == 201
    leave_request_id = created.json()["id"]

    pending = client.get("/leave/requests", headers=manager_headers)
    assert pending.status_code == 200
    pending_ids = {entry["id"] for entry in pending.json()}
    assert leave_request_id in pending_ids

    approve = client.patch(
        f"/leave/requests/{leave_request_id}/approve",
        headers=manager_headers,
    )
    assert approve.status_code == 200
    approve_body = approve.json()
    assert approve_body["status"] == models.LeaveStatusEnum.APPROVED.value
    assert approve_body["reviewed_by"] == manager_id
    assert approve_body["reviewed_at"] is not None
    assert approve_body["rejection_reason"] is None


def test_manager_can_reject_with_reason_and_cannot_approve_own_request(
    client: object, created_users: list[int]
) -> None:
    """Verify manager reject flow and self-approval protection."""
    user_id, user_email, user_password = _create_user(
        role=models.RoleEnum.user.value,
        email_prefix="qa.reject.user",
        hire_days_ago=730,
    )
    manager_id, manager_email, manager_password = _create_user(
        role=models.RoleEnum.manager.value,
        email_prefix="qa.reject.manager",
        hire_days_ago=1000,
    )
    created_users.extend([user_id, manager_id])

    user_headers = _login_headers(client, user_email, user_password)
    manager_headers = _login_headers(client, manager_email, manager_password)

    pending_for_reject = client.post(
        "/leave/request",
        json={
            "start_date": (_today_utc_date() + timedelta(days=35)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=35)).isoformat(),
        },
        headers=user_headers,
    )
    assert pending_for_reject.status_code == 201

    reject = client.patch(
        f"/leave/requests/{pending_for_reject.json()['id']}/reject",
        json={"rejection_reason": "Insufficient team coverage"},
        headers=manager_headers,
    )
    assert reject.status_code == 200
    reject_body = reject.json()
    assert reject_body["status"] == models.LeaveStatusEnum.REJECTED.value
    assert reject_body["reviewed_by"] == manager_id
    assert reject_body["reviewed_at"] is not None
    assert reject_body["rejection_reason"] == "Insufficient team coverage"

    own_request = client.post(
        "/leave/request",
        json={
            "start_date": (_today_utc_date() + timedelta(days=45)).isoformat(),
            "end_date": (_today_utc_date() + timedelta(days=45)).isoformat(),
        },
        headers=manager_headers,
    )
    assert own_request.status_code == 201

    deny_own = client.patch(
        f"/leave/requests/{own_request.json()['id']}/approve",
        headers=manager_headers,
    )
    assert deny_own.status_code == 403
    assert "cannot approve their own" in deny_own.json().get("detail", "")
