import json
import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.models import Authority
from scripts.seed_authorities import DEFAULT_PATH, load_records, seed_authorities


def record(**overrides) -> dict:
    fields = {
        "name": "Test Authority",
        "region": f"test-region-{uuid.uuid4()}",
        "supported_categories": ["garbage"],
    }
    fields.update(overrides)
    return fields


def find(db_session, rec) -> list[Authority]:
    return db_session.scalars(
        select(Authority).where(Authority.name == rec["name"], Authority.region == rec["region"])
    ).all()


def test_new_record_is_created_with_defaults(db_session):
    rec = record()

    assert seed_authorities(db_session, [rec]) == (1, 0)
    [authority] = find(db_session, rec)
    assert authority.verification_status == "unverified"
    assert authority.contact_url is None


def test_running_twice_updates_instead_of_duplicating(db_session):
    rec = record()
    seed_authorities(db_session, [rec])

    changed = {**rec, "supported_categories": ["garbage", "road_damage"]}
    assert seed_authorities(db_session, [changed]) == (0, 1)

    [authority] = find(db_session, rec)
    assert authority.supported_categories == ["garbage", "road_damage"]


def test_unchanged_record_is_not_counted(db_session):
    rec = record()
    seed_authorities(db_session, [rec])

    assert seed_authorities(db_session, [rec]) == (0, 0)


def test_field_removed_from_file_is_reset(db_session):
    rec = record(contact_url="https://example.com/complaints")
    seed_authorities(db_session, [rec])

    without_url = {k: v for k, v in rec.items() if k != "contact_url"}
    seed_authorities(db_session, [without_url])

    [authority] = find(db_session, rec)
    assert authority.contact_url is None


def test_unknown_field_rejected(db_session):
    with pytest.raises(ValueError, match="phone"):
        seed_authorities(db_session, [record(phone="123")])


@pytest.mark.parametrize(
    "overrides, constraint",
    [
        ({"supported_categories": ["potholes"]}, "ck_authorities_supported_categories_valid"),
        ({"verification_status": "verified"}, "ck_authorities_verified_has_date"),
    ],
    ids=["bad_category", "verified_without_date"],
)
def test_invalid_record_rejected(db_session, overrides, constraint):
    with pytest.raises(IntegrityError, match=constraint):
        seed_authorities(db_session, [record(**overrides)])


def test_load_records_parses_verification_date(tmp_path):
    path = tmp_path / "authorities.json"
    path.write_text(json.dumps([record(last_verified_at="2026-10-01T00:00:00+00:00")]))

    [loaded] = load_records(path)

    assert loaded["last_verified_at"].tzinfo is not None


def test_committed_seed_file_is_valid(db_session):
    records = load_records(DEFAULT_PATH)
    seed_authorities(db_session, records)

    for rec in records:
        count = db_session.scalar(
            select(func.count()).select_from(Authority).where(
                Authority.name == rec["name"], Authority.region == rec["region"]
            )
        )
        assert count == 1
