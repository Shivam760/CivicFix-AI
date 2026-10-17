import pytest
from sqlalchemy import func, select

from app.models import AgentRun, Evidence, RepairVerification, Report, User
from app.security import verify_password
from app.services.drafts import latest_draft
from app.services.reports import change_status, repair_photos_this_round
from app.services.verification import (
    VERIFICATION_RADIUS_KM,
    distance_km,
    list_verifiable_reports,
)
from scripts.seed_demo import DEMO_ACCOUNTS, DemoDataExists, seed_demo

PASSWORD = "demo password 123"


def demo_user(db_session, key) -> User:
    return db_session.scalar(select(User).where(User.email == DEMO_ACCOUNTS[key]["email"]))


def demo_report_count(db_session) -> int:
    citizen = demo_user(db_session, "citizen")
    return db_session.scalar(
        select(func.count()).select_from(Report).where(Report.user_id == citizen.id)
    )


@pytest.fixture
def reports(db_session, storage):
    return seed_demo(db_session, storage, PASSWORD)


def test_one_report_for_each_status(reports):
    assert {key: report.status for key, report in reports.items()} == {
        "reported": "reported",
        "under_review": "under_review",
        "in_progress": "in_progress",
        "awaiting_verification": "awaiting_verification",
        "resolved": "resolved",
        "closed": "closed",
    }


def test_accounts_have_their_roles_and_the_password(db_session, reports):
    for key, account in DEMO_ACCOUNTS.items():
        user = demo_user(db_session, key)
        assert user.role == account["role"]
        assert verify_password(PASSWORD, user.password_hash)


def test_only_the_near_neighbour_lives_within_the_radius(db_session, reports):
    near, far = demo_user(db_session, "near"), demo_user(db_session, "far")
    for report in reports.values():
        point = (report.latitude, report.longitude)
        assert distance_km(near.home_latitude, near.home_longitude, *point) <= VERIFICATION_RADIUS_KM
        assert distance_km(far.home_latitude, far.home_longitude, *point) > VERIFICATION_RADIUS_KM
        # tester@example.com's home in the dev database must not see demo reports.
        assert distance_km(30.7, 76.8, *point) > VERIFICATION_RADIUS_KM


def test_near_neighbour_can_verify_the_claimed_repair_and_far_one_cannot(db_session, reports):
    claimed = reports["awaiting_verification"]

    assert list_verifiable_reports(db_session, demo_user(db_session, "near")) == [claimed]
    assert list_verifiable_reports(db_session, demo_user(db_session, "far")) == []


def test_official_can_claim_the_in_progress_repair(db_session, reports):
    report = reports["in_progress"]
    assert repair_photos_this_round(db_session, report) == 1

    change_status(db_session, report, "awaiting_verification", demo_user(db_session, "official"))

    assert report.status == "awaiting_verification"


def test_resolved_report_was_decided_by_two_fixed_votes(db_session, reports):
    verdicts = db_session.scalars(
        select(RepairVerification.verdict).where(
            RepairVerification.report_id == reports["resolved"].id
        )
    ).all()
    assert verdicts == ["fixed", "fixed"]


def test_ai_drafts_come_from_the_fake_analyzer_and_are_approved(db_session, reports):
    report = reports["reported"]
    run = db_session.scalar(select(AgentRun).where(AgentRun.report_id == report.id))

    assert run.model_name == "fake-analyzer"
    assert report.approved_draft_id == latest_draft(db_session, report).id


def test_every_photo_row_has_its_file_in_storage(db_session, storage, reports):
    keys = db_session.scalars(select(Evidence.storage_key)).all()

    assert len(keys) == 7  # 4 report photos + 3 repair photos
    assert set(keys) == set(storage.files)


def test_running_twice_without_reset_is_refused(db_session, storage, reports):
    with pytest.raises(DemoDataExists):
        seed_demo(db_session, storage, PASSWORD)

    assert demo_report_count(db_session) == 6


def test_reset_recreates_demo_reports_and_removes_old_files(db_session, storage, reports):
    old_files = set(storage.files)

    seed_demo(db_session, storage, "another password", reset=True)

    assert demo_report_count(db_session) == 6
    assert old_files.isdisjoint(storage.files)  # old photos deleted, new ones saved
    assert len(storage.files) == 7
    assert verify_password("another password", demo_user(db_session, "citizen").password_hash)


def test_reset_keeps_other_peoples_reports_and_the_officials_work_on_them(
    db_session, storage, reports, report
):
    # The demo official worked on someone else's report: that event points to them.
    change_status(db_session, report, "under_review", demo_user(db_session, "official"))
    db_session.commit()

    seed_demo(db_session, storage, PASSWORD, reset=True)

    db_session.refresh(report)
    assert report.status == "under_review"


def test_short_password_is_rejected_before_anything_is_created(db_session, storage):
    with pytest.raises(ValueError, match="8 to 128"):
        seed_demo(db_session, storage, "short")

    assert demo_user(db_session, "citizen") is None
    assert storage.files == {}
