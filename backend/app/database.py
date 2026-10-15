import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine, text
from sqlalchemy.orm import sessionmaker

# Load settings from backend/.env, wherever the command is run from.
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


def _require_env(name: str) -> str:
    """Return an environment variable, or stop with a clear error if it's missing."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username=_require_env("DB_USER"),
    password=_require_env("DB_PASSWORD"),
    host=_require_env("DB_HOST"),
    port=int(_require_env("DB_PORT")),
    database=_require_env("DB_NAME"),
)

engine = create_engine(DATABASE_URL)

# Creates one Session per request (see app/dependencies.py).
SessionLocal = sessionmaker(bind=engine)


def check_database_connection() -> str:
    """Run a simple query to prove the database is reachable."""
    with engine.connect() as connection:
        row = connection.execute(text("SELECT current_database(), version()")).one()
    return f"Connected to '{row[0]}' | {row[1]}"    