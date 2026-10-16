import io
import uuid

import pytest
from PIL import Image
from sqlalchemy import select

from app.models import AgentRun, Evidence, ReportEvent


def url(report_id, path="evidence") -> str:
    return f"/api/v1/reports/{report_id}/{path}"


def error_code(response) -> str:
    return response.json()["error"]["code"]


def image_bytes(fmt="JPEG") -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (40, 20), "red").save(output, format=fmt)
    return output.getvalue()


def upload(client, headers, report_id, data=None, file_name="pothole.jpg", description=None):
    form = {"description": description} if description is not None else {}
    return client.post(
        url(report_id),
        headers=headers,
        files={"file": (file_name, image_bytes() if data is None else data, "image/jpeg")},
        data=form,
    )


def evidence_rows(db_session, report_id) -> list[Evidence]:
    return list(db_session.scalars(select(Evidence).where(Evidence.report_id == report_id)))


def event_types(db_session, report_id) -> list[str]:
    return list(
        db_session.scalars(
            select(ReportEvent.event_type)
            .where(ReportEvent.report_id == report_id)
            .order_by(ReportEvent.sequence)
        )
    )


# --- POST /evidence: success ----------------------------------------------------


def test_upload_returns_evidence_and_stores_file(
    client, db_session, storage, auth_headers, report, user
):
    response = upload(client, auth_headers, report.id, description="Seen from the bus stop.")

    assert response.status_code == 201
    body = response.json()
    assert body["report_id"] == str(report.id)
    assert body["kind"] == "report_photo"
    assert body["file_name"] == "pothole.jpg"
    assert body["content_type"] == "image/jpeg"
    assert body["description"] == "Seen from the bus stop."
    assert body["uploaded_by_user_id"] == str(user.id)
    assert "storage_key" not in body

    row = evidence_rows(db_session, report.id)[0]
    assert row.storage_key == f"reports/{report.id}/{row.id}.jpg"
    assert storage.files[row.storage_key]  # the file really is in storage
    assert body["file_size_bytes"] == len(storage.files[row.storage_key])


def test_upload_records_event(client, db_session, auth_headers, report):
    upload(client, auth_headers, report.id)

    event = db_session.scalars(
        select(ReportEvent).where(ReportEvent.event_type == "evidence_added")
    ).one()
    assert event.report_id == report.id
    assert event.event_metadata["kind"] == "report_photo"


def test_blank_description_stored_as_null(client, auth_headers, report):
    response = upload(client, auth_headers, report.id, description="   ")

    assert response.json()["description"] is None


def test_real_type_used_not_declared_one(client, auth_headers, report):
    # PNG bytes, but named and declared as a JPEG.
    response = upload(client, auth_headers, report.id, data=image_bytes("PNG"))

    assert response.status_code == 201
    assert response.json()["content_type"] == "image/png"


@pytest.mark.parametrize(
    ("sent", "stored"),
    [
        ("C:\\fakepath\\pothole.jpg", "pothole.jpg"),
        ("../../app/main.py", "main.py"),
    ],
)
def test_file_name_has_no_folders(client, auth_headers, report, sent, stored):
    response = upload(client, auth_headers, report.id, file_name=sent)

    assert response.json()["file_name"] == stored


def test_upload_allowed_up_to_the_limit(client, auth_headers, report):
    for _ in range(5):
        assert upload(client, auth_headers, report.id).status_code == 201


# --- POST /evidence: rejected uploads -------------------------------------------


def test_sixth_photo_rejected(client, db_session, auth_headers, report):
    for _ in range(5):
        upload(client, auth_headers, report.id)

    response = upload(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "EVIDENCE_LIMIT_REACHED"
    assert len(evidence_rows(db_session, report.id)) == 5


def test_not_an_image_rejected(client, db_session, storage, auth_headers, report):
    response = upload(client, auth_headers, report.id, data=b"%PDF-1.7 not a photo")

    assert response.status_code == 415
    assert error_code(response) == "UNSUPPORTED_FILE_TYPE"
    assert storage.files == {}
    assert evidence_rows(db_session, report.id) == []


def test_too_large_file_rejected(client, storage, auth_headers, report, monkeypatch):
    # Lower the limit instead of sending a real 5 MB file.
    monkeypatch.setattr("app.services.images.MAX_UPLOAD_BYTES", 100)

    response = upload(client, auth_headers, report.id)

    assert response.status_code == 413
    assert error_code(response) == "FILE_TOO_LARGE"
    assert storage.files == {}


def test_description_too_long_rejected(client, auth_headers, report):
    response = upload(client, auth_headers, report.id, description="x" * 501)

    assert response.status_code == 422


def test_missing_file_rejected(client, auth_headers, report):
    response = client.post(url(report.id), headers=auth_headers, data={"description": "Hi"})

    assert response.status_code == 422


def test_locked_report_rejected(client, db_session, storage, auth_headers, report):
    report.submission_status = "pending"
    db_session.flush()

    response = upload(client, auth_headers, report.id)

    assert response.status_code == 409
    assert error_code(response) == "REPORT_LOCKED"
    assert storage.files == {}


@pytest.mark.parametrize("headers", ["other_headers", "official_headers"])
def test_only_owner_can_upload(client, storage, report, headers, request):
    response = upload(client, request.getfixturevalue(headers), report.id)

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"
    assert storage.files == {}


def test_upload_requires_login(client, report):
    assert upload(client, {}, report.id).status_code == 401


def test_storage_failure_saves_nothing(client, db_session, storage, auth_headers, report):
    storage.fail = True

    response = upload(client, auth_headers, report.id)

    assert response.status_code == 503
    assert error_code(response) == "STORAGE_UNAVAILABLE"
    assert evidence_rows(db_session, report.id) == []
    assert "evidence_added" not in event_types(db_session, report.id)


def test_file_removed_when_saving_row_fails(client, storage, auth_headers, report, monkeypatch):
    def broken_record_event(*args, **kwargs):
        raise RuntimeError("database trouble")

    monkeypatch.setattr("app.services.evidence.record_event", broken_record_event)

    with pytest.raises(RuntimeError):
        upload(client, auth_headers, report.id)
    assert storage.files == {}  # no file left without a row


# --- GET /evidence --------------------------------------------------------------


def test_list_oldest_first(client, auth_headers, report):
    first = upload(client, auth_headers, report.id, description="first").json()
    second = upload(client, auth_headers, report.id, description="second").json()

    response = client.get(url(report.id), headers=auth_headers)

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [first["id"], second["id"]]


def test_list_empty(client, auth_headers, report):
    assert client.get(url(report.id), headers=auth_headers).json() == {"items": []}


def test_official_can_list(client, auth_headers, official_headers, report):
    upload(client, auth_headers, report.id)

    response = client.get(url(report.id), headers=official_headers)

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1


def test_other_user_cannot_list(client, other_headers, report):
    response = client.get(url(report.id), headers=other_headers)

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"


# --- GET /evidence/{id}/file ----------------------------------------------------


def file_url(report_id, evidence_id) -> str:
    return url(report_id, f"evidence/{evidence_id}/file")


@pytest.mark.parametrize("headers", ["auth_headers", "official_headers"])
def test_owner_and_official_can_download(client, storage, auth_headers, report, headers, request):
    evidence = upload(client, auth_headers, report.id).json()

    response = client.get(
        file_url(report.id, evidence["id"]), headers=request.getfixturevalue(headers)
    )

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "image/jpeg"
    assert response.headers["Cache-Control"] == "private"
    assert response.content == next(iter(storage.files.values()))


def test_other_user_cannot_download(client, auth_headers, other_headers, report):
    evidence = upload(client, auth_headers, report.id).json()

    response = client.get(file_url(report.id, evidence["id"]), headers=other_headers)

    assert response.status_code == 404
    assert error_code(response) == "REPORT_NOT_FOUND"


def test_download_unknown_evidence(client, auth_headers, report):
    response = client.get(file_url(report.id, uuid.uuid4()), headers=auth_headers)

    assert response.status_code == 404
    assert error_code(response) == "EVIDENCE_NOT_FOUND"


def test_evidence_of_another_report_not_found(client, auth_headers, report):
    other = client.post(
        "/api/v1/reports",
        headers=auth_headers,
        json={"title": "Second report", "description": "Another issue."},
    ).json()
    evidence = upload(client, auth_headers, other["id"]).json()

    # Right evidence ID, wrong report in the URL.
    response = client.get(file_url(report.id, evidence["id"]), headers=auth_headers)

    assert response.status_code == 404
    assert error_code(response) == "EVIDENCE_NOT_FOUND"


def test_download_when_storage_fails(client, storage, auth_headers, report):
    evidence = upload(client, auth_headers, report.id).json()
    storage.fail = True

    response = client.get(file_url(report.id, evidence["id"]), headers=auth_headers)

    assert response.status_code == 503
    assert error_code(response) == "STORAGE_UNAVAILABLE"


# --- AI input -------------------------------------------------------------------


def test_analysis_receives_photo_descriptions(client, db_session, auth_headers, report):
    upload(client, auth_headers, report.id, description="Deep pothole, about 30 cm.")
    upload(client, auth_headers, report.id)  # no description: skipped
    upload(client, auth_headers, report.id, description="Water collects in it.")

    response = client.post(url(report.id, "analyze"), headers=auth_headers)

    assert response.status_code == 200
    run = db_session.scalars(select(AgentRun).where(AgentRun.report_id == report.id)).one()
    assert run.input_snapshot["evidence_descriptions"] == [
        "Deep pothole, about 30 cm.",
        "Water collects in it.",
    ]
