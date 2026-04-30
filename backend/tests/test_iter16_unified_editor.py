"""Iteration 16 — Unified Bhakti Editor backend tests.

Covers:
- Audio primary upload (with/without sync_file)
- Audio variant upload (slot 1..4) + delete variant
- Nested JSON sync with verses->lines[]
- Publish-check + 422 on insufficient publish
- Import wizard publish returns item_ids[]
- Backward-compat LRC + flat-list JSON parsing of sync file
"""
import json
import io
import os
import struct
import time
import requests
import pytest

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Read from frontend/.env when pytest runs without env vars
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
HANUMAN_ID = "69f053c8053b601fc045a5ca"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    data = r.json()
    token = data.get("access_token") or data.get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    s.headers.update({"Accept": "application/json"})
    return s


def _fake_mp3_bytes(size_kb: int = 4) -> bytes:
    # Minimal valid MP3 frame header (0xFF 0xFB) + padding. Server only checks ext.
    return b"\xff\xfb\x90\x00" + b"\x00" * (size_kb * 1024 - 4)


# ---------- existing item sanity ----------
def test_get_hanuman_item(session):
    r = session.get(f"{BASE_URL}/api/content/items/{HANUMAN_ID}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("_id") == HANUMAN_ID or data.get("id") == HANUMAN_ID


# ---------- publish-check ----------
def test_publish_check_returns_checks_array(session):
    r = session.get(f"{BASE_URL}/api/content/items/{HANUMAN_ID}/publish-check")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "can_publish" in body and isinstance(body["can_publish"], bool)
    keys = {c["key"] for c in body["checks"]}
    for required in ("title", "primary_language", "verses"):
        assert required in keys
    for optional in ("deity", "audio", "sync_map"):
        assert optional in keys


# ---------- publish 422 on empty fresh item ----------
def test_publish_fresh_item_422(session):
    # Create a bare item with no verses, no title, no supported_languages
    payload = {
        "category": "test_iter16",
        "slug": f"TEST_iter16_{int(time.time())}",
        "title_hi": "", "title_en": "", "title_sa": "",
    }
    r = session.post(f"{BASE_URL}/api/content/items", json=payload)
    assert r.status_code in (200, 201), r.text
    new_id = (r.json().get("_id") or r.json().get("id"))
    assert new_id

    # Attempt publish — must 422
    rp = session.patch(
        f"{BASE_URL}/api/content/items/{new_id}/status",
        json={"status": "published"},
    )
    assert rp.status_code == 422, f"Expected 422, got {rp.status_code}: {rp.text}"
    assert "missing" in rp.text.lower()
    # Cleanup
    session.delete(f"{BASE_URL}/api/content/items/{new_id}")


# ---------- primary audio upload (no sync) ----------
def test_audio_upload_primary_no_sync(session):
    files = {"audio": ("test_primary.mp3", _fake_mp3_bytes(8), "audio/mpeg")}
    data = {"duration_ms": 12000}
    r = session.post(
        f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio",
        files=files, data=data,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("audio_url", "").endswith(".mp3")
    assert "variants" in body  # array (may be empty or pre-existing)
    assert isinstance(body["variants"], list)


# ---------- primary audio upload + LRC sync (backward compat) ----------
def test_audio_upload_primary_with_lrc(session):
    lrc = b"[00:00.50]Verse 1 text\n[00:05.20]Verse 2 text\n[00:10.00]Verse 3 text\n"
    files = {
        "audio": ("test_with_lrc.mp3", _fake_mp3_bytes(6), "audio/mpeg"),
        "sync_file": ("sync.lrc", lrc, "text/plain"),
    }
    r = session.post(
        f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio",
        files=files, data={"duration_ms": 12000},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sync_verses"] == 3
    # GET to verify persisted
    g = session.get(f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio")
    assert g.status_code == 200
    sm = g.json().get("sync_map", [])
    assert len(sm) == 3
    assert sm[0]["start_ms"] == 500


# ---------- primary audio upload + flat JSON list (backward compat) ----------
def test_audio_upload_primary_with_flat_json(session):
    flat = [
        {"verse_num": 1, "start_ms": 0, "end_ms": 3000, "text": "v1"},
        {"verse_num": 2, "start_ms": 3000, "end_ms": 6000, "text": "v2"},
    ]
    files = {
        "audio": ("test_flat.mp3", _fake_mp3_bytes(4), "audio/mpeg"),
        "sync_file": ("sync.json", json.dumps(flat).encode(), "application/json"),
    }
    r = session.post(
        f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio",
        files=files, data={"duration_ms": 6000},
    )
    assert r.status_code == 200, r.text
    assert r.json()["sync_verses"] == 2


# ---------- audio variant upload ----------
def test_audio_variant_upload_slot1(session):
    files = {"audio": ("variant1.mp3", _fake_mp3_bytes(5), "audio/mpeg")}
    data = {"variant_slot": 1, "variant_label": "Male", "duration_ms": 60000}
    r = session.post(
        f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio",
        files=files, data=data,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "variants" in body
    variants = body["variants"]
    assert isinstance(variants, list) and len(variants) >= 1
    slot1 = next((v for v in variants if v["slot"] == 1), None)
    assert slot1 is not None
    assert slot1["label"] == "Male"
    assert slot1["url"].endswith(".mp3")


def test_audio_variant_upload_slot2(session):
    files = {"audio": ("variant2.mp3", _fake_mp3_bytes(5), "audio/mpeg")}
    data = {"variant_slot": 2, "variant_label": "Female"}
    r = session.post(
        f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio",
        files=files, data=data,
    )
    assert r.status_code == 200
    variants = r.json()["variants"]
    slots = {v["slot"] for v in variants}
    assert 1 in slots and 2 in slots  # slot 1 from previous test still present


def test_audio_variant_invalid_slot(session):
    files = {"audio": ("bad.mp3", _fake_mp3_bytes(2), "audio/mpeg")}
    data = {"variant_slot": 9, "variant_label": "Bad"}
    r = session.post(
        f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio",
        files=files, data=data,
    )
    assert r.status_code == 400


def test_audio_variant_delete(session):
    r = session.delete(f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio/variants/1")
    assert r.status_code == 200, r.text
    body = r.json()
    kept_slots = {v["slot"] for v in body.get("variants", [])}
    assert 1 not in kept_slots
    # slot 2 (from previous test) should still exist
    assert 2 in kept_slots


# ---------- nested JSON sync ----------
def test_audio_sync_nested(session):
    body = {
        "audio_file": "/api/audio-static/items/x.mp3",
        "duration_ms": 30000,
        "verses": [
            {"verse_id": 1, "start_ms": 0, "end_ms": 10000,
             "lines": [
                 {"text": "line a", "start_ms": 0, "end_ms": 5000},
                 {"text": "line b", "start_ms": 5000, "end_ms": 10000},
             ]},
            {"verse_id": 2, "start_ms": 10000, "end_ms": 20000,
             "lines": [
                 {"text": "line c", "start_ms": 10000, "end_ms": 15000},
                 {"text": "line d", "start_ms": 15000, "end_ms": 20000},
             ]},
        ],
    }
    r = session.post(
        f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio/sync",
        json=body,
    )
    assert r.status_code == 200, r.text
    assert r.json()["sync_verses"] == 2

    # Verify persisted with lines
    g = session.get(f"{BASE_URL}/api/content/items/{HANUMAN_ID}/audio")
    assert g.status_code == 200
    sm = g.json()["sync_map"]
    assert len(sm) == 2
    assert sm[0].get("lines") and len(sm[0]["lines"]) == 2
    assert sm[0]["lines"][0]["text"] == "line a"
    assert g.json()["duration_ms"] == 30000


# ---------- import wizard publish returns item_ids[] ----------
def test_import_wizard_publish_returns_item_ids(session, tmp_path):
    # Step 1: upload a tiny JSON file
    payload = [{
        "title": f"TEST_iter16_import_{int(time.time())}",
        "deity": "Test",
        "verses": [{
            "verse_num": 1, "verse_type": "shloka",
            "sanskrit_text": "ॐ", "transliteration": "om", "meaning": "sacred"
        }]
    }]
    fpath = tmp_path / "test_import.json"
    fpath.write_text(json.dumps(payload), encoding="utf-8")

    files = {"file": ("test_import.json", fpath.read_bytes(), "application/json")}
    data = {"category": "chalisa", "language": "hi"}
    r = session.post(
        f"{BASE_URL}/api/admin/import-wizard",
        files=files, data=data,
    )
    assert r.status_code == 200, r.text
    upload_id = r.json()["upload_id"]
    assert r.json()["items_count"] == 1

    # Step 2: publish
    rp = session.post(f"{BASE_URL}/api/admin/import-wizard/publish/{upload_id}")
    assert rp.status_code == 200, rp.text
    body = rp.json()
    assert "item_ids" in body
    assert isinstance(body["item_ids"], list)
    assert len(body["item_ids"]) == 1
    new_id = body["item_ids"][0]

    # Verify item exists
    g = session.get(f"{BASE_URL}/api/content/items/{new_id}")
    assert g.status_code == 200

    # Cleanup
    session.delete(f"{BASE_URL}/api/content/items/{new_id}")
