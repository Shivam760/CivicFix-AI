import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.routers.evidence import StorageDep, file_response
from app.schemas.nearby import NearbyList, NearbyReportOut, SupportOut
from app.services.nearby import (
    add_support,
    get_nearby_photo,
    get_nearby_report,
    list_nearby_reports,
    list_reports_around,
    nearby_view,
    remove_support,
)

router = APIRouter(prefix="/nearby", tags=["nearby"])

# Every endpoint here: 403 for officials, 404 unless the report is shared, not
# closed, someone else's, and within 2 km of the user's saved home.


@router.get("", response_model=NearbyList)
def list_nearby(user: CurrentUser, db: DbSession):
    return {"items": [nearby_view(db, report, user) for report in list_nearby_reports(db, user)]}


# Declared before /{report_id}, so "around" is not read as a report ID.
@router.get("/around", response_model=NearbyList)
def list_around(
    user: CurrentUser,
    db: DbSession,
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
):
    point = (latitude, longitude)
    reports = list_reports_around(db, user, latitude, longitude)
    return {"items": [nearby_view(db, report, user, origin=point) for report in reports]}


@router.get("/{report_id}", response_model=NearbyReportOut)
def read_nearby(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return nearby_view(db, get_nearby_report(db, report_id, user), user)


@router.get("/{report_id}/photos/{evidence_id}/file")
def download_nearby_photo(
    report_id: uuid.UUID,
    evidence_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
):
    report = get_nearby_report(db, report_id, user)
    return file_response(storage, get_nearby_photo(db, report, evidence_id))


@router.post("/{report_id}/support", response_model=SupportOut, status_code=201)
def support(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return add_support(db, get_nearby_report(db, report_id, user), user)


@router.delete("/{report_id}/support", response_model=SupportOut)
def unsupport(report_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return remove_support(db, get_nearby_report(db, report_id, user), user)
