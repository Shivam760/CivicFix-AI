from sqlalchemy import URL, create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import require_env

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username=require_env("DB_USER"),
    password=require_env("DB_PASSWORD"),
    host=require_env("DB_HOST"),
    port=int(require_env("DB_PORT")),
    database=require_env("DB_NAME"),
)

engine = create_engine(DATABASE_URL)

# Creates one Session per request (see app/dependencies.py).
SessionLocal = sessionmaker(bind=engine)


def check_database_connection() -> str:
    """Run a simple query to prove the database is reachable."""
    with engine.connect() as connection:
        row = connection.execute(text("SELECT current_database(), version()")).one()
    return f"Connected to '{row[0]}' | {row[1]}"
