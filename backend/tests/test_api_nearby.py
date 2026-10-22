"""Nearby issues: sharing a report, what residents may see, and "Me too"
(api-contract.md section 12, database-schema.md section 13)."""

import io
import uuid

import pytest
from PIL import Image
from sqlalchemy import select

from app.models import Evidence, Report, ReportEvent, ReportSupport, User
from app.security import create_access_token

URL = "/api/v1/reports"
NEARBY = "/api/v1/nearby"

# The report is at REPORT_SPOT. NEAR is about 1 km north, FAR about 3.3 km north.
REPORT_SPOT = (30.7000, 76.8000)
NEAR = (30.7090, 76.8000)
FAR = (30.7300, 76.8000)

NEARBY_FIELDS = {
    "report_id", "title", "description", "category", "status", "location_text",
    "latitude", "longitude", "distance_km", "reporter_name", "created_at",
    "updated_at", "support_count", "my_support", "can_support", "status_history", "photos",
}


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


def share(client, headers, report_id, shared=True, show_name=False):
    return client.put(
        f"{URL}/{report_id}/sharing",
        json={"shared": shared, "show_name": show_name},
        headers=headers,
    )


def nearby_ids(client, headers) -> list[str]:
    response = client.get(NEARBY, headers=headers)
    assert response.status_code == 200
    return [item["report_id"] for item in response.json()["items"]]


def add_photo(client, headers, report_id, endpoint="evidence"):
    photo = io.BytesIO()
    Image.new("RGB", (40, 20), "red").save(photo, format="JPEG")
    response = client.post(
        f"{URL}/{report_id}/{endpoint}",
        headers=headers,
        files={"file": ("photo.jpg", photo.getvalue(), "image/jpeg")},
        data={"description": "The hole"},
    )
    assert response.status_code == 201
    return response.json()["id"]


# --- Sharing -------------------------------------------------------------------


def test_new_reports_are_private_and_anonymous(client, auth_headers, report):
    body = client.get(f"{URL}/{report.id}", headers=auth_headers).json()

    assert body["shared_at"] is None
    assert body["show_name"] is False
    assert body["reporter_name"] is None
    assert body["support_count"] == 0


def test_owner_can_share_and_unshare(client, db_session, auth_headers, located_report):
    response = share(client, auth_headers, located_report.id, show_name=True)

    assert response.status_code == 200
    assert response.json()["shared_at"] is not None
    assert response.json()["reporter_name"] == located_report.owner.name

    response = share(client, auth_headers, located_report.id, shared=False, show_name=False)

    assert response.json()["shared_at"] is None
    assert response.json()["reporter_name"] is None
    events = db_session.scalars(
        select(ReportEvent.event_metadata).where(
            ReportEvent.report_id == located_report.id,
            ReportEvent.event_type == "report_sharing_changed",
        ).order_by(ReportEvent.sequence)
    ).all()
    assert events == [{"shared": True, "show_name": True}, {"shared": False, "show_name": False}]


def test_sharing_again_with_the_same_choice_adds_no_event(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)
    first_shared_at = db_session.get(Report, located_report.id).shared_at

    share(client, auth_headers, located_report.id)

    assert db_session.get(Report, located_report.id).shared_at == first_shared_at
    count = db_session.scalars(
        select(ReportEvent).where(
            ReportEvent.report_id == located_report.id,
            ReportEvent.event_type == "report_sharing_changed",
        )
    ).all()
    assert len(count) == 1


def test_sharing_needs_coordinates(client, auth_headers, report):
    response = share(client, auth_headers, report.id)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LOCATION_REQUIRED"


def test_closed_report_cannot_be_shared(client, db_session, auth_headers, located_report):
    located_report.status = "closed"
    db_session.flush()

    response = share(client, auth_headers, located_report.id)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "REPORT_CLOSED"


@pytest.mark.parametrize("headers", ["other_headers", "official_headers"])
def test_only_the_owner_can_change_sharing(client, request, located_report, headers):
    response = share(client, request.getfixturevalue(headers), located_report.id)

    assert response.status_code == 404


def test_sharing_rejects_unknown_fields(client, auth_headers, located_report):
    response = client.put(
        f"{URL}/{located_report.id}/sharing",
        json={"shared": True, "show_name": False, "user_id": str(uuid.uuid4())},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_officials_see_the_name_only_when_shown(client, auth_headers, official_headers, located_report):
    share(client, auth_headers, located_report.id, show_name=False)
    assert client.get(f"{URL}/{located_report.id}", headers=official_headers).json()["reporter_name"] is None

    share(client, auth_headers, located_report.id, show_name=True)
    body = client.get(f"{URL}/{located_report.id}", headers=official_headers).json()
    assert body["reporter_name"] == located_report.owner.name


# --- Who sees what on Nearby issues ----------------------------------------------


def test_shared_report_appears_for_a_resident_within_2_km(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)

    assert nearby_ids(client, resident(db_session, NEAR)) == [str(located_report.id)]
    assert nearby_ids(client, resident(db_session, FAR)) == []


def test_private_report_does_not_appear(client, db_session, located_report):
    assert nearby_ids(client, resident(db_session, NEAR)) == []


def test_closed_shared_report_disappears(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)
    located_report.status = "closed"
    db_session.flush()

    assert nearby_ids(client, resident(db_session, NEAR)) == []


def test_own_reports_are_not_listed(client, db_session, auth_headers, user, located_report):
    share(client, auth_headers, located_report.id)
    user.home_latitude, user.home_longitude = REPORT_SPOT
    db_session.flush()

    assert nearby_ids(client, auth_headers) == []


def test_nearest_report_comes_first(client, db_session, auth_headers, user, located_report):
    closer = Report(
        user_id=user.id, title="Closer", description="Closer problem.",
        latitude=NEAR[0] - 0.001, longitude=NEAR[1],
    )
    db_session.add(closer)
    db_session.flush()
    share(client, auth_headers, located_report.id)
    share(client, auth_headers, closer.id)

    assert nearby_ids(client, resident(db_session, NEAR)) == [str(closer.id), str(located_report.id)]


def test_home_location_is_required(client, db_session):
    response = client.get(NEARBY, headers=resident(db_session, home=None))

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "HOME_LOCATION_REQUIRED"


def test_officials_get_403(client, official_headers):
    response = client.get(NEARBY, headers=official_headers)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "NEARBY_FORBIDDEN"


def test_far_resident_gets_404_for_one_report(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)

    response = client.get(f"{NEARBY}/{located_report.id}", headers=resident(db_session, FAR))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REPORT_NOT_FOUND"


def test_limited_view_hides_private_fields(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id, show_name=False)

    body = client.get(f"{NEARBY}/{located_report.id}", headers=resident(db_session, NEAR)).json()

    assert set(body) == NEARBY_FIELDS  # no owner ID, drafts, approval or submission fields
    assert body["reporter_name"] is None
    assert body["distance_km"] == 1.0
    assert body["status_history"][0]["status"] == "reported"


def test_reporter_name_is_shown_when_chosen(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id, show_name=True)

    body = client.get(f"{NEARBY}/{located_report.id}", headers=resident(db_session, NEAR)).json()

    assert body["reporter_name"] == located_report.owner.name


def test_status_history_has_no_notes(client, db_session, auth_headers, official_headers, located_report):
    share(client, auth_headers, located_report.id)
    client.post(
        f"{URL}/{located_report.id}/status",
        json={"status": "under_review", "note": "Private note"},
        headers=official_headers,
    )

    body = client.get(f"{NEARBY}/{located_report.id}", headers=resident(db_session, NEAR)).json()

    assert [step["status"] for step in body["status_history"]] == ["reported", "under_review"]
    assert set(body["status_history"][1]) == {"status", "at"}
    assert "Private note" not in str(body)


# --- Photos ------------------------------------------------------------------------


def test_resident_sees_and_downloads_problem_photos(client, db_session, auth_headers, located_report):
    photo_id = add_photo(client, auth_headers, located_report.id)
    share(client, auth_headers, located_report.id)
    neighbour = resident(db_session, NEAR)

    photos = client.get(f"{NEARBY}/{located_report.id}", headers=neighbour).json()["photos"]
    assert [p["id"] for p in photos] == [photo_id]
    assert set(photos[0]) == {"id", "content_type", "description", "uploaded_at"}

    response = client.get(f"{NEARBY}/{located_report.id}/photos/{photo_id}/file", headers=neighbour)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"


def test_repair_photos_are_not_shown(client, db_session, auth_headers, official_headers, located_report):
    located_report.status = "in_progress"
    db_session.flush()
    repair_id = add_photo(client, official_headers, located_report.id, endpoint="repair-photos")
    share(client, auth_headers, located_report.id)
    neighbour = resident(db_session, NEAR)

    assert client.get(f"{NEARBY}/{located_report.id}", headers=neighbour).json()["photos"] == []
    response = client.get(f"{NEARBY}/{located_report.id}/photos/{repair_id}/file", headers=neighbour)
    assert response.status_code == 404
    assert db_session.get(Evidence, uuid.UUID(repair_id)).kind == "repair_photo"


# --- "Me too" ------------------------------------------------------------------------


def test_me_too_counts_once_per_person(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)
    neighbour = resident(db_session, NEAR)

    response = client.post(f"{NEARBY}/{located_report.id}/support", headers=neighbour)
    assert response.status_code == 201
    assert response.json() == {"support_count": 1, "my_support": True}

    again = client.post(f"{NEARBY}/{located_report.id}/support", headers=neighbour)
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "ALREADY_SUPPORTED"

    # The owner sees the count on their report.
    assert client.get(f"{URL}/{located_report.id}", headers=auth_headers).json()["support_count"] == 1


def test_me_too_can_be_removed(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)
    neighbour = resident(db_session, NEAR)
    client.post(f"{NEARBY}/{located_report.id}/support", headers=neighbour)

    response = client.delete(f"{NEARBY}/{located_report.id}/support", headers=neighbour)

    assert response.status_code == 200
    assert response.json() == {"support_count": 0, "my_support": False}
    assert db_session.scalars(select(ReportSupport)).all() == []


def test_me_too_needs_the_report_to_be_on_your_nearby_page(client, db_session, auth_headers, located_report):
    response = client.post(f"{NEARBY}/{located_report.id}/support", headers=resident(db_session, NEAR))

    assert response.status_code == 404  # not shared


def test_supports_from_many_neighbours_are_counted(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)
    for _ in range(3):
        client.post(f"{NEARBY}/{located_report.id}/support", headers=resident(db_session, NEAR))

    listed = client.get(f"{URL}", headers=auth_headers).json()["items"][0]
    assert listed["support_count"] == 3


# --- "Already reported?" check: GET /nearby/around ------------------------------

AROUND = "/api/v1/nearby/around"
# About 100 m and 330 m north of REPORT_SPOT.
SPOT_100M = (30.7009, 76.8000)
SPOT_330M = (30.7030, 76.8000)


def around(client, headers, point):
    return client.get(AROUND, params={"latitude": point[0], "longitude": point[1]}, headers=headers)


def test_around_finds_shared_reports_within_200_m(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)
    far_home = resident(db_session, FAR)  # home 3.3 km away: not on their Nearby page

    near = around(client, far_home, SPOT_100M)
    assert near.status_code == 200
    [item] = near.json()["items"]
    assert item["report_id"] == str(located_report.id)
    assert item["distance_km"] == pytest.approx(0.1, abs=0.01)  # from the point, not the home
    assert item["can_support"] is False  # "Me too" still needs home within 2 km

    assert around(client, far_home, SPOT_330M).json()["items"] == []


def test_around_can_support_when_home_is_near(client, db_session, auth_headers, located_report):
    share(client, auth_headers, located_report.id)

    [item] = around(client, resident(db_session, NEAR), SPOT_100M).json()["items"]

    assert item["can_support"] is True


def test_around_skips_private_closed_and_own_reports(client, db_session, auth_headers, located_report):
    neighbour = resident(db_session, NEAR)
    assert around(client, neighbour, REPORT_SPOT).json()["items"] == []  # private

    share(client, auth_headers, located_report.id)
    assert around(client, auth_headers, REPORT_SPOT).json()["items"] == []  # own

    located_report.status = "closed"
    db_session.flush()
    assert around(client, neighbour, REPORT_SPOT).json()["items"] == []  # closed


def test_around_is_for_citizens_and_needs_a_valid_point(client, auth_headers, official_headers):
    assert around(client, official_headers, REPORT_SPOT).status_code == 403
    assert around(client, auth_headers, (91, 76.8)).status_code == 422
    assert client.get(AROUND, headers=auth_headers).status_code == 422
