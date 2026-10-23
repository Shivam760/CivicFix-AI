"""Check that photo storage works: save a tiny file, read it back, delete it.

Run from backend/:  python -m scripts.check_storage

It uses the same settings as the app (STORAGE_PROVIDER and, for supabase,
SUPABASE_URL / SUPABASE_SECRET_KEY / SUPABASE_BUCKET in backend/.env) and
never prints a key. Restart uvicorn after changing backend/.env.
"""

import os
import sys
import uuid

from app.errors import ApiError
from app.storage import Storage, StorageError, get_storage


def check_storage(storage: Storage) -> None:
    """Save, load and delete one test file. Raises StorageError on any failure."""
    key = f"storage-check/{uuid.uuid4().hex}.txt"
    data = b"CivicFix storage check"
    storage.save(key, data, "text/plain")
    try:
        if storage.load(key) != data:
            raise StorageError("The file read back is different from the one saved.")
    finally:
        # Always try to clean up, even if reading failed.
        storage.delete(key)


def main() -> None:
    provider = os.getenv("STORAGE_PROVIDER", "local")
    print(f"STORAGE_PROVIDER={provider}")
    try:
        check_storage(get_storage())
    except ApiError as exc:  # get_storage: settings missing
        sys.exit(f"FAILED: {exc.message}")
    except StorageError as exc:
        sys.exit(f"FAILED: {exc}")
    print("OK: saved, read back and deleted a test file.")


if __name__ == "__main__":
    main()
