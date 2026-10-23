import pytest

from app.storage import StorageError
from scripts.check_storage import check_storage


def test_check_passes_and_leaves_no_file(storage):
    check_storage(storage)

    assert storage.files == {}


def test_check_fails_when_storage_fails(storage):
    storage.fail = True

    with pytest.raises(StorageError):
        check_storage(storage)


def test_check_fails_when_file_comes_back_different(storage):
    storage.load = lambda key: b"something else"

    with pytest.raises(StorageError, match="different"):
        check_storage(storage)
    assert storage.files == {}  # still cleaned up
