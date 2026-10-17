"""Residents' votes on claimed repairs (api-contract.md section 11,
database-schema.md section 12)."""

import io
import uuid

import pytest
from PIL import Image
from sqlalchemy import select

from app.models import RepairVerification, Report, ReportEvent, User
from app.security import create_access_token
from app.services.verification import distance_km

URL = "/api/v1/reports"
VOTES = "/api/v1/verifications/{}/votes"

# The report is at REPORT_SPOT. NEAR is about 1 km north, FAR about 3.3 km north.
REPORT_SPOT = (30.7000, 76.8000)
NEAR = (30.7090, 76.8000)
FAR = (30.7300, 76.8000)


@pytest.fixture
def located_report(db_session, report):
    """The report fixture, with coordinates so that neighbours can find it."""
    report.latitude, report.longitude = REPORT_SPOT
    db_session.flush()
    return report


def resident(db_session, home=NEAR) -> dict:
    """Log in as a new citizen living at home (None: no home location saved)."""
    lat, lon = home if home else (None, None)
    user = User(
        name="Neighbour",
        email=f"test-{uuid.uuid4()}@example.com",
        password_hash="x-hash",
        home_latitude=lat,
        home_longitude=lon,
    )
    db_session.add(user)
    db_session.flush()
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def change(client, headers, report_id, status):
    return client.post(f"{URL}/{report_id}/status", json={"status": status}, headers=headers)


def add_repair_photo(client, headers, report_id):
    photo = io.BytesIO()
    Image.new("RGB", (40, 20), "green").save(photo, format="JPEG")
    response = client.post(
        f"{URL}/{report_id}/repair-photos",
        headers=headers,
        files={"file": ("fixed.jpg", photo.getvalue(), "image/jpeg")},
    )
    assert response.status_code == 201


def claim_repair(client, official_headers, report_id):
    """Walk the report through the API to awaiting_verification, as an official would."""
    for status in ["under_review", "in_progress"]:
        assert change(client, official_headers, report_id, status).status_code == 200
    add_repair_photo(client, official_headers, report_id)
    assert change(client, official_headers, report_id, "awaiting_verification").status_code == 200


def vote(client, headers, report_id, verdict):
    return client.post(VOTES.format(report_id), json={"verdict": verdict}, headers=headers)


def status_of(db_session, report_id) -> str:
    db_session.expire_all()  # read what the request committed, not a cached value
    return db_session.get(Report, report_id).status


def events(db_session, report_id, event_type) -> list[ReportEvent]:
    return list(
        db_session.scalars(
            select(ReportEvent)
            .where(ReportEvent.report_id == report_id, ReportEvent.event_type == event_type)
            .order_by(ReportEvent.sequence)
        )
    )


def error_code(response) -> str:
    return response.json()["error"]["code"]


# --- distance --------------------------------------------------------------------


def test_distance_of_one_degree_latitude_is_about_111_km():
    assert distance_km(30, 76.8, 31, 76.8) == pytest.approx(111.19, abs=0.05)


def test_test_spots_are_where_the_tests_assume():
    assert distance_km(*REPORT_SPOT, *NEAR) < 2 < distance_km(*REPORT_SPOT, *FAR)


# --- a single vote ---------------------------------------------------------------


def test_neighbour_vote_is_recorded(client, db_session, official_headers, located_report):
    claim_repair(client, official_headers, located_report.id)

    response = vote(client, resident(db_session), located_report.id, "fixed")

    assert response.status_code == 201
    assert response.json() == {"verdict": "fixed", "report_status": "awaiting_verification"}
    [row] = db_session.scalars(select(RepairVerification)).all()
    [claim] = [
        e for e in events(db_session, located_report.id, "report_status_changed")
        if e.event_metadata["to"] == "awaiting_verification"
    ]
    assert row.claim_event_id == claim.id


def test_vote_event_does_not_reveal_the_voter(client, db_session, official_headers, located_report):
    claim_repair(client, official_headers, located_report.id)

    vote(client, resident(db_session), located_report.id, "fixed")

    [event] = events(db_session, located_report.id, "verification_vote_recorded")
    assert event.actor_user_id is None
    assert event.description == "A nearby resident confirmed the repair."
    assert event.event_metadata == {"verdict": "fixed", "by_owner": False}


def test_owner_vote_event_says_it_was_the_owner(
    client, db_session, auth_headers, official_headers, located_report
):
    claim_repair(client, official_headers, located_report.id)

    vote(client, auth_headers, located_report.id, "fixed")

    [event] = events(db_session, located_report.id, "verification_vote_recorded")
    assert event.description == "The report's owner confirmed the repair."


# --- outcomes --------------------------------------------------------------------


def test_two_fixed_votes_resolve_the_report(client, db_session, official_headers, located_report):
    claim_repair(client, official_headers, located_report.id)

    vote(client, resident(db_session), located_report.id, "fixed")
    response = vote(client, resident(db_session), located_report.id, "fixed")

    assert response.json()["report_status"] == "resolved"
    assert status_of(db_session, located_report.id) == "resolved"
    last = events(db_session, located_report.id, "report_status_changed")[-1]
    assert last.actor_user_id is None  # the votes decided, not one person
    assert last.event_metadata == {
        "from": "awaiting_verification", "to": "resolved", "decided_by": "verification"
    }
    assert last.description == (
        "Status changed from awaiting_verification to resolved. 2 residents said the repair is done."
    )


def test_owner_vote_counts_as_one(
    client, db_session, auth_headers, official_headers, located_report
):
    claim_repair(client, official_headers, located_report.id)

    vote(client, auth_headers, located_report.id, "fixed")
    response = vote(client, resident(db_session), located_report.id, "fixed")

    assert response.json()["report_status"] == "resolved"


def test_owner_still_broken_reopens_at_once(
    client, db_session, auth_headers, official_headers, located_report
):
    claim_repair(client, official_headers, located_report.id)

    response = vote(client, auth_headers, located_report.id, "still_broken")

    assert response.json()["report_status"] == "in_progress"
    last = events(db_session, located_report.id, "report_status_changed")[-1]
    assert last.description.endswith("The report's owner said the problem is still there.")


def test_owner_still_broken_wins_over_fixed_votes(
    client, db_session, auth_headers, official_headers, located_report
):
    claim_repair(client, official_headers, located_report.id)
    vote(client, resident(db_session), located_report.id, "fixed")

    response = vote(client, auth_headers, located_report.id, "still_broken")

    assert response.json()["report_status"] == "in_progress"


def test_one_neighbour_still_broken_is_not_enough(
    client, db_session, official_headers, located_report
):
    claim_repair(client, official_headers, located_report.id)

    response = vote(client, resident(db_session), located_report.id, "still_broken")

    assert response.json()["report_status"] == "awaiting_verification"


def test_two_neighbours_still_broken_reopen(client, db_session, official_headers, located_report):
    claim_repair(client, official_headers, located_report.id)

    vote(client, resident(db_session), located_report.id, "still_broken")
    response = vote(client, resident(db_session), located_report.id, "still_broken")

    assert response.json()["report_status"] == "in_progress"


def test_split_votes_keep_waiting(client, db_session, official_headers, located_report):
    claim_repair(client, official_headers, located_report.id)

    vote(client, resident(db_session), located_report.id, "fixed")
    response = vote(client, resident(db_session), located_report.id, "still_broken")

    assert response.json()["report_status"] == "awaiting_verification"


def test_reopened_by_votes_needs_a_new_repair_photo(
    client, db_session, auth_headers, official_headers, located_report
):
    claim_repair(client, official_headers, located_report.id)
    vote(client, auth_headers, located_report.id, "still_broken")

    response = change(client, official_headers, located_report.id, "awaiting_verification")

    assert response.status_code == 409
    assert error_code(response) == "REPAIR_PHOTO_REQUIRED"


def test_votes_from_an_earlier_round_do_not_count(
    client, db_session, official_headers, located_report
):
    neighbour = resident(db_session)
    claim_repair(client, official_headers, located_report.id)
    vote(client, neighbour, located_report.id, "fixed")
    change(client, official_headers, located_report.id, "in_progress")  # claim withdrawn
    add_repair_photo(client, official_headers, located_report.id)
    change(client, official_headers, located_report.id, "awaiting_verification")

    # The same neighbour may vote again in the new round; their old vote is not counted.
    response = vote(client, neighbour, located_report.id, "fixed")

    assert response.status_code == 201
    assert response.json()["report_status"] == "awaiting_verification"


# --- who may vote ----------------------------------------------------------------


def test_second_vote_in_a_round_returns_409(client, db_session, official_headers, located_report):
    neighbour = resident(db_session)
    claim_repair(client, official_headers, located_report.id)
    vote(client, neighbour, located_report.id, "still_broken")

    response = vote(client, neighbour, located_report.id, "fixed")

    assert response.status_code == 409
    assert error_code(response) == "ALREADY_VOTED"
    assert len(db_session.scalars(select(RepairVerification)).all()) == 1


@pytest.mark.parametrize("home", [FAR, None], ids=["lives_far_away", "no_home_location"])
def test_non_neighbour_gets_404(client, db_session, official_headers, located_report, home):
    claim_repair(client, official_headers, located_report.id)

    response = vote(client, resident(db_session, home), located_report.id, "fixed")

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"


def test_report_without_coordinates_only_owner_votes(
    client, db_session, auth_headers, official_headers, report
):
    claim_repair(client, official_headers, report.id)  # report has no latitude/longitude

    assert vote(client, resident(db_session), report.id, "fixed").status_code == 404
    assert vote(client, auth_headers, report.id, "fixed").status_code == 201


def test_without_coordinates_owner_fixed_resolves_alone(
    client, db_session, auth_headers, official_headers, report
):
    claim_repair(client, official_headers, report.id)

    response = vote(client, auth_headers, report.id, "fixed")

    assert response.json()["report_status"] == "resolved"
    last = events(db_session, report.id, "report_status_changed")[-1]
    assert last.description.endswith("The report's owner said the repair is done.")


def test_with_coordinates_owner_fixed_alone_is_not_enough(
    client, db_session, auth_headers, official_headers, located_report
):
    claim_repair(client, official_headers, located_report.id)

    response = vote(client, auth_headers, located_report.id, "fixed")

    assert response.json()["report_status"] == "awaiting_verification"


def test_official_gets_403(client, db_session, official_headers, located_report):
    claim_repair(client, official_headers, located_report.id)

    response = vote(client, official_headers, located_report.id, "fixed")

    assert response.status_code == 403
    assert error_code(response) == "VERIFICATION_FORBIDDEN"


@pytest.mark.parametrize("status", ["reported", "in_progress", "resolved", "closed"])
def test_vote_only_while_awaiting_verification(
    client, db_session, auth_headers, located_report, status
):
    located_report.status = status
    db_session.flush()

    response = vote(client, auth_headers, located_report.id, "fixed")

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"


def test_unknown_report_returns_404(client, auth_headers):
    assert vote(client, auth_headers, uuid.uuid4(), "fixed").status_code == 404


@pytest.mark.parametrize(
    "body",
    [{}, {"verdict": "maybe"}, {"verdict": "fixed", "user_id": "someone-else"}],
    ids=["missing", "unknown_verdict", "extra_field"],
)
def test_invalid_body_returns_422(client, auth_headers, located_report, body):
    response = client.post(VOTES.format(located_report.id), json=body, headers=auth_headers)

    assert response.status_code == 422


def test_vote_requires_login(client, located_report):
    assert client.post(VOTES.format(located_report.id), json={"verdict": "fixed"}).status_code == 401


# --- what the owner sees -----------------------------------------------------------


def test_owner_history_shows_votes_without_voter_ids(
    client, db_session, auth_headers, official_headers, located_report
):
    claim_repair(client, official_headers, located_report.id)
    vote(client, resident(db_session), located_report.id, "fixed")

    items = client.get(f"{URL}/{located_report.id}/events", headers=auth_headers).json()["items"]

    [item] = [i for i in items if i["event_type"] == "verification_vote_recorded"]
    assert item["actor_user_id"] is None
    assert item["description"] == "A nearby resident confirmed the repair."
