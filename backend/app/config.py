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
