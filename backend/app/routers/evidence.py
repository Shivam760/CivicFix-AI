import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models import Evidence
from app.schemas.evidence import EvidenceList, EvidenceOut
from app.services import images
from app.services.evidence import (
    add_repair_photo,
    add_report_photo,
    get_report_evidence,
    load_file,
)
from app.services.reports import get_owned_report, get_visible_report
from app.storage import Storage, get_storage

router = APIRouter(prefix="/reports/{report_id}", tags=["evidence"])

StorageDep = Annotated[Storage, Depends(get_storage)]


def read_upload(file: UploadFile) -> bytes:
    # Read one byte more than allowed, so a too-large file is noticed without
    # reading all of it.
    return file.file.read(images.MAX_UPLOAD_BYTES + 1)


@router.post("/evidence", response_model=EvidenceOut, status_code=201)
def upload_evidence(
    report_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
    # multipart/form-data fields: the image file and an optional description.
    file: Annotated[UploadFile, File()],
    description: Annotated[str | None, Form(max_length=500)] = None,
):
    report = get_owned_report(db, report_id, user)  # officials can't upload (404)
    data = read_upload(file)
    return add_report_photo(db, report, user, storage, data, file.filename, description)


@router.post("/repair-photos", response_model=EvidenceOut, status_code=201)
def upload_repair_photo(
    report_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
    file: Annotated[UploadFile, File()],
    description: Annotated[str | None, Form(max_length=500)] = None,
):
    # The owner can see the report, so they get 403 (from add_repair_photo)
    # rather than 404; other citizens get 404.
    report = get_visible_report(db, report_id, user)
    data = read_upload(file)
    return add_repair_photo(db, report, user, storage, data, file.filename, description)


@router.get("/evidence", response_model=EvidenceList)
def list_evidence(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    report = get_visible_report(db, report_id, user)  # owner or official
    evidence = db.scalars(
        select(Evidence)
        .where(Evidence.report_id == report.id)
        .order_by(Evidence.uploaded_at, Evidence.id)  # oldest first
    ).all()
    return {"items": evidence}


@router.get("/evidence/{evidence_id}/file")
def download_evidence(
    report_id: uuid.UUID,
    evidence_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
):
    report = get_visible_report(db, report_id, user)
    evidence = get_report_evidence(db, report, evidence_id)
    return Response(
        content=load_file(storage, evidence),
        media_type=evidence.content_type,
        headers={
            # Browsers may cache it for this user, but shared caches must not.
            "Cache-Control": "private",
            # Never guess another type than the one we send.
            "X-Content-Type-Options": "nosniff",
        },
    )
