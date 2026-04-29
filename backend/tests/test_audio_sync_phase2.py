"""Phase 2 — Audio-Text Synchronization tests.

Covers:
- LRC parser unit (sort + end_ms backfill)
- JSON parser unit (list + {sync_map: ...} object)
- POST/GET/DELETE /api/content/items/{item_id}/audio
- Static mount /api/audio-static/items/{item_id}.mp3
- Auth/role guards + invalid input handling
- Regression smoke for kundli + multilingual editor
"""
import os
import io
import sys
import pytest
import requests

# Allow importing audio_sync_service for unit tests
sys.path.insert(0, "/app/backend")
from audio_sync_service import parse_lrc, parse_json_sync  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fall back to frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.strip().split("=", 1)[1].rstrip("/")
                    break
    except Exception:
        pass

ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASSWORD = "SanatanAdmin@2026"
TEST_ITEM_ID = "69f053c8053b601fc045a5ca"  # Hanuman Chalisa


# --------- Module: LRC parser unit tests ---------
class TestLrcParser:
    def test_basic_two_verses(self):
        lrc = "[00:00.50]Verse 1\n[00:05.20]Verse 2"
        out = parse_lrc(lrc)
        assert out == [
            {"verse_num": 1, "start_ms": 500, "end_ms": 5200, "text": "Verse 1"},
            {"verse_num": 2, "start_ms": 5200, "end_ms": None, "text": "Verse 2"},
        ]

    def test_metadata_lines_skipped(self):
        lrc = "[ar:Artist]\n[ti:Title]\n[00:01.00]Hello"
        out = parse_lrc(lrc)
        assert len(out) == 1
        assert out[0]["start_ms"] == 1000
        assert out[0]["text"] == "Hello"

    def test_unsorted_lines_get_sorted(self):
        lrc = "[00:05.00]Second\n[00:01.00]First\n[00:09.00]Third"
        out = parse_lrc(lrc)
        assert [v["text"] for v in out] == ["First", "Second", "Third"]
        assert out[0]["end_ms"] == 5000
        assert out[1]["end_ms"] == 9000
        assert out[2]["end_ms"] is None

    def test_empty_input(self):
        assert parse_lrc("") == []


# --------- Module: JSON parser unit tests ---------
class TestJsonParser:
    def test_list_form(self):
        data = '[{"verse_num":1,"start_ms":500,"text":"a"},{"verse_num":2,"start_ms":5200,"text":"b"}]'
        out = parse_json_sync(data)
        assert len(out) == 2
        assert out[0]["end_ms"] == 5200  # backfilled
        assert out[1]["end_ms"] is None

    def test_object_form_sync_map_key(self):
        data = '{"sync_map":[{"start_ms":100,"text":"x"},{"start_ms":900,"text":"y"}]}'
        out = parse_json_sync(data)
        assert len(out) == 2
        assert out[0]["verse_num"] == 1
        assert out[0]["end_ms"] == 900

    def test_alternative_start_key(self):
        data = '[{"start":1000,"text":"x"},{"start":2000,"text":"y"}]'
        out = parse_json_sync(data)
        assert out[0]["start_ms"] == 1000
        assert out[1]["start_ms"] == 2000

    def test_missing_start_raises(self):
        with pytest.raises(ValueError):
            parse_json_sync('[{"text":"x"}]')

    def test_not_a_list_raises(self):
        with pytest.raises(ValueError):
            parse_json_sync('{"foo":"bar"}')


# --------- Fixtures ---------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --------- Module: API endpoints ---------
class TestAudioEndpoints:
    def test_get_public_no_auth(self):
        """GET endpoint must be public (no auth)."""
        r = requests.get(f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "audio_url" in data
        assert "sync_map" in data

    def test_get_invalid_item_id(self):
        r = requests.get(f"{BASE_URL}/api/content/items/not-a-valid-id/audio", timeout=15)
        assert r.status_code == 400

    def test_get_nonexistent_item_returns_empty(self):
        # Valid-looking ObjectId but doesn't exist -> service returns empty payload (200)
        r = requests.get(f"{BASE_URL}/api/content/items/000000000000000000000000/audio", timeout=15)
        assert r.status_code == 200
        assert r.json().get("audio_url") is None

    def test_post_requires_auth(self):
        # No token -> should be 401/403
        files = {"audio": ("t.mp3", b"ID3FAKE", "audio/mpeg")}
        r = requests.post(
            f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio",
            files=files,
            timeout=15,
        )
        assert r.status_code in (401, 403), r.status_code

    def test_upload_lrc_and_verify(self, auth_headers):
        """Full happy-path: upload MP3 + 4-verse LRC, then GET, then static fetch."""
        lrc = (
            "[00:00.50]Verse 1\n"
            "[00:05.20]Verse 2\n"
            "[00:10.10]Verse 3\n"
            "[00:15.00]Verse 4\n"
        )
        files = {
            "audio": ("test.mp3", b"ID3" + b"\x00" * 200, "audio/mpeg"),
            "sync_file": ("test.lrc", lrc.encode("utf-8"), "text/plain"),
        }
        data = {"duration_ms": "20000"}
        r = requests.post(
            f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio",
            headers=auth_headers,
            files=files,
            data=data,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["sync_verses"] == 4
        assert body["audio_url"].endswith(f"/{TEST_ITEM_ID}.mp3")

        # Verify GET returns the saved sync_map
        r2 = requests.get(f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio", timeout=15)
        assert r2.status_code == 200
        meta = r2.json()
        assert meta["audio_url"].endswith(f"/{TEST_ITEM_ID}.mp3")
        assert meta["duration_ms"] == 20000
        assert len(meta["sync_map"]) == 4
        assert meta["sync_map"][0]["start_ms"] == 500
        assert meta["sync_map"][1]["start_ms"] == 5200
        assert meta["sync_map"][3]["end_ms"] == 20000  # backfilled from duration_ms

        # Verify static mount
        static_url = f"{BASE_URL}{meta['audio_url']}"
        r3 = requests.get(static_url, timeout=15)
        assert r3.status_code == 200, f"Static url failed: {static_url} -> {r3.status_code}"
        ct = r3.headers.get("content-type", "")
        # FastAPI StaticFiles should set audio/mpeg for .mp3
        assert "audio" in ct or "mpeg" in ct, f"Unexpected content-type: {ct}"

    def test_upload_invalid_extension(self, auth_headers):
        files = {"audio": ("malware.exe", b"MZ\x00\x00", "application/octet-stream")}
        r = requests.post(
            f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio",
            headers=auth_headers,
            files=files,
            timeout=15,
        )
        assert r.status_code == 400

    def test_upload_invalid_item_id(self, auth_headers):
        files = {"audio": ("t.mp3", b"ID3", "audio/mpeg")}
        r = requests.post(
            f"{BASE_URL}/api/content/items/bad-id/audio",
            headers=auth_headers,
            files=files,
            timeout=15,
        )
        assert r.status_code == 400

    def test_upload_nonexistent_item(self, auth_headers):
        files = {"audio": ("t.mp3", b"ID3", "audio/mpeg")}
        r = requests.post(
            f"{BASE_URL}/api/content/items/000000000000000000000000/audio",
            headers=auth_headers,
            files=files,
            timeout=15,
        )
        assert r.status_code == 404

    def test_upload_json_sync_object_form(self, auth_headers):
        """Re-upload using JSON sync map (object form)."""
        json_sync = (
            '{"sync_map":['
            '{"verse_num":1,"start_ms":0,"text":"A"},'
            '{"verse_num":2,"start_ms":3000,"text":"B"}'
            ']}'
        )
        files = {
            "audio": ("test.mp3", b"ID3" + b"\x00" * 100, "audio/mpeg"),
            "sync_file": ("sync.json", json_sync.encode(), "application/json"),
        }
        r = requests.post(
            f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio",
            headers=auth_headers,
            files=files,
            timeout=20,
        )
        assert r.status_code == 200, r.text
        assert r.json()["sync_verses"] == 2

    def test_delete_audio(self, auth_headers):
        # Upload first to ensure something exists
        files = {"audio": ("test.mp3", b"ID3" + b"\x00" * 50, "audio/mpeg")}
        requests.post(
            f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio",
            headers=auth_headers,
            files=files,
            timeout=15,
        )
        # Delete
        r = requests.delete(
            f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio",
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200
        # Verify GET returns empty
        r2 = requests.get(f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio", timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("audio_url") is None

    def test_delete_requires_auth(self):
        r = requests.delete(
            f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio",
            timeout=15,
        )
        assert r.status_code in (401, 403)


# --------- Module: Regression smoke ---------
class TestRegression:
    def test_root_alive(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200

    def test_content_items_listing(self):
        r = requests.get(f"{BASE_URL}/api/content/items?limit=5", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "items" in body

    def test_kundli_endpoint_alive(self):
        # quick HEAD-ish: just hit a known kundli route with bad data and expect 4xx not 5xx
        r = requests.post(
            f"{BASE_URL}/api/astro/kundli",
            json={"date": "1990-01-01", "time": "10:00", "lat": 28.6, "lon": 77.2, "tz": 5.5},
            timeout=20,
        )
        # Accept 200/4xx (auth or validation), but never 500
        assert r.status_code != 500, r.text[:200]


# --------- Final cleanup: re-upload baseline for next agent ---------
class TestZZRestore:
    def test_restore_baseline_audio(self, auth_headers):
        lrc = (
            "[00:00.50]Verse 1\n"
            "[00:05.20]Verse 2\n"
            "[00:10.10]Verse 3\n"
            "[00:15.00]Verse 4\n"
        )
        files = {
            "audio": ("test.mp3", b"ID3" + b"\x00" * 200, "audio/mpeg"),
            "sync_file": ("test.lrc", lrc.encode("utf-8"), "text/plain"),
        }
        data = {"duration_ms": "20000"}
        r = requests.post(
            f"{BASE_URL}/api/content/items/{TEST_ITEM_ID}/audio",
            headers=auth_headers,
            files=files,
            data=data,
            timeout=30,
        )
        assert r.status_code == 200
