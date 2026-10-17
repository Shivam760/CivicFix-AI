"""Database rules for repair_verifications (database-schema.md section 12).

The API checks these too; these tests make sure the database still refuses
bad rows if the code ever has a bug.
"""

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import RepairVerification, ReportEvent


@pytest.fixture
def claim(db_session, report):
    event = ReportEvent(
        report_id=report.id,
        event_type="report_status_changed",
        description="Status changed from in_progress to awaiting_verification.",
        event_metadata={"from": "in_progress", "to": "awaiting_verification"},
    )
    db_session.add(event)
    db_session.flush()
    return event


def make_vote(report, claim, user, verdict="fixed") -> RepairVerification:
    return RepairVerification(
        report_id=report.id, claim_event_id=claim.id, user_id=user.id, verdict=verdict
    )


def test_vote_saved_with_time(db_session, report, claim, user):
    vote = make_vote(report, claim, user)
    db_session.add(vote)
    db_session.flush()

    assert vote.created_at.tzinfo is not None


def test_second_vote_by_same_user_in_round_rejected(db_session, report, claim, user):
    db_session.add(make_vote(report, claim, user))
    db_session.flush()

    db_session.add(make_vote(report, claim, user, verdict="still_broken"))
    with pytest.raises(IntegrityError, match="uq_repair_verifications_claim_event_id"):
        db_session.flush()


def test_unknown_verdict_rejected(db_session, report, claim, user):
    db_session.add(make_vote(report, claim, user, verdict="maybe"))
    with pytest.raises(IntegrityError, match="ck_repair_verifications_verdict_valid"):
        db_session.flush()
