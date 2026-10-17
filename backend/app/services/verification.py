"""Neighbour verification of claimed repairs (database-schema.md section 12,
api-contract.md section 11).

Like add_report_photo, cast_vote commits itself: the vote, its event and a
possible status change are saved together.
"""

import math

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import RepairVerification, Report, ReportEvent, User
from app.services.reports import record_event

VERIFICATION_RADIUS_KM = 2.0
VOTES_TO_DECIDE = 2
EARTH_RADIUS_KM = 6371.0


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points (the haversine formula)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def distance_to_home(user: User, report: Report) -> float | None:
    """Kilometres from the user's home to the report, or None if either location is missing."""
    if None in (user.home_latitude, user.home_longitude, report.latitude, report.longitude):
        return None
    return distance_km(user.home_latitude, user.home_longitude, report.latitude, report.longitude)


def ensure_not_official(user: User) -> None:
    """Officials never take part in verification, so they can't confirm their own claims."""
    if user.role == "official":
        raise ApiError(
            403, "VERIFICATION_FORBIDDEN", "Officials cannot take part in repair verification."
        )


def may_verify(user: User, report: Report) -> bool:
    """Whether the user may verify this report now (ignoring whether they already voted)."""
    if report.status != "awaiting_verification" or user.role == "official":
        return False
    if report.user_id == user.id:
        return True
    distance = distance_to_home(user, report)  # None if the report has no location
    return distance is not None and distance <= VERIFICATION_RADIUS_KM


def get_verifiable_report(db: Session, report_id, user: User) -> Report:
    """A report the user may verify, or 404: for everyone else it looks missing."""
    ensure_not_official(user)
    report = db.get(Report, report_id)
    if report is None or not may_verify(user, report):
        raise ApiError(404, "REPORT_NOT_FOUND", "The report does not exist.")
    return report


def current_claim_event(db: Session, report: Report) -> ReportEvent:
    """The status event that started this verification round."""
    return db.scalars(
        select(ReportEvent)
        .where(
            ReportEvent.report_id == report.id,
            ReportEvent.event_type == "report_status_changed",
            ReportEvent.event_metadata["to"].astext == "awaiting_verification",
        )
        .order_by(ReportEvent.sequence.desc())
        .limit(1)
    ).one()


def has_location(report: Report) -> bool:
    return report.latitude is not None and report.longitude is not None


def decide_outcome(votes: list[RepairVerification], report: Report) -> tuple[str, str] | None:
    """The new status and the reason, or None while the round is undecided.

    The order matters: "still broken" wins over "fixed", and the owner's
    "still broken" decides on its own (database-schema.md section 12).
    """
    broken = [vote for vote in votes if vote.verdict == "still_broken"]
    fixed = [vote for vote in votes if vote.verdict == "fixed"]
    if any(vote.user_id == report.user_id for vote in broken):
        return "in_progress", "The report's owner said the problem is still there."
    # Without coordinates no neighbour can vote, so the owner's vote decides alone.
    if not has_location(report) and any(vote.user_id == report.user_id for vote in fixed):
        return "resolved", "The report's owner said the repair is done."
    if len(broken) >= VOTES_TO_DECIDE:
        return "in_progress", f"{len(broken)} residents said the problem is still there."
    if len(fixed) >= VOTES_TO_DECIDE:
        # "Said", not "verified": votes are community confirmation, not proof.
        return "resolved", f"{len(fixed)} residents said the repair is done."
    return None


def vote_description(verdict: str, by_owner: bool) -> str:
    who = "The report's owner" if by_owner else "A nearby resident"
    if verdict == "fixed":
        return f"{who} confirmed the repair."
    return f"{who} said the problem is still there."


def cast_vote(db: Session, report: Report, user: User, verdict: str) -> RepairVerification:
    """Record the user's vote and apply the outcome if this vote decides it. Commits.

    The caller has already checked, with get_verifiable_report, that the user may vote.
    """
    # Lock the report row until the commit, so two votes at once are counted
    # one after the other and the outcome is applied only once.
    db.refresh(report, with_for_update=True)
    if not may_verify(user, report):  # the status may have changed meanwhile
        raise ApiError(404, "REPORT_NOT_FOUND", "The report does not exist.")

    claim = current_claim_event(db, report)
    already_voted = db.scalar(
        select(func.count())
        .select_from(RepairVerification)
        .where(
            RepairVerification.claim_event_id == claim.id,
            RepairVerification.user_id == user.id,
        )
    )
    if already_voted:
        raise ApiError(409, "ALREADY_VOTED", "You already voted on this repair.")

    vote = RepairVerification(
        report_id=report.id, claim_event_id=claim.id, user_id=user.id, verdict=verdict
    )
    db.add(vote)
    by_owner = report.user_id == user.id
    # No actor: the owner must not learn which neighbours voted. The vote row
    # keeps the voter for auditing.
    record_event(
        db,
        report,
        "verification_vote_recorded",
        vote_description(verdict, by_owner),
        None,
        {"verdict": verdict, "by_owner": by_owner},
    )

    votes = list(
        db.scalars(select(RepairVerification).where(RepairVerification.claim_event_id == claim.id))
    )
    outcome = decide_outcome(votes, report)
    if outcome is not None:
        new_status, reason = outcome
        old_status = report.status
        report.status = new_status
        # No actor either: the votes decided it, not one person. Moving to
        # in_progress starts a new repair round (repair_photos_this_round).
        record_event(
            db,
            report,
            "report_status_changed",
            f"Status changed from {old_status} to {new_status}. {reason}",
            None,
            {"from": old_status, "to": new_status, "decided_by": "verification"},
        )

    db.commit()
    db.refresh(vote)
    return vote
