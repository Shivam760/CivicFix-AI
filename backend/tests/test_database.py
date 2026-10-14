import os

from app.database import check_database_connection


def test_database_connection_reaches_configured_database():
    result = check_database_connection()

    assert result.startswith(f"Connected to '{os.environ['DB_NAME']}'")