"""Evidence photo rules (database-schema.md section 11, api-contract.md section 10).

Like app/services/reports.py, these helpers work on the caller's session, but
add_report_photo commits itself: the file in storage and the row must succeed
or fail together.
"""

import logging
import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import Evidence, Report, User
from app.services import images
from app.services.reports import ensure_not_locked, record_event
from app.storage import Storage, StorageError

logger = logging.getLogger(__name__)

MAX_REPORT_PHOTOS = 5


def storage_unavailable() -> ApiError:
    return ApiError(503, "STORAGE_UNAVAILABLE", "File storage is unavailable. Try again later.")


def display_name(file_name: str | None, extension: str) -> str:
    """The uploaded file's name without any folders, e.g. C:\\fakepath\\a.jpg -> a.jpg."""
    name = re.split(r"[\\/]", file_name or "")[-1].strip()[:255]
    return name or f"photo.{extension}"


def add_report_photo(
    db: Session,
    report: Report,
    user: User,
    storage: Storage,
    data: bytes,
    file_name: str | None,
    description: str | None,
) -> Evidence:
    """Check and store a citizen's photo, then record it. Commits.

    The caller has already checked that the user owns the report.
    """
    # Lock the report row until the commit, so two uploads at once can't both
    # pass the photo limit, and a submission can't lock the report midway.
    db.refresh(report, with_for_update=True)
    ensure_not_locked(report)

    photo_count = db.scalar(
        select(func.count())
        .select_from(Evidence)
        .where(Evidence.report_id == report.id, Evidence.kind == "report_photo")
    )
    if photo_count >= MAX_REPORT_PHOTOS:
        raise ApiError(
            409,
            "EVIDENCE_LIMIT_REACHED",
            f"A report can have at most {MAX_REPORT_PHOTOS} photos.",
        )

    if len(data) > images.MAX_UPLOAD_BYTES:
        raise ApiError(413, "FILE_TOO_LARGE", "The file is larger than 5 MB.")
    try:
        image = images.clean_image(data)
    except images.UnsupportedImage:
        raise ApiError(
            415, "UNSUPPORTED_FILE_TYPE", "The file must be a JPEG, PNG, or WebP image."
        )

    evidence_id = uuid.uuid4()
    # Built only from IDs the backend made, never from the uploaded file name.
    storage_key = f"reports/{report.id}/{evidence_id}.{image.extension}"
    try:
        storage.save(storage_key, image.data, image.content_type)
    except StorageError:
        logger.warning("Saving evidence %s failed.", evidence_id, exc_info=True)
        raise storage_unavailable()

    evidence = Evidence(
        id=evidence_id,
        report_id=report.id,
        uploaded_by_user_id=user.id,
        kind="report_photo",
        file_name=display_name(file_name, image.extension),
        storage_key=storage_key,
        content_type=image.content_type,
        file_size_bytes=len(image.data),
        description=(description or "").strip() or None,  # blank -> None
    )
    try:
        db.add(evidence)
        record_event(
            db,
            report,
            "evidence_added",
            "Photo added.",
            user,
            {"evidence_id": str(evidence_id), "kind": "report_photo"},
        )
        db.commit()
    except Exception:
        # The row wasn't saved, so remove the file too: no file without a row.
        db.rollback()
        try:
            storage.delete(storage_key)
        except StorageError:
            logger.warning("Could not remove orphaned file %s.", storage_key, exc_info=True)
        raise
    db.refresh(evidence)
    return evidence


def report_photo_descriptions(db: Session, report: Report) -> list[str]:
    """The citizen's photo descriptions, oldest first, for the AI input."""
    return list(
        db.scalars(
            select(Evidence.description)
            .where(
                Evidence.report_id == report.id,
                Evidence.kind == "report_photo",
                Evidence.description.is_not(None),
            )
            .order_by(Evidence.uploaded_at, Evidence.id)
        )
    )


def get_report_evidence(db: Session, report: Report, evidence_id: uuid.UUID) -> Evidence:
    """One evidence item of this report, or 404."""
    evidence = db.get(Evidence, evidence_id)
    if evidence is None or evidence.report_id != report.id:
        raise ApiError(404, "EVIDENCE_NOT_FOUND", "The evidence does not exist.")
    return evidence


def load_file(storage: Storage, evidence: Evidence) -> bytes:
    try:
        return storage.load(evidence.storage_key)
    except StorageError:
        logger.warning("Reading evidence %s failed.", evidence.id, exc_info=True)
        raise storage_unavailable()
