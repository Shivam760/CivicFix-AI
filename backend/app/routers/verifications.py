import uuid

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.routers.evidence import StorageDep, file_response
from app.schemas.verification import VerificationList, VerificationRequestOut, VoteIn, VoteOut
from app.services.evidence import get_report_evidence
from app.services.verification import (
    cast_vote,
    ensure_not_official,
    get_verifiable_report,
    list_verifiable_reports,
    verification_request,
)

router = APIRouter(prefix="/verifications", tags=["verifications"])

# Every endpoint here: 403 for officials, 404 unless the user is the report's
# owner or lives nearby and the report is awaiting_verification.


@router.get("", response_model=VerificationList)
def list_verifications(user: CurrentUser, db: DbSession):
    ensure_not_official(user)
    items = [verification_request(db, report, user) for report in list_verifiable_reports(db, user)]
    items.sort(key=lambda item: item["awaiting_since"])  # oldest claim first
    return {"items": items}


@router.get("/{report_id}", response_model=VerificationRequestOut)
def read_verification(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    report = get_verifiable_report(db, report_id, user)
    return verification_request(db, report, user)


@router.get("/{report_id}/evidence/{evidence_id}/file")
def download_verification_photo(
    report_id: uuid.UUID,
    evidence_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
):
    report = get_verifiable_report(db, report_id, user)
    evidence = get_report_evidence(db, report, evidence_id)
    return file_response(storage, evidence)


@router.post("/{report_id}/votes", response_model=VoteOut, status_code=201)
def vote(report_id: uuid.UUID, body: VoteIn, user: CurrentUser, db: DbSession):
    report = get_verifiable_report(db, report_id, user)
    saved = cast_vote(db, report, user, body.verdict)
    return VoteOut(verdict=saved.verdict, report_status=report.status)
