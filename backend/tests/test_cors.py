"""CORS: which websites may call the API from a browser."""

from app.config import cors_origins

ALLOWED = "http://localhost:5173"


def preflight(client, origin):
    """The OPTIONS request a browser sends before a cross-origin POST with JSON."""
    return client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )


def test_preflight_from_frontend_is_allowed(client):
    response = preflight(client, ALLOWED)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED


def test_preflight_from_unknown_site_is_refused(client):
    response = preflight(client, "https://evil.example.com")

    assert "access-control-allow-origin" not in response.headers


def test_normal_response_carries_cors_header_for_frontend(client):
    response = client.get("/health", headers={"Origin": ALLOWED})

    assert response.headers["access-control-allow-origin"] == ALLOWED


def test_default_origins_are_the_vite_dev_server(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    assert cors_origins() == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_origins_are_read_from_env_and_cleaned(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", " https://civicfix.example.com/ , http://localhost:3000,")

    assert cors_origins() == ["https://civicfix.example.com", "http://localhost:3000"]
