import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Authority, Report, ReportEvent
from app.models.choices import ISSUE_CATEGORIES, REPORT_STATUSES


def make_report(user, **overrides) -> Report:
    fields = {
        "user_id": user.id,
        "title": "Pothole near the market",
        "description": "A large pothole is making the road unsafe.",
    }
    fields.update(overrides)
    return Report(**fields)


def save(db_session, obj):
    db_session.add(obj)
    db_session.flush()
    db_session.refresh(obj)
    return obj


# --- reports -----------------------------------------------------------------


def test_new_report_gets_defaults(db_session, user):
    report = save(db_session, make_report(user))

    assert isinstance(report.id, uuid.UUID)
    assert report.status == "reported"
    assert report.submission_status == "not_submitted"
    assert report.category is None
    assert report.created_at.tzinfo is not None


def test_report_requires_existing_user(db_session, user):
    db_session.add(make_report(user, user_id=uuid.uuid4()))  # no such user
    with pytest.raises(IntegrityError, match="fk_reports_user_id_users"):
        db_session.flush()


@pytest.mark.parametrize("category", ISSUE_CATEGORIES)
def test_valid_category_accepted(db_session, user, category):
    assert save(db_session, make_report(user, category=category)).category == category


@pytest.mark.parametrize("status", REPORT_STATUSES)
def test_every_listed_status_accepted(db_session, user, status):
    # Fails if choices.py and the database's CHECK constraint disagree.
    assert save(db_session, make_report(user, status=status)).status == status


@pytest.mark.parametrize(
    "field, value, constraint",
    [
        ("category", "unknown", "ck_reports_category_valid"),
        ("category", "potholes", "ck_reports_category_valid"),
        ("status", "open", "ck_reports_status_valid"),
        ("submission_status", "sent", "ck_reports_submission_status_valid"),
        ("latitude", 90.1, "ck_reports_latitude_range"),
        ("latitude", -90.1, "ck_reports_latitude_range"),
        ("longitude", 180.1, "ck_reports_longitude_range"),
        ("longitude", -180.1, "ck_reports_longitude_range"),
        ("title", "   ", "ck_reports_title_not_blank"),
        ("description", "", "ck_reports_description_not_blank"),
    ],
)
def test_invalid_value_rejected(db_session, user, field, value, constraint):
    db_session.add(make_report(user, **{field: value}))
    with pytest.raises(IntegrityError, match=constraint):
        db_session.flush()


def test_coordinate_boundaries_accepted(db_session, user):
    report = save(db_session, make_report(user, latitude=-90, longitude=180))

    assert (report.latitude, report.longitude) == (-90, 180)


@pytest.mark.parametrize(
    "details",
    [{"external_reference": "REF-1"}, {"submitted_at": datetime.now(timezone.utc)}],
    ids=["external_reference", "submitted_at"],
)
def test_submission_details_rejected_unless_confirmed(db_session, user, details):
    db_session.add(make_report(user, submission_status="pending", **details))
    with pytest.raises(IntegrityError, match="ck_reports_submission_details_only_when_confirmed"):
        db_session.flush()


def test_submission_details_accepted_when_confirmed(db_session, user):
    report = save(
        db_session,
        make_report(
            user,
            submission_status="confirmed",
            external_reference="REF-1",
            submitted_at=datetime.now(timezone.utc),
        ),
    )

    assert report.external_reference == "REF-1"


def test_user_with_reports_cannot_be_deleted(db_session, user):
    save(db_session, make_report(user))

    db_session.delete(user)
    with pytest.raises(IntegrityError, match="fk_reports_user_id_users"):
        db_session.flush()


def test_authority_used_by_report_cannot_be_deleted(db_session, user):
    authority = save(db_session, Authority(name="Test Authority", region=f"test-region-{uuid.uuid4()}"))
    save(db_session, make_report(user, authority_id=authority.id))

    db_session.delete(authority)
    with pytest.raises(IntegrityError, match="fk_reports_authority_id_authorities"):
        db_session.flush()


# --- report_events -----------------------------------------------------------


def make_event(report, **overrides) -> ReportEvent:
    fields = {
        "report_id": report.id,
        "event_type": "report_created",
        "description": "Report created.",
    }
    fields.update(overrides)
    return ReportEvent(**fields)


def test_event_stores_metadata_and_optional_actor(db_session, user):
    report = save(db_session, make_report(user))
    event = save(db_session, make_event(report, event_metadata={"old_status": "reported"}))

    assert event.actor_user_id is None
    assert event.event_metadata == {"old_status": "reported"}
    assert event.created_at.tzinfo is not None


def test_event_without_metadata_stores_sql_null(db_session, user):
    # Guards against None being stored as the JSON value null instead.
    report = save(db_session, make_report(user))
    event = save(db_session, make_event(report, event_metadata=None))

    is_sql_null = db_session.scalar(
        select(ReportEvent.event_metadata.is_(None)).where(ReportEvent.id == event.id)
    )
    assert is_sql_null is True


@pytest.mark.parametrize("field", ["event_type", "description"])
def test_blank_event_field_rejected(db_session, user, field):
    report = save(db_session, make_report(user))
    db_session.add(make_event(report, **{field: "  "}))
    with pytest.raises(IntegrityError, match=f"ck_report_events_{field}_not_blank"):
        db_session.flush()


def test_report_with_events_cannot_be_deleted(db_session, user):
    report = save(db_session, make_report(user))
    save(db_session, make_event(report, actor_user_id=user.id))

    db_session.delete(report)
    with pytest.raises(IntegrityError, match="fk_report_events_report_id_reports"):
        db_session.flush()
