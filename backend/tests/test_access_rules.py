"""Who can use which endpoints (api-contract.md section 3).

Citizens and approved officials use the app as before. Pending or rejected
officials and admins are refused everywhere except a short list of endpoints.
"""

import re
import uuid

import pytest

from app.main import app
from app.models import User
from app.security import create_access_token

# Endpoints that need no token at all.
PUBLIC = {
    ("GET", "/"),
    ("GET", "/health"),
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
    ("GET", "/api/v1/authorities"),
}
# Endpoints every logged-in account may use, approved or not.
ANY_ACCOUNT = {
    ("GET", "/api/v1/auth/me"),
    # Pending and rejected officials re-apply here; it refuses everyone else itself.
    ("PUT", "/api/v1/auth/me/official-application"),
}


def make_account(db_session, role, approval_status="approved") -> User:
    user = User(
        name=f"{role.title()} User",
        email=f"test-{uuid.uuid4()}@example.com",
        password_hash="x-hash",
        role=role,
        approval_status=approval_status,
    )
    db_session.add(user)
    db_session.flush()
    return user


def headers_for(user) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def protected_endpoints() -> list[tuple[str, str]]:
    """Every (method, path) in the API that needs a token, with sample IDs filled in.

    Read from the OpenAPI schema (the list /docs shows), so new endpoints are
    checked without editing this file.
    """
    found = []
    for path, operations in app.openapi()["paths"].items():
        for method in sorted(m.upper() for m in operations):
            if (method, path) in PUBLIC | ANY_ACCOUNT:
                continue
            # Path parameters like {report_id} get a random UUID: the access check
            # runs before the endpoint looks anything up.
            found.append((method, re.sub(r"\{[^}]+\}", lambda _: str(uuid.uuid4()), path)))
    return found


def test_the_route_list_is_not_empty():
    # Guards the tests below: an empty list would make them pass without checking anything.
    assert len(protected_endpoints()) > 25


@pytest.mark.parametrize("method, path", protected_endpoints())
def test_admins_are_refused_outside_the_admin_pages(client, db_session, method, path):
    admin = make_account(db_session, "admin")

    response = client.request(method, path, headers=headers_for(admin))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ADMIN_ACCOUNT"


@pytest.mark.parametrize("status", ["pending", "rejected"])
@pytest.mark.parametrize("method, path", protected_endpoints())
def test_unapproved_officials_are_refused(client, db_session, method, path, status):
    official = make_account(db_session, "official", status)

    response = client.request(method, path, headers=headers_for(official))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ACCOUNT_NOT_APPROVED"


@pytest.mark.parametrize(
    "role, status",
    [("admin", "approved"), ("official", "pending"), ("official", "rejected")],
)
def test_every_account_can_read_itself(client, db_session, role, status):
    user = make_account(db_session, role, status)

    response = client.get("/api/v1/auth/me", headers=headers_for(user))

    assert response.status_code == 200
    assert response.json()["role"] == role


def test_approval_applies_to_a_token_issued_before_it(client, db_session):
    official = make_account(db_session, "official", "pending")
    headers = headers_for(official)
    assert client.get("/api/v1/reports", headers=headers).status_code == 403

    official.approval_status = "approved"
    db_session.flush()

    assert client.get("/api/v1/reports", headers=headers).status_code == 200


def test_rejection_applies_to_a_token_issued_before_it(client, db_session):
    official = make_account(db_session, "official")
    headers = headers_for(official)
    assert client.get("/api/v1/reports", headers=headers).status_code == 200

    official.approval_status = "rejected"
    db_session.flush()

    response = client.get("/api/v1/reports", headers=headers)
    assert response.json()["error"]["code"] == "ACCOUNT_NOT_APPROVED"


def test_citizens_and_approved_officials_still_get_in(client, auth_headers, official_headers):
    assert client.get("/api/v1/reports", headers=auth_headers).status_code == 200
    assert client.get("/api/v1/reports", headers=official_headers).status_code == 200


def test_no_token_is_still_401(client):
    response = client.get("/api/v1/reports")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"
