"""Officials' after-repair photos and the photo needed to claim a repair
(api-contract.md sections 4 and 10, database-schema.md section 11)."""

import io

import pytest
from PIL import Image
from sqlalchemy import select

from app.models import Evidence, Report, ReportEvent
from app.services.evidence import report_photo_descriptions

URL = "/api/v1/reports"


def image_bytes() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (40, 20), "green").save(output, format="JPEG")
    return output.getvalue()


def upload_repair(client, headers, report_id, data=None, description=None):
    form = {"description": description} if description is not None else {}
    return client.post(
        f"{URL}/{report_id}/repair-photos",
        headers=headers,
        files={"file": ("fixed.jpg", image_bytes() if data is None else data, "image/jpeg")},
        data=form,
    )


def change(client, headers, report_id, status):
    return client.post(f"{URL}/{report_id}/status", json={"status": status}, headers=headers)


def start_work(client, headers, report_id):
    """Move a new report to in_progress through the API, so the round's
    status event exists like in real use."""
    for status in ["under_review", "in_progress"]:
        assert change(client, headers, report_id, status).status_code == 200


def set_status(db_session, report_id, status):
    db_session.get(Report, report_id).status = status
    db_session.flush()


def repair_rows(db_session, report_id) -> list[Evidence]:
    return list(
        db_session.scalars(
            select(Evidence).where(
                Evidence.report_id == report_id, Evidence.kind == "repair_photo"
            )
        )
    )


def error_code(response) -> str:
    return response.json()["error"]["code"]


# --- uploading -------------------------------------------------------------------


def test_official_uploads_repair_photo(client, db_session, storage, official_headers, report):
    set_status(db_session, report.id, "in_progress")
    official_id = client.get("/api/v1/auth/me", headers=official_headers).json()["id"]

    response = upload_repair(client, official_headers, report.id, description="Hole filled.")

    assert response.status_code == 201
    body = response.json()
    assert body["kind"] == "repair_photo"
    assert body["description"] == "Hole filled."
    assert body["uploaded_by_user_id"] == official_id
    [row] = repair_rows(db_session, report.id)
    assert storage.files[row.storage_key]


def test_upload_records_event_as_officials_claim(client, db_session, official_headers, report):
    set_status(db_session, report.id, "in_progress")

    upload_repair(client, official_headers, report.id)

    event = db_session.scalars(
        select(ReportEvent).where(ReportEvent.event_type == "evidence_added")
    ).one()
    assert event.description == "Repair photo added by an official."
    assert event.event_metadata["kind"] == "repair_photo"


def test_owner_gets_403_and_nothing_is_stored(client, db_session, storage, auth_headers, report):
    set_status(db_session, report.id, "in_progress")

    response = upload_repair(client, auth_headers, report.id)

    assert response.status_code == 403
    assert error_code(response) == "REPAIR_PHOTO_FORBIDDEN"
    assert repair_rows(db_session, report.id) == []
    assert storage.files == {}


def test_other_citizen_gets_404(client, db_session, other_headers, report):
    set_status(db_session, report.id, "in_progress")

    response = upload_repair(client, other_headers, report.id)

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"


def test_upload_requires_login(client, report):
    response = client.post(
        f"{URL}/{report.id}/repair-photos",
        files={"file": ("fixed.jpg", image_bytes(), "image/jpeg")},
    )
    assert response.status_code == 401


@pytest.mark.parametrize(
    "status", ["reported", "under_review", "awaiting_verification", "resolved", "closed"]
)
def test_upload_only_while_in_progress(client, db_session, official_headers, report, status):
    set_status(db_session, report.id, status)

    response = upload_repair(client, official_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "REPORT_NOT_IN_PROGRESS"
    assert repair_rows(db_session, report.id) == []


def test_upload_allowed_while_submission_is_locked(client, db_session, official_headers, report):
    row = db_session.get(Report, report.id)
    row.status = "in_progress"
    row.submission_status = "confirmed"
    row.external_reference = "REF-1"
    row.submitted_at = row.created_at
    db_session.flush()

    assert upload_repair(client, official_headers, report.id).status_code == 201


def test_invalid_image_returns_415(client, db_session, official_headers, report):
    set_status(db_session, report.id, "in_progress")

    response = upload_repair(client, official_headers, report.id, data=b"not an image")

    assert response.status_code == 415
    assert error_code(response) == "UNSUPPORTED_FILE_TYPE"


def test_storage_outage_returns_503_and_records_nothing(
    client, db_session, storage, official_headers, report
):
    set_status(db_session, report.id, "in_progress")
    storage.fail = True

    response = upload_repair(client, official_headers, report.id)

    assert response.status_code == 503
    assert error_code(response) == "STORAGE_UNAVAILABLE"
    assert repair_rows(db_session, report.id) == []


# --- limit per repair round --------------------------------------------------------


def test_sixth_photo_in_a_round_is_refused(client, official_headers, report):
    start_work(client, official_headers, report.id)
    for _ in range(5):
        assert upload_repair(client, official_headers, report.id).status_code == 201

    response = upload_repair(client, official_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "EVIDENCE_LIMIT_REACHED"


def test_withdrawn_claim_starts_a_new_round(client, official_headers, report):
    start_work(client, official_headers, report.id)
    for _ in range(5):
        upload_repair(client, official_headers, report.id)
    change(client, official_headers, report.id, "awaiting_verification")
    change(client, official_headers, report.id, "in_progress")  # claim withdrawn

    assert upload_repair(client, official_headers, report.id).status_code == 201


def test_repair_photos_do_not_use_up_citizens_photo_limit(
    client, db_session, auth_headers, official_headers, report
):
    set_status(db_session, report.id, "in_progress")
    for _ in range(5):
        upload_repair(client, official_headers, report.id)

    response = client.post(
        f"{URL}/{report.id}/evidence",
        headers=auth_headers,
        files={"file": ("pothole.jpg", image_bytes(), "image/jpeg")},
    )

    assert response.status_code == 201


# --- claiming the repair needs a photo from this round ---------------------------------------


def test_claim_without_repair_photo_returns_409(client, db_session, official_headers, report):
    start_work(client, official_headers, report.id)

    response = change(client, official_headers, report.id, "awaiting_verification")

    assert response.status_code == 409
    assert error_code(response) == "REPAIR_PHOTO_REQUIRED"
    assert db_session.get(Report, report.id).status == "in_progress"


def test_claim_with_repair_photo_succeeds(client, official_headers, report):
    start_work(client, official_headers, report.id)
    upload_repair(client, official_headers, report.id)

    response = change(client, official_headers, report.id, "awaiting_verification")

    assert response.status_code == 200
    assert response.json()["status"] == "awaiting_verification"


def test_photo_from_earlier_round_does_not_count(client, official_headers, report):
    start_work(client, official_headers, report.id)
    upload_repair(client, official_headers, report.id)
    change(client, official_headers, report.id, "awaiting_verification")
    change(client, official_headers, report.id, "in_progress")  # claim withdrawn

    response = change(client, official_headers, report.id, "awaiting_verification")
    assert response.status_code == 409
    assert error_code(response) == "REPAIR_PHOTO_REQUIRED"

    upload_repair(client, official_headers, report.id)
    assert change(client, official_headers, report.id, "awaiting_verification").status_code == 200


def test_citizen_photo_does_not_count_as_repair(
    client, db_session, auth_headers, official_headers, report
):
    client.post(
        f"{URL}/{report.id}/evidence",
        headers=auth_headers,
        files={"file": ("pothole.jpg", image_bytes(), "image/jpeg")},
    )
    start_work(client, official_headers, report.id)

    response = change(client, official_headers, report.id, "awaiting_verification")

    assert response.status_code == 409
    assert error_code(response) == "REPAIR_PHOTO_REQUIRED"


def test_closing_from_in_progress_needs_no_photo(client, official_headers, report):
    start_work(client, official_headers, report.id)

    assert change(client, official_headers, report.id, "closed").status_code == 200


# --- who sees repair photos ---------------------------------------------------------


def test_owner_can_list_and_download_repair_photo(
    client, db_session, auth_headers, official_headers, report
):
    set_status(db_session, report.id, "in_progress")
    evidence_id = upload_repair(client, official_headers, report.id).json()["id"]

    items = client.get(f"{URL}/{report.id}/evidence", headers=auth_headers).json()["items"]
    assert [item["kind"] for item in items] == ["repair_photo"]

    response = client.get(f"{URL}/{report.id}/evidence/{evidence_id}/file", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"


def test_repair_photo_description_is_not_sent_to_ai(
    client, db_session, official_headers, report
):
    set_status(db_session, report.id, "in_progress")
    upload_repair(client, official_headers, report.id, description="Hole filled.")

    assert report_photo_descriptions(db_session, report) == []
