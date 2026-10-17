import uuid

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.schemas.verification import VoteIn, VoteOut
from app.services.verification import cast_vote, get_verifiable_report

router = APIRouter(prefix="/verifications", tags=["verifications"])


@router.post("/{report_id}/votes", response_model=VoteOut, status_code=201)
def vote(report_id: uuid.UUID, body: VoteIn, user: CurrentUser, db: DbSession):
    # 403 for officials, 404 unless the user is the owner or lives nearby.
    report = get_verifiable_report(db, report_id, user)
    saved = cast_vote(db, report, user, body.verdict)
    return VoteOut(verdict=saved.verdict, report_status=report.status)
