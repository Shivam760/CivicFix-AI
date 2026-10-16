import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.errors import ApiError, register_error_handlers


@pytest.fixture
def error_client():
    """A tiny app with routes that fail on purpose, using the real error handlers."""
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/api-error")
    def api_error():
        raise ApiError(409, "REPORT_LOCKED", "The report is locked.")

    @app.get("/crash")
    def crash():
        raise RuntimeError("secret internal detail")

    @app.get("/needs-number")
    def needs_number(value: int):
        return {"value": value}

    # raise_server_exceptions=False: return the 500 response instead of re-raising.
    return TestClient(app, raise_server_exceptions=False)


def test_api_error_uses_contract_format(error_client):
    response = error_client.get("/api-error")

    assert response.status_code == 409
    assert response.json() == {
        "error": {"code": "REPORT_LOCKED", "message": "The report is locked.", "details": []}
    }


def test_unknown_url_returns_not_found(error_client):
    response = error_client.get("/no-such-page")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_validation_error_lists_fields(error_client):
    response = error_client.get("/needs-number", params={"value": "abc"})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"][0]["field"] == "value"


def test_unexpected_error_hides_internal_details(error_client):
    response = error_client.get("/crash")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "secret internal detail" not in response.text
