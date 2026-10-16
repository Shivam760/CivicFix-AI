import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Evidence


def make_evidence(report, user, **overrides) -> Evidence:
    fields = {
        "report_id": report.id,
        "uploaded_by_user_id": user.id,
        "kind": "report_photo",
        "file_name": "pothole.jpg",
        "storage_key": f"reports/{report.id}/photo-1.jpg",
        "content_type": "image/jpeg",
        "file_size_bytes": 1234,
    }
    fields.update(overrides)
    return Evidence(**fields)


def test_evidence_saved_with_defaults(db_session, report, user):
    evidence = make_evidence(report, user)
    db_session.add(evidence)
    db_session.flush()
    db_session.refresh(evidence)

    assert evidence.id is not None
    assert evidence.description is None
    assert evidence.uploaded_at.tzinfo is not None


@pytest.mark.parametrize(
    ("field", "value", "constraint"),
    [
        ("kind", "selfie", "ck_evidence_kind_valid"),
        ("content_type", "image/gif", "ck_evidence_content_type_valid"),
        ("file_size_bytes", 0, "ck_evidence_file_size_positive"),
        ("file_name", "  ", "ck_evidence_file_name_not_blank"),
        ("storage_key", "", "ck_evidence_storage_key_not_blank"),
        ("description", "   ", "ck_evidence_description_not_blank"),
    ],
)
def test_invalid_values_rejected(db_session, report, user, field, value, constraint):
    db_session.add(make_evidence(report, user, **{field: value}))
    with pytest.raises(IntegrityError, match=constraint):
        db_session.flush()


def test_storage_key_is_unique(db_session, report, user):
    db_session.add(make_evidence(report, user))
    db_session.flush()

    db_session.add(make_evidence(report, user))
    with pytest.raises(IntegrityError, match="uq_evidence_storage_key"):
        db_session.flush()


def test_repair_photo_kind_allowed(db_session, report, user):
    db_session.add(make_evidence(report, user, kind="repair_photo"))
    db_session.flush()
