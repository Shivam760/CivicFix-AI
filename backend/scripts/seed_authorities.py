"""Load the authority directory from a JSON file.

Run from backend/:  python -m scripts.seed_authorities [path-to-json]

Records are matched by name and region: new ones are inserted, existing ones
are updated to match the file. Authorities missing from the file are left
unchanged. The whole file is applied in one transaction, so a single invalid
record changes nothing.

Only mark a record "verified" after checking it against an official source,
and give it a last_verified_at date (the database enforces the date).
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import BACKEND_DIR, engine
from app.models import Authority

DEFAULT_PATH = BACKEND_DIR / "seed" / "authorities.json"

# Fields a record may leave out, and the value used when it does. The file is
# the source of truth: a field removed from the file is reset on the next run.
DEFAULTS = {
    "supported_categories": [],
    "contact_url": None,
    "verification_status": "unverified",
    "last_verified_at": None,
}
ALLOWED_FIELDS = {"name", "region", *DEFAULTS}


def load_records(path: Path) -> list[dict]:
    """Read the JSON file and turn last_verified_at strings into datetimes."""
    records = json.loads(path.read_text(encoding="utf-8"))
    for record in records:
        if record.get("last_verified_at"):
            record["last_verified_at"] = datetime.fromisoformat(record["last_verified_at"])
    return records


def seed_authorities(session: Session, records: list[dict]) -> tuple[int, int]:
    """Insert or update each record. Returns (created, updated)."""
    created = updated = 0
    for record in records:
        unknown = set(record) - ALLOWED_FIELDS
        if unknown:
            raise ValueError(f"Unknown fields in {record.get('name')!r}: {sorted(unknown)}")
        fields = {**DEFAULTS, **record}

        authority = session.scalar(
            select(Authority).where(
                Authority.name == fields["name"], Authority.region == fields["region"]
            )
        )
        if authority is None:
            session.add(Authority(**fields))
            created += 1
        else:
            for field in DEFAULTS:
                setattr(authority, field, fields[field])
            if session.is_modified(authority):
                updated += 1

    # Send everything now, so constraint errors surface here.
    session.flush()
    return created, updated


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH
    records = load_records(path)
    with Session(engine) as session, session.begin():
        created, updated = seed_authorities(session, records)
    print(f"Authorities from {path}: {created} created, {updated} updated.")


if __name__ == "__main__":
    main()
