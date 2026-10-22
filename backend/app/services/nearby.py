"""Nearby issues: reports their owners shared with residents within 2 km
(database-schema.md section 13, api-contract.md section 12).

Like cast_vote, the functions that change data commit themselves.
"""

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import Evidence, Report, ReportEvent, ReportSupport, User
from app.services.reports import record_event
from app.services.verification import (
    distance_km,
    distance_to_home,
    has_location,
    near_home_box,
    near_point_box,
)

NEARBY_RADIUS_KM = 2.0
# "Already reported?" check while reporting: shared reports this close to the new pin.
AROUND_RADIUS_KM = 0.2


# --- Sharing (the owner) -----------------------------------------------------


def set_sharing(db: Session, report: Report, user: User, shared: bool, show_name: bool) -> None:
    """Share or unshare the report, and choose whether the owner's name is shown.

    Not blocked by the submission lock: it doesn't change what was sent.
    """
    if shared and report.shared_at is None:
        if report.status == "closed":
            raise ApiError(409, "REPORT_CLOSED", "A closed report cannot be shared.")
        if not has_location(report):
            raise ApiError(
                409,
                "LOCATION_REQUIRED",
                "Add the report's latitude and longitude before sharing it with nearby residents.",
            )

    was_shared = report.shared_at is not None
    if shared == was_shared and show_name == report.show_name:
        return  # nothing changed, so no event

    if shared != was_shared:
        report.shared_at = datetime.now(timezone.utc) if shared else None
    report.show_name = show_name

    if shared:
        who = "with the reporter's name" if show_name else "anonymously"
        description = f"Shared with nearby residents {who}."
    else:
        description = "Not shared with nearby residents."
    record_event(
        db, report, "report_sharing_changed", description, user,
        {"shared": shared, "show_name": show_name},
    )
    db.commit()
    db.refresh(report)


# --- What residents may see ----------------------------------------------------


def ensure_citizen(user: User) -> None:
    """Officials already see every report; Nearby issues is for residents."""
    if user.role == "official":
        raise ApiError(403, "NEARBY_FORBIDDEN", "Nearby issues are for residents only.")


def may_see_nearby(user: User, report: Report) -> bool:
    """Whether the report is on this user's Nearby issues page."""
    if user.role == "official" or report.user_id == user.id:
        return False  # officials see all reports; owners see theirs under My reports
    if report.shared_at is None or report.status == "closed":
        return False
    distance = distance_to_home(user, report)  # None if either location is missing
    return distance is not None and distance <= NEARBY_RADIUS_KM


def list_nearby_reports(db: Session, user: User) -> list[Report]:
    """Shared reports near the user's home, nearest first."""
    ensure_citizen(user)
    if user.home_latitude is None:
        raise ApiError(
            409, "HOME_LOCATION_REQUIRED", "Save your home location to see issues near you."
        )
    candidates = db.scalars(
        select(Report).where(
            Report.shared_at.is_not(None),
            Report.status != "closed",
            Report.user_id != user.id,
            near_home_box(user, NEARBY_RADIUS_KM),
        )
    )
    reports = [report for report in candidates if may_see_nearby(user, report)]
    reports.sort(key=lambda report: distance_to_home(user, report))
    return reports


def list_reports_around(db: Session, user: User, latitude: float, longitude: float) -> list[Report]:
    """Other people's shared, open reports within 200 m of a point, nearest first.

    Used while reporting, to spot a problem that is already reported. The user
    needs no home location here. This shows no more than anyone could already
    see by saving a home near the point: shared reports in the limited view.
    """
    ensure_citizen(user)

    def distance(report: Report) -> float:
        return distance_km(latitude, longitude, report.latitude, report.longitude)

    candidates = db.scalars(
        select(Report).where(
            Report.shared_at.is_not(None),
            Report.status != "closed",
            Report.user_id != user.id,
            near_point_box(latitude, longitude, AROUND_RADIUS_KM),
        )
    )
    reports = [report for report in candidates if distance(report) <= AROUND_RADIUS_KM]
    reports.sort(key=distance)
    return reports


def get_nearby_report(db: Session, report_id, user: User) -> Report:
    """A report on the user's Nearby page, or 404: for everyone else it looks missing."""
    ensure_citizen(user)
    report = db.get(Report, report_id)
    if report is None or not may_see_nearby(user, report):
        raise ApiError(404, "REPORT_NOT_FOUND", "The report does not exist.")
    return report


def get_nearby_photo(db: Session, report: Report, evidence_id) -> Evidence:
    """One of the report's problem photos. Repair photos are not shown here."""
    evidence = db.get(Evidence, evidence_id)
    if evidence is None or evidence.report_id != report.id or evidence.kind != "report_photo":
        raise ApiError(404, "EVIDENCE_NOT_FOUND", "The evidence does not exist.")
    return evidence


def nearby_view(db: Session, report: Report, user: User, origin: tuple[float, float] | None = None) -> dict:
    """The Nearby report object (api-contract.md section 12) for this user.

    distance_km is measured from the user's home, or from origin when given
    (the "already reported?" check measures from the new report's pin).
    """
    # The status history: when the report was created, then each status change.
    # Only the status and time; notes and who made the change stay private.
    changes = db.execute(
        select(ReportEvent.event_metadata["to"].astext, ReportEvent.created_at)
        .where(
            ReportEvent.report_id == report.id,
            ReportEvent.event_type == "report_status_changed",
        )
        .order_by(ReportEvent.sequence)
    ).all()
    history = [{"status": "reported", "at": report.created_at}]
    history += [{"status": status, "at": at} for status, at in changes]

    photos = db.scalars(
        select(Evidence)
        .where(Evidence.report_id == report.id, Evidence.kind == "report_photo")
        .order_by(Evidence.uploaded_at, Evidence.id)
    ).all()
    return {
        "report_id": report.id,
        "title": report.title,
        "description": report.description,
        "category": report.category,
        "status": report.status,
        "location_text": report.location_text,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "distance_km": round(
            distance_km(*origin, report.latitude, report.longitude)
            if origin
            else distance_to_home(user, report),
            # Within 200 m, kilometres with 1 decimal would mostly say 0.0 or 0.1.
            3 if origin else 1,
        ),
        "reporter_name": report.reporter_name,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "support_count": report.support_count,
        "my_support": has_supported(db, report, user),
        # "Me too" needs the report on the user's Nearby page (home within 2 km).
        "can_support": may_see_nearby(user, report),
        "status_history": history,
        "photos": photos,
    }


# --- "Me too" ------------------------------------------------------------------


def has_supported(db: Session, report: Report, user: User) -> bool:
    return (
        db.scalar(
            select(func.count(ReportSupport.id)).where(
                ReportSupport.report_id == report.id, ReportSupport.user_id == user.id
            )
        )
        > 0
    )


def support_state(db: Session, report: Report, user: User) -> dict:
    db.refresh(report)  # reloads support_count
    return {"support_count": report.support_count, "my_support": has_supported(db, report, user)}


def add_support(db: Session, report: Report, user: User) -> dict:
    """Add the user's "Me too". The unique constraint stops a second one."""
    if has_supported(db, report, user):
        raise ApiError(409, "ALREADY_SUPPORTED", "You already said you see this problem too.")
    db.add(ReportSupport(report_id=report.id, user_id=user.id))
    try:
        db.commit()
    except IntegrityError:
        # Two requests at the same moment: the database kept only one.
        db.rollback()
        raise ApiError(409, "ALREADY_SUPPORTED", "You already said you see this problem too.")
    return support_state(db, report, user)


def remove_support(db: Session, report: Report, user: User) -> dict:
    """Remove the user's "Me too". Removing one that isn't there is fine."""
    db.execute(
        delete(ReportSupport).where(
            ReportSupport.report_id == report.id, ReportSupport.user_id == user.id
        )
    )
    db.commit()
    return support_state(db, report, user)
