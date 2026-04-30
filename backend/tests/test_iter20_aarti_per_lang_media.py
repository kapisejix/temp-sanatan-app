"""Iteration 20 — Aarti per-language media endpoints.

Validates the new aarti-only endpoints under /api/content/items/{id}/lang/{lang}/...
- audio (POST/DELETE) with 1..4 slot enforcement
- video (POST/DELETE) with mp4/webm acceptance and ext rejection
- thumbnail (POST) with image-only acceptance
- sync (POST) with strict nested overlap rejection
- media bundle (GET, public)
- aarti rejection on non-aarti items
- unsupported language rejection
- publish-check aarti vs non-aarti (regression)
- mobile preferred_language settings

Test items (already seeded):
  AARTI_ID   = 69f1e1a77488457efddb02b7  (bhakti_items, supported_languages=['hi','mr'])
  CHALISA_ID = 69f053c8053b601fc045a5ca  (content_items)
"""
import io
import os
import time
import requests
import pytest


def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_base_url()
ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASS = "SanatanAdmin@2026"
AARTI_ID = "69f1e1a77488457efddb02b7"
CHALISA_ID = "69f053c8053b601fc045a5ca"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    token = r.json().get("access_token") or r.json().get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _fake_mp3_bytes(size_kb: int = 4) -> bytes:
    return b"\xff\xfb\x90\x00" + b"\x00" * (size_kb * 1024 - 4)


def _fake_mp4_bytes(size_kb: int = 8) -> bytes:
    # Minimal ftyp box header pattern, the backend doesn't parse content
    return b"\x00\x00\x00\x18ftypmp42" + b"\x00" * (size_kb * 1024 - 16)


def _tiny_png_bytes() -> bytes:
    # 1x1 transparent PNG
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
        b"\xc0\x00\x00\x00\x03\x00\x01\x9a\xb1\x9c\xa3\x00\x00\x00\x00IEND\xaeB`\x82"
    )


# ------------------------------------------------------------------
# AUDIO endpoints
# ------------------------------------------------------------------
class TestAartiAudio:
    def test_clean_existing_versions(self, session):
        # Best-effort cleanup of prior leftover slots so we have a known baseline
        for slot in (1, 2, 3, 4):
            session.delete(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/audio/{slot}")
        r = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/media")
        assert r.status_code == 200
        assert r.json()["audio_versions"] == []

    def test_upload_audio_appends_slot1(self, session):
        files = {"audio": ("v1.mp3", _fake_mp3_bytes(), "audio/mpeg")}
        data = {"label": "Slow"}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/audio",
            files=files, data=data,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["lang"] == "hi"
        assert len(body["audio_versions"]) == 1
        v = body["audio_versions"][0]
        assert v["slot"] == 1
        assert v["label"] == "Slow"
        assert v["url"].startswith(f"/api/aarti-static/{AARTI_ID}/hi/audio/v1.")

    def test_upload_3_more_then_max4(self, session):
        for label in ("Normal", "Music", "Custom"):
            files = {"audio": ("a.mp3", _fake_mp3_bytes(), "audio/mpeg")}
            r = session.post(
                f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/audio",
                files=files, data={"label": label},
            )
            assert r.status_code == 200, r.text
        # 5th must be rejected
        files = {"audio": ("a.mp3", _fake_mp3_bytes(), "audio/mpeg")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/audio",
            files=files, data={"label": "Extra"},
        )
        assert r.status_code == 400, r.text
        assert "max 4" in r.text.lower() or "Max 4" in r.text

    def test_replace_existing_slot(self, session):
        files = {"audio": ("a.mp3", _fake_mp3_bytes(), "audio/mpeg")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/audio",
            files=files, data={"label": "Replaced", "slot": "2"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        # still 4 versions
        assert len(body["audio_versions"]) == 4
        slot2 = next(v for v in body["audio_versions"] if v["slot"] == 2)
        assert slot2["label"] == "Replaced"

    def test_delete_slot(self, session):
        r = session.delete(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/audio/3")
        assert r.status_code == 200, r.text
        assert all(v["slot"] != 3 for v in r.json()["audio_versions"])

    def test_audio_invalid_extension(self, session):
        files = {"audio": ("a.exe", b"MZ\x00\x00", "application/octet-stream")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/audio",
            files=files,
        )
        assert r.status_code == 400


# ------------------------------------------------------------------
# VIDEO endpoints
# ------------------------------------------------------------------
class TestAartiVideo:
    def test_upload_video_mp4(self, session):
        files = {"video": ("clip.mp4", _fake_mp4_bytes(), "video/mp4")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/video",
            files=files,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["video"]["format"] == "mp4"
        assert body["video"]["url"].endswith(".mp4")

    def test_upload_video_webm_replaces_extension(self, session):
        files = {"video": ("clip.webm", _fake_mp4_bytes(), "video/webm")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/video",
            files=files,
        )
        assert r.status_code == 200, r.text
        assert r.json()["video"]["format"] == "webm"

    def test_upload_video_invalid_extension(self, session):
        files = {"video": ("clip.txt", b"hello", "text/plain")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/video",
            files=files,
        )
        assert r.status_code == 400

    def test_delete_video(self, session):
        r = session.delete(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/video")
        assert r.status_code == 200, r.text
        # Verify it's gone via media bundle
        r2 = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/media")
        assert r2.status_code == 200
        assert not r2.json().get("video")


# ------------------------------------------------------------------
# THUMBNAIL endpoint
# ------------------------------------------------------------------
class TestAartiThumbnail:
    def test_upload_thumbnail_png(self, session):
        files = {"thumbnail": ("t.png", _tiny_png_bytes(), "image/png")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/thumbnail",
            files=files,
        )
        assert r.status_code == 200, r.text
        assert r.json()["thumbnail"]["format"] == "png"

    def test_upload_thumbnail_invalid_extension(self, session):
        files = {"thumbnail": ("t.gif", b"GIF89a", "image/gif")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/thumbnail",
            files=files,
        )
        assert r.status_code == 400


# ------------------------------------------------------------------
# SYNC endpoint — overlap rejection
# ------------------------------------------------------------------
class TestAartiSync:
    def test_upload_valid_nested_sync(self, session):
        body = {
            "duration_ms": 60000,
            "verses": [
                {"verse_id": 1, "verse_num": 1, "start_ms": 0, "end_ms": 5000, "lines": [{"text": "Line A", "start_ms": 0, "end_ms": 2500}, {"text": "Line B", "start_ms": 2500, "end_ms": 5000}]},
                {"verse_id": 2, "verse_num": 2, "start_ms": 5000, "end_ms": 10000, "lines": [{"text": "Line C", "start_ms": 5000, "end_ms": 10000}]},
            ],
        }
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/sync",
            json=body,
        )
        assert r.status_code == 200, r.text
        assert r.json()["sync_verses"] >= 2

    def test_upload_overlapping_sync_rejected(self, session):
        # verse 2 starts BEFORE verse 1 ends — must 400
        body = {
            "duration_ms": 60000,
            "verses": [
                {"verse_id": 1, "verse_num": 1, "start_ms": 0, "end_ms": 5000, "lines": [{"text": "A", "start_ms": 0, "end_ms": 5000}]},
                {"verse_id": 2, "verse_num": 2, "start_ms": 4000, "end_ms": 9000, "lines": [{"text": "B", "start_ms": 4000, "end_ms": 9000}]},
            ],
        }
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/sync",
            json=body,
        )
        assert r.status_code == 400, r.text
        assert "overlap" in r.text.lower()


# ------------------------------------------------------------------
# Media bundle GET (public)
# ------------------------------------------------------------------
class TestAartiMediaBundle:
    def test_get_media_bundle_public(self):
        # No auth — public endpoint
        r = requests.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/media")
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("lang", "audio_versions", "video", "thumbnail", "sync", "full_text"):
            assert k in body
        assert body["lang"] == "hi"
        assert isinstance(body["audio_versions"], list)


# ------------------------------------------------------------------
# Aarti-only enforcement: chalisa rejected, unsupported lang rejected
# ------------------------------------------------------------------
class TestAartiOnlyGuards:
    def test_chalisa_rejected_on_audio(self, session):
        files = {"audio": ("a.mp3", _fake_mp3_bytes(), "audio/mpeg")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{CHALISA_ID}/lang/hi/audio",
            files=files,
        )
        assert r.status_code == 400, r.text
        assert "aarti-only" in r.text.lower() or "aarti only" in r.text.lower()

    def test_unsupported_lang_audio(self, session):
        files = {"audio": ("a.mp3", _fake_mp3_bytes(), "audio/mpeg")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/xx/audio",
            files=files,
        )
        assert r.status_code == 400
        assert "unsupported language" in r.text.lower()

    def test_unsupported_lang_video(self, session):
        files = {"video": ("v.mp4", _fake_mp4_bytes(), "video/mp4")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/xx/video",
            files=files,
        )
        assert r.status_code == 400

    def test_unsupported_lang_thumbnail(self, session):
        files = {"thumbnail": ("t.png", _tiny_png_bytes(), "image/png")}
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/xx/thumbnail",
            files=files,
        )
        assert r.status_code == 400

    def test_unsupported_lang_sync(self, session):
        r = session.post(
            f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/xx/sync",
            json={"verses": []},
        )
        assert r.status_code == 400


# ------------------------------------------------------------------
# Publish-check — aarti new rows + chalisa regression
# ------------------------------------------------------------------
class TestPublishCheck:
    def test_aarti_publish_check_has_new_rows(self, session):
        r = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/publish-check")
        assert r.status_code == 200, r.text
        keys = {c["key"] for c in r.json()["checks"]}
        assert "aarti_media" in keys
        assert "aarti_sync" in keys
        # Old verse-based rows should NOT appear for aarti
        assert "verses" not in keys
        assert "deity" not in keys

    def test_chalisa_publish_check_no_regression(self, session):
        r = session.get(f"{BASE_URL}/api/content/items/{CHALISA_ID}/publish-check")
        assert r.status_code == 200, r.text
        keys = {c["key"] for c in r.json()["checks"]}
        # original rows preserved
        for k in ("title", "primary_language", "verses", "deity", "audio", "sync_map"):
            assert k in keys, f"missing publish-check row '{k}' for chalisa"
        # aarti rows must NOT leak in
        assert "aarti_media" not in keys
        assert "aarti_sync" not in keys

    def test_aarti_publish_blocks_when_lang_missing_media(self, session):
        # Currently 'mr' has no video and no thumbnail — verify publish-check ok=false
        r = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/publish-check")
        assert r.status_code == 200
        media_check = next(c for c in r.json()["checks"] if c["key"] == "aarti_media")
        # Either ok or detail mentions 'mr' — tolerate either since admin may have uploaded
        if not media_check["ok"]:
            assert "mr" in (media_check.get("detail") or "")
        # Try to publish -> 422
        if not media_check["ok"]:
            r2 = session.patch(
                f"{BASE_URL}/api/content/items/{AARTI_ID}/status",
                json={"status": "published"},
            )
            assert r2.status_code == 422, r2.text


# ------------------------------------------------------------------
# Mobile preferred_language settings
# ------------------------------------------------------------------
class TestMobilePreferredLanguage:
    @pytest.fixture(scope="class")
    def mobile_session(self):
        s = requests.Session()
        email = f"TEST_iter20_{int(time.time())}@example.com"
        r = s.post(f"{BASE_URL}/api/auth/mobile/signup",
                   json={"email": email, "password": "Test1234!", "name": "Iter20 Tester"})
        if r.status_code not in (200, 201):
            pytest.skip(f"mobile signup failed {r.status_code} {r.text}")
        token = r.json().get("token")
        s.headers.update({"Authorization": f"Bearer {token}"})
        return s

    def test_update_preferred_language(self, mobile_session):
        r = mobile_session.put(f"{BASE_URL}/api/auth/mobile/settings",
                               json={"preferred_language": "hi"})
        assert r.status_code == 200, r.text
        assert r.json().get("preferred_language") == "hi"

    def test_get_me_returns_preferred_language(self, mobile_session):
        r = mobile_session.get(f"{BASE_URL}/api/auth/mobile/me")
        assert r.status_code == 200, r.text
        assert r.json().get("preferred_language") == "hi"

    def test_invalid_language_rejected(self, mobile_session):
        r = mobile_session.put(f"{BASE_URL}/api/auth/mobile/settings",
                               json={"preferred_language": "xx"})
        assert r.status_code == 400


# ------------------------------------------------------------------
# Cleanup: remove all uploaded media at the very end
# ------------------------------------------------------------------
def test_zz_cleanup_aarti_media(session):
    for slot in (1, 2, 3, 4):
        session.delete(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/audio/{slot}")
    session.delete(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/video")
    # No DELETE thumbnail endpoint per spec — leave residual; non-blocking.
