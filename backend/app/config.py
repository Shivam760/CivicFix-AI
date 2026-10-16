import os
from pathlib import Path

from dotenv import load_dotenv

# Load settings from backend/.env, wherever the command is run from.
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


def require_env(name: str) -> str:
    """Return an environment variable, or stop with a clear error if it's missing."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


# The Vite dev server's address, in both spellings a browser may use.
DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def cors_origins() -> list[str]:
    """Websites allowed to call the API from a browser (CORS_ORIGINS, comma-separated)."""
    raw = os.getenv("CORS_ORIGINS") or DEFAULT_CORS_ORIGINS
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
