import json

import httpx
import pytest

from app.errors import ApiError
from app.storage import LocalStorage, StorageError, SupabaseStorage, get_storage

# --- LocalStorage ---------------------------------------------------------------


def test_local_save_then_load(tmp_path):
    storage = LocalStorage(tmp_path)
    storage.save("reports/r1/photo.jpg", b"image bytes", "image/jpeg")

    assert storage.load("reports/r1/photo.jpg") == b"image bytes"
    assert (tmp_path / "reports" / "r1" / "photo.jpg").exists()


def test_local_save_never_overwrites(tmp_path):
    storage = LocalStorage(tmp_path)
    storage.save("photo.jpg", b"first", "image/jpeg")

    with pytest.raises(StorageError):
        storage.save("photo.jpg", b"second", "image/jpeg")
    assert storage.load("photo.jpg") == b"first"


def test_local_load_missing_file(tmp_path):
    with pytest.raises(StorageError):
        LocalStorage(tmp_path).load("missing.jpg")


def test_local_delete(tmp_path):
    storage = LocalStorage(tmp_path)
    storage.save("photo.jpg", b"data", "image/jpeg")

    storage.delete("photo.jpg")
    storage.delete("photo.jpg")  # deleting a missing file is not an error

    assert not (tmp_path / "photo.jpg").exists()


@pytest.mark.parametrize("key", ["../outside.jpg", "reports/../../outside.jpg", ""])
def test_local_rejects_keys_outside_the_folder(tmp_path, key):
    storage = LocalStorage(tmp_path / "uploads")

    with pytest.raises(StorageError, match="Invalid storage key"):
        storage.save(key, b"data", "image/jpeg")
    assert not (tmp_path / "outside.jpg").exists()


# --- SupabaseStorage ------------------------------------------------------------
# httpx.MockTransport answers requests with a function instead of the network,
# so these tests check exactly what would be sent to Supabase.


def supabase(handler) -> SupabaseStorage:
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return SupabaseStorage("https://demo.supabase.co/", "test-secret", "evidence", client)


def test_supabase_save_sends_file_to_bucket():
    sent = []

    def handler(request):
        sent.append(request)
        return httpx.Response(200, json={"Key": "evidence/reports/r1/photo.jpg"})

    supabase(handler).save("reports/r1/photo.jpg", b"image bytes", "image/jpeg")

    request = sent[0]
    assert request.method == "POST"
    assert str(request.url) == "https://demo.supabase.co/storage/v1/object/evidence/reports/r1/photo.jpg"
    assert request.content == b"image bytes"
    assert request.headers["Content-Type"] == "image/jpeg"
    assert request.headers["x-upsert"] == "false"
    assert request.headers["apikey"] == "test-secret"
    assert request.headers["Authorization"] == "Bearer test-secret"


def test_supabase_load_returns_file_bytes():
    def handler(request):
        assert request.method == "GET"
        assert request.url.path == "/storage/v1/object/authenticated/evidence/reports/r1/photo.jpg"
        return httpx.Response(200, content=b"image bytes")

    assert supabase(handler).load("reports/r1/photo.jpg") == b"image bytes"


def test_supabase_delete_sends_key_as_prefix():
    sent = []

    def handler(request):
        sent.append(request)
        return httpx.Response(200, json=[])

    supabase(handler).delete("reports/r1/photo.jpg")

    assert sent[0].method == "DELETE"
    assert sent[0].url.path == "/storage/v1/object/evidence"
    assert json.loads(sent[0].content) == {"prefixes": ["reports/r1/photo.jpg"]}


@pytest.mark.parametrize("status", [400, 401, 404, 500])
def test_supabase_error_reply_becomes_storage_error(status):
    def handler(request):
        return httpx.Response(status, json={"message": "something went wrong"})

    with pytest.raises(StorageError, match=str(status)):
        supabase(handler).save("photo.jpg", b"data", "image/jpeg")


def test_supabase_connection_failure_becomes_storage_error():
    def handler(request):
        raise httpx.ConnectError("no internet")

    with pytest.raises(StorageError):
        supabase(handler).load("photo.jpg")


def test_supabase_error_never_includes_the_secret_key():
    def handler(request):
        return httpx.Response(401, json={"message": "bad key test-secret"})

    with pytest.raises(StorageError) as caught:
        supabase(handler).load("photo.jpg")
    assert "test-secret" not in str(caught.value)


# --- get_storage ----------------------------------------------------------------


def test_default_provider_is_local(monkeypatch):
    monkeypatch.delenv("STORAGE_PROVIDER")

    assert isinstance(get_storage(), LocalStorage)


def test_supabase_provider(monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")
    monkeypatch.setenv("SUPABASE_BUCKET", "photos")

    storage = get_storage()

    assert isinstance(storage, SupabaseStorage)
    assert storage.bucket == "photos"


@pytest.mark.parametrize("missing", ["SUPABASE_URL", "SUPABASE_SECRET_KEY"])
def test_supabase_without_settings_is_unavailable(monkeypatch, missing):
    monkeypatch.setenv("STORAGE_PROVIDER", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")
    monkeypatch.setenv(missing, "")

    with pytest.raises(ApiError) as caught:
        get_storage()
    assert caught.value.status_code == 503
    assert caught.value.code == "STORAGE_UNAVAILABLE"


def test_unknown_provider_is_unavailable(monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "dropbox")

    with pytest.raises(ApiError, match="not configured"):
        get_storage()
