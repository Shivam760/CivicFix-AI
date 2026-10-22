import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import AdminUser, DbSession
from app.schemas.admin import (
    ApprovalStatus,
    ApproveIn,
    OfficialAccountList,
    OfficialAccountOut,
    RejectIn,
)
from app.services import officials

# Admins only: AdminUser answers 403 ADMIN_ONLY to everyone else.
router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/officials", response_model=OfficialAccountList)
def list_officials(
    admin: AdminUser,
    db: DbSession,
    approval_status: Annotated[ApprovalStatus | None, Query()] = None,
):
    return {"items": officials.list_officials(db, approval_status)}


@router.post("/officials/{user_id}/approve", response_model=OfficialAccountOut)
def approve_official(
    user_id: uuid.UUID, admin: AdminUser, db: DbSession, body: ApproveIn | None = None
):
    official = officials.get_official(db, user_id)
    officials.approve(official, admin, body.note if body else None)
    db.commit()
    db.refresh(official)
    return official


@router.post("/officials/{user_id}/reject", response_model=OfficialAccountOut)
def reject_official(user_id: uuid.UUID, body: RejectIn, admin: AdminUser, db: DbSession):
    official = officials.get_official(db, user_id)
    officials.reject(official, admin, body.note)
    db.commit()
    db.refresh(official)
    return official
