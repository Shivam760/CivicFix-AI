import uuid
from datetime import timedelta

import jwt
import pytest

from app.errors import ApiError
from app.security import (
    ALGORITHM,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_is_not_the_password():
    hashed = hash_password("correct horse battery")

    assert hashed != "correct horse battery"
    assert hashed.startswith("$argon2")


def test_verify_password():
    hashed = hash_password("correct horse battery")

    assert verify_password("correct horse battery", hashed) is True
    assert verify_password("wrong password", hashed) is False


def test_verify_password_without_hash_is_false():
    # Used when the login email doesn't exist.
    assert verify_password("anything", None) is False


def test_token_round_trip():
    user_id = uuid.uuid4()

    assert decode_access_token(create_access_token(user_id)) == user_id


def assert_invalid(token):
    with pytest.raises(ApiError) as caught:
        decode_access_token(token)
    assert (caught.value.status_code, caught.value.code) == (401, "INVALID_TOKEN")


def test_expired_token_rejected():
    assert_invalid(create_access_token(uuid.uuid4(), expires_in=timedelta(seconds=-1)))


def test_token_signed_with_another_key_rejected():
    forged = jwt.encode({"sub": str(uuid.uuid4()), "exp": 9999999999}, "x" * 40, ALGORITHM)
    assert_invalid(forged)


def test_tampered_token_rejected():
    token = create_access_token(uuid.uuid4())
    assert_invalid(token[:-2] + ("AA" if token[-2:] != "AA" else "BB"))


def test_garbage_token_rejected():
    assert_invalid("not-a-token")
