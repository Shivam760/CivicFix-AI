import os

from app.database import check_database_connection


def test_database_connection_reaches_configured_database():
    result = check_database_connection()

    assert result.startswith(f"Connected to '{os.environ['DB_NAME']}'")


def test_tests_use_the_test_database():
    # conftest.py switches DB_NAME to TEST_DB_NAME before the engine is created.
    result = check_database_connection()

    assert result.startswith(f"Connected to '{os.environ['TEST_DB_NAME']}'")
