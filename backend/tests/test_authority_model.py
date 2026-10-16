import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.models import Authority


def unique_region() -> str:
    """A fresh region per test, so queries only see this test's rows."""
    return f"test-region-{uuid.uuid4()}"


def make_authority(**overrides) -> Authority:
    fields = {"name": "Test Municipal Authority", "region": unique_region()}
    fields.update(overrides)
    return Authority(**fields)


def test_new_authority_gets_safe_defaults(db_session):
    authority = make_authority()
    db_session.add(authority)
    db_session.flush()
    db_session.refresh(authority)

    assert isinstance(authority.id, uuid.UUID)
    assert authority.verification_status == "unverified"
    assert authority.supported_categories == []
    assert authority.created_at.tzinfo is not None


def test_supported_categories_round_trip(db_session):
    authority = make_authority(supported_categories=["road_damage", "garbage"])
    db_session.add(authority)
    db_session.flush()
    db_session.expire(authority)  # force a fresh read from PostgreSQL

    assert authority.supported_categories == ["road_damage", "garbage"]


@pytest.mark.parametrize(
    "categories",
    [["potholes"], ["road_damage", "unknown"], [None]],
    ids=["not_a_category", "ai_only_unknown", "null_element"],
)
def test_invalid_supported_category_rejected(db_session, categories):
    db_session.add(make_authority(supported_categories=categories))
    with pytest.raises(IntegrityError, match="ck_authorities_supported_categories_valid"):
        db_session.flush()


def test_invalid_verification_status_rejected(db_session):
    db_session.add(make_authority(verification_status="pending"))
    with pytest.raises(IntegrityError, match="ck_authorities_verification_status_valid"):
        db_session.flush()


def test_verified_without_date_rejected(db_session):
    db_session.add(make_authority(verification_status="verified"))
    with pytest.raises(IntegrityError, match="ck_authorities_verified_has_date"):
        db_session.flush()


def test_verified_with_date_accepted(db_session):
    authority = make_authority(
        verification_status="verified", last_verified_at=datetime.now(timezone.utc)
    )
    db_session.add(authority)
    db_session.flush()

    assert authority.verification_status == "verified"


@pytest.mark.parametrize("blank", ["", "   "], ids=["empty", "spaces"])
@pytest.mark.parametrize("field", ["name", "region"])
def test_blank_required_field_rejected(db_session, field, blank):
    db_session.add(make_authority(**{field: blank}))
    with pytest.raises(IntegrityError, match=f"ck_authorities_{field}_not_blank"):
        db_session.flush()


@pytest.mark.parametrize("field", ["name", "region"])
def test_missing_required_field_rejected(db_session, field):
    db_session.add(make_authority(**{field: None}))
    with pytest.raises(IntegrityError, match=f'null value in column "{field}"'):
        db_session.flush()


DEFAULTED_FIELDS = {"supported_categories": [], "verification_status": "unverified"}


@pytest.mark.parametrize("field", DEFAULTED_FIELDS)
def test_none_for_defaulted_field_uses_default(db_session, field):
    # For a column with a default, SQLAlchemy treats None as "not set" and
    # leaves the column out of the INSERT, so the default is used.
    authority = make_authority(**{field: None})
    db_session.add(authority)
    db_session.flush()
    db_session.refresh(authority)

    assert getattr(authority, field) == DEFAULTED_FIELDS[field]


@pytest.mark.parametrize("field", DEFAULTED_FIELDS)
def test_explicit_null_for_defaulted_field_rejected(db_session, field):
    # An UPDATE always sends NULL, so this reaches the NOT NULL constraint.
    authority = make_authority()
    db_session.add(authority)
    db_session.flush()

    with pytest.raises(IntegrityError, match=f'null value in column "{field}"'):
        db_session.execute(
            update(Authority).where(Authority.id == authority.id).values({field: None})
        )


def test_filter_by_supported_category(db_session):
    # The query GET /api/v1/authorities?category=garbage will use.
    region = unique_region()
    db_session.add_all([
        make_authority(region=region, supported_categories=["garbage", "road_damage"]),
        make_authority(region=region, supported_categories=["streetlight"]),
    ])
    db_session.flush()

    matches = db_session.scalars(
        select(Authority).where(
            Authority.region == region,
            Authority.supported_categories.contains(["garbage"]),
        )
    ).all()

    assert [a.supported_categories for a in matches] == [["garbage", "road_damage"]]
