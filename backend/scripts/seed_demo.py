"""Create demo accounts and reports that show every step of the workflow.

Run from backend/:  python -m scripts.seed_demo [--reset]

The password for all demo accounts is asked for at a hidden prompt.
--reset deletes the reports of the demo accounts (with their photos) and
creates them again. Nothing that belongs to other accounts is touched.

The reports are built with the same service functions the API uses, so their
statuses, events and repair rounds follow the real rules. Photos are generated
here and uploaded to the configured storage (STORAGE_PROVIDER). The AI analysis
always uses the fake analyzer: no API quota is needed, and the result is the
same every time.
"""

import argparse
import getpass
import io
import logging
import sys
from datetime import datetime, timezone

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.ai.analyzers import fake_analyze
from app.database import engine
from app.errors import ApiError
from app.models import (
    AgentRun,
    ComplaintDraft,
    Evidence,
    RepairVerification,
    Report,
    ReportEvent,
    User,
)
from app.security import hash_password
from app.services.analysis import run_analysis
from app.services.evidence import add_repair_photo, add_report_photo
from app.services.reports import change_status, record_event
from app.services.verification import cast_vote
from app.storage import Storage, StorageError, get_storage
from scripts.set_password import MAX_LENGTH, MIN_LENGTH

logger = logging.getLogger(__name__)

# The reports are around this point. The near neighbour lives about 1 km away
# (inside the 2 km verification radius), the far one about 3.2 km away.
CENTRE = (30.7410, 76.7820)

DEMO_ACCOUNTS = {
    "citizen": {"email": "demo-citizen@example.com", "name": "Demo Citizen",
                "role": "citizen", "home": None},
    "official": {"email": "demo-official@example.com", "name": "Demo Official",
                 "role": "official", "home": None},
    "near": {"email": "demo-neighbour-near@example.com", "name": "Demo Neighbour (near)",
             "role": "citizen", "home": (30.7480, 76.7880)},
    "far": {"email": "demo-neighbour-far@example.com", "name": "Demo Neighbour (far)",
            "role": "citizen", "home": (30.7700, 76.7820)},
}
DEMO_EMAILS = [account["email"] for account in DEMO_ACCOUNTS.values()]


class DemoDataExists(Exception):
    """The demo accounts already exist and --reset was not given."""


def demo_photo(label: str, colour: str) -> bytes:
    """A plain JPEG with a caption, clearly marked as a demo picture."""
    image = Image.new("RGB", (640, 480), colour)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=36)
    draw.text((40, 180), label, fill="white", font=font)
    draw.text((40, 240), "Demo photo", fill="white", font=font)
    output = io.BytesIO()
    image.save(output, format="JPEG")
    return output.getvalue()


# --- accounts ---------------------------------------------------------------------


def demo_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).where(User.email.in_(DEMO_EMAILS))))


def create_accounts(db: Session, password: str) -> dict[str, User]:
    """Create the demo accounts, or bring existing ones back to their demo settings."""
    existing = {user.email: user for user in demo_users(db)}
    password_hash = hash_password(password)  # hashing is slow on purpose: do it once
    users = {}
    for key, account in DEMO_ACCOUNTS.items():
        user = existing.get(account["email"])
        if user is None:
            user = User(email=account["email"])
            db.add(user)
        user.name = account["name"]
        user.role = account["role"]
        user.password_hash = password_hash
        user.home_latitude, user.home_longitude = account["home"] or (None, None)
        users[key] = user
    db.commit()
    return users


# --- reset ------------------------------------------------------------------------


def reset_demo_data(db: Session, storage: Storage) -> int:
    """Delete every report owned by a demo account, with all its rows and files.

    Returns how many reports were deleted. The accounts themselves are kept:
    a demo official may have acted on other people's reports, and those
    events must keep pointing to an existing user.
    """
    report_ids = list(
        db.scalars(
            select(Report.id).join(User, Report.user_id == User.id).where(
                User.email.in_(DEMO_EMAILS)
            )
        )
    )
    if not report_ids:
        return 0
    storage_keys = list(
        db.scalars(select(Evidence.storage_key).where(Evidence.report_id.in_(report_ids)))
    )
    # Every foreign key is RESTRICT, so rows are deleted children first.
    # Votes point to claim events, so they go before the events.
    db.execute(delete(RepairVerification).where(RepairVerification.report_id.in_(report_ids)))
    db.execute(delete(Evidence).where(Evidence.report_id.in_(report_ids)))
    # Reports point to their approved draft: clear that before deleting drafts.
    db.execute(
        update(Report)
        .where(Report.id.in_(report_ids))
        .values(approved_draft_id=None, approved_at=None, approved_by_user_id=None)
    )
    db.execute(delete(ComplaintDraft).where(ComplaintDraft.report_id.in_(report_ids)))
    db.execute(delete(AgentRun).where(AgentRun.report_id.in_(report_ids)))
    db.execute(delete(ReportEvent).where(ReportEvent.report_id.in_(report_ids)))
    db.execute(delete(Report).where(Report.id.in_(report_ids)))
    db.commit()

    # Files last: if one can't be deleted, it is only an unused file,
    # never a row whose file is missing.
    for key in storage_keys:
        try:
            storage.delete(key)
        except StorageError:
            logger.warning("Could not delete demo file %s.", key, exc_info=True)
    return len(report_ids)


# --- reports ----------------------------------------------------------------------


def new_report(db: Session, owner: User, offset: tuple[float, float], **fields) -> Report:
    """Like POST /reports. offset moves the report a little away from CENTRE."""
    report = Report(
        user_id=owner.id,
        latitude=CENTRE[0] + offset[0],
        longitude=CENTRE[1] + offset[1],
        **fields,
    )
    db.add(report)
    db.flush()
    record_event(db, report, "report_created", "Report created.", actor=owner)
    db.commit()
    return report


def analyse_and_approve(db: Session, report: Report, owner: User) -> None:
    """Like POST /analyze followed by POST /approve of the AI draft."""
    _, draft = run_analysis(db, report, owner, fake_analyze)
    # run_analysis committed, so reading owner.id reloads it from the database,
    # and that query would first save a half-set approval (the CHECK constraint
    # wants all three columns together). So read the IDs before setting any.
    draft_id, owner_id = draft.id, owner.id
    report.approved_draft_id = draft_id
    report.approved_at = datetime.now(timezone.utc)
    report.approved_by_user_id = owner_id
    record_event(
        db, report, "draft_approved", "Citizen approved the draft.", owner,
        {"draft_id": str(draft.id), "version": draft.version},
    )
    db.commit()


def move(db: Session, report: Report, status: str, user: User, note: str | None = None) -> None:
    """Like POST /reports/{id}/status."""
    change_status(db, report, status, user, note)
    db.commit()


def create_reports(db: Session, storage: Storage, users: dict[str, User]) -> dict[str, Report]:
    citizen, official = users["citizen"], users["official"]

    def photo(report: Report, label: str, description: str) -> None:
        add_report_photo(
            db, report, citizen, storage, demo_photo(label, "darkred"),
            f"{label.lower().replace(' ', '-')}.jpg", description,
        )

    def repair_photo(report: Report, label: str) -> None:
        add_repair_photo(
            db, report, official, storage, demo_photo(label, "darkgreen"),
            "after-repair.jpg", "After the repair.",
        )

    reports = {}

    # 1. Just reported: photo, AI draft, approved by the citizen.
    report = new_report(
        db, citizen, (0.0010, 0.0005), category="garbage",
        title="Overflowing garbage bin near the market",
        description="The public bin next to the vegetable market has not been emptied "
        "for a week. Rubbish is spilling onto the footpath and attracting stray dogs.",
        location_text="Next to the vegetable market",
    )
    photo(report, "Overflowing bin", "Bin overflowing onto the footpath.")
    analyse_and_approve(db, report, citizen)
    reports["reported"] = report

    # 2. An official has started reviewing it.
    report = new_report(
        db, citizen, (-0.0010, 0.0010), category="streetlight",
        title="Streetlight out on the inner road",
        description="The streetlight outside house 42 on the inner road has been off for "
        "three nights. The stretch is completely dark after 7 pm.",
        location_text="Inner road, outside house 42",
    )
    analyse_and_approve(db, report, citizen)
    move(db, report, "under_review", official, "Site inspection scheduled.")
    reports["under_review"] = report

    # 3. Repair work started; the official has uploaded a repair photo but not
    #    claimed the repair yet. In the demo, the official can claim it.
    report = new_report(
        db, citizen, (0.0005, -0.0012), category="road_damage",
        title="Deep pothole at the roundabout",
        description="A deep pothole has formed on the left lane at the roundabout. "
        "Two-wheelers swerve suddenly to avoid it.",
        location_text="Main roundabout, left lane",
    )
    photo(report, "Pothole", "Pothole on the left lane, about 50 cm wide.")
    analyse_and_approve(db, report, citizen)
    move(db, report, "under_review", official)
    move(db, report, "in_progress", official, "Repair crew assigned.")
    repair_photo(report, "Pothole filled")
    reports["in_progress"] = report

    # 4. Repair claimed: the owner and the near neighbour can vote on it.
    report = new_report(
        db, citizen, (-0.0005, -0.0005), category="road_damage",
        title="Broken footpath tiles outside the school",
        description="Several footpath tiles outside the primary school gate are broken "
        "and loose. Children trip on them every morning.",
        location_text="Primary school gate",
    )
    photo(report, "Broken tiles", "Loose and broken tiles at the school gate.")
    analyse_and_approve(db, report, citizen)
    move(db, report, "under_review", official)
    move(db, report, "in_progress", official)
    repair_photo(report, "New tiles laid")
    move(db, report, "awaiting_verification", official, "Tiles replaced.")
    reports["awaiting_verification"] = report

    # 5. Resolved by votes: the owner and the near neighbour confirmed the repair.
    report = new_report(
        db, citizen, (0.0015, -0.0003), category="garbage",
        title="Garbage dumped on the empty plot",
        description="People have been dumping household garbage on the empty plot behind "
        "the community centre. It smells and is spreading onto the road.",
        location_text="Behind the community centre",
    )
    photo(report, "Dumped garbage", "Garbage heap on the empty plot.")
    analyse_and_approve(db, report, citizen)
    move(db, report, "under_review", official)
    move(db, report, "in_progress", official)
    repair_photo(report, "Plot cleared")
    move(db, report, "awaiting_verification", official, "Plot cleared and fenced.")
    cast_vote(db, report, citizen, "fixed")
    cast_vote(db, report, users["near"], "fixed")
    reports["resolved"] = report

    # 6. Withdrawn by the owner: it was a duplicate.
    report = new_report(
        db, citizen, (0.0011, 0.0006), category="garbage",
        title="Bin near the market is full",
        description="The bin near the market is full again.",
        location_text="Next to the vegetable market",
    )
    move(db, report, "closed", citizen, "Reported twice by mistake.")
    reports["closed"] = report

    return reports


# --- entry point ------------------------------------------------------------------


def seed_demo(
    db: Session, storage: Storage, password: str, reset: bool = False
) -> dict[str, Report]:
    """Create the demo accounts and reports. Returns the reports by status."""
    if not MIN_LENGTH <= len(password) <= MAX_LENGTH:
        raise ValueError(f"The password must be {MIN_LENGTH} to {MAX_LENGTH} characters long.")
    if demo_users(db) and not reset:
        raise DemoDataExists(
            "The demo accounts already exist. Run with --reset to recreate their reports."
        )
    if reset:
        reset_demo_data(db, storage)
    users = create_accounts(db, password)
    return create_reports(db, storage, users)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create demo accounts and reports.")
    parser.add_argument(
        "--reset", action="store_true",
        help="delete the demo accounts' reports and photos, then create them again",
    )
    args = parser.parse_args()

    password = getpass.getpass("Password for all demo accounts: ")
    if getpass.getpass("Repeat it: ") != password:
        sys.exit("The passwords do not match. Nothing was changed.")
    try:
        storage = get_storage()
        with Session(engine) as session:
            reports = seed_demo(session, storage, password, reset=args.reset)
    except (ValueError, DemoDataExists) as exc:
        sys.exit(str(exc))
    except ApiError as exc:  # e.g. storage not configured or unreachable
        sys.exit(f"{exc.message} Some demo data may exist now: run again with --reset.")

    print("Demo accounts (all with the password you entered):")
    for account in DEMO_ACCOUNTS.values():
        print(f"  {account['email']:34} {account['role']}")
    print("Demo reports, owned by demo-citizen:")
    for status, report in reports.items():
        print(f"  {status:22} {report.title}")
    print("Try: demo-official claims the pothole repair; demo-neighbour-near votes on "
          "the footpath tiles.")


if __name__ == "__main__":
    main()
