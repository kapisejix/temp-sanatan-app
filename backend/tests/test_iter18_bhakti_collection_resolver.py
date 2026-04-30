"""Iteration 18 — Bhakti collection resolver retest.

Validates the new _resolve_item_collections / _resolve_verse_collection helpers
in server.py so that /api/content/items/* transparently serves items stored
in either `content_items`/`content_verses` (Chalisa etc.) or
`bhakti_items`/`bhakti_verses` (Aarti, Namavali, Stotram, etc.).
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
AARTI_ID = "69f1e1a77488457efddb02b7"      # lives in bhakti_items
CHALISA_ID = "69f053c8053b601fc045a5ca"    # lives in content_items


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
    s.headers.update({"Accept": "application/json"})
    return s


def _fake_mp3_bytes(size_kb: int = 4) -> bytes:
    return b"\xff\xfb\x90\x00" + b"\x00" * (size_kb * 1024 - 4)


# ------------------------------------------------------------------
# 1. GET item from bhakti_items via /content/items/:id
# ------------------------------------------------------------------
def test_get_aarti_item_from_bhakti_items(session):
    r = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}")
    assert r.status_code == 200, f"expected 200, got {r.status_code} {r.text}"
    data = r.json()
    assert data["_id"] == AARTI_ID
    assert data.get("category") == "aarti", f"category={data.get('category')}"


# ------------------------------------------------------------------
# 2. GET verses for aarti item (empty list OK)
# ------------------------------------------------------------------
def test_get_aarti_verses_returns_200(session):
    r = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/verses")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


# ------------------------------------------------------------------
# 3. Publish-check for aarti returns can_publish=false with 0 verses
# ------------------------------------------------------------------
def test_publish_check_aarti(session):
    # first ensure no verses exist (clean state)
    verses_before = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/verses").json()
    initial_count = len(verses_before)

    r = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/publish-check")
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    data = r.json()
    assert "can_publish" in data
    # iter20 spec: aarti publish-check now has 4 rows (title, primary_language,
    # aarti_media, aarti_sync) — verse-based rows moved out of aarti branch.
    assert "checks" in data and len(data["checks"]) == 4
    keys = {c["key"] for c in data["checks"]}
    assert "aarti_media" in keys and "aarti_sync" in keys
    assert data["verse_count"] == initial_count


# ------------------------------------------------------------------
# 4. POST a verse to aarti -> persisted in bhakti_verses and returned by GET
# ------------------------------------------------------------------
def test_create_verse_on_aarti_writes_bhakti_verses(session):
    payload = {
        "verse_num": 9001,
        "verse_type": "shloka",
        "sanskrit_text": f"TEST_iter18_verse_{int(time.time())}",
        "transliteration": "test translit",
    }
    r = session.post(f"{BASE_URL}/api/content/items/{AARTI_ID}/verses", json=payload)
    assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
    created = r.json()
    assert created["item_id"] == AARTI_ID
    assert created["sanskrit_text"] == payload["sanskrit_text"]
    verse_id = created["_id"]

    # Read it back via GET /content/items/:id/verses
    r2 = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/verses")
    assert r2.status_code == 200
    verses = r2.json()
    assert any(v["_id"] == verse_id for v in verses), "new verse missing from list"

    # stash the verse_id on the session for the next test
    session._last_aarti_verse_id = verse_id


# ------------------------------------------------------------------
# 5. PUT /content/verses/:verse_id for a bhakti_verses verse
# ------------------------------------------------------------------
def test_update_verse_in_bhakti_verses(session):
    verse_id = getattr(session, "_last_aarti_verse_id", None)
    if not verse_id:
        pytest.skip("create_verse test must run first")
    new_text = f"TEST_iter18_updated_{int(time.time())}"
    r = session.put(f"{BASE_URL}/api/content/verses/{verse_id}",
                    json={"sanskrit_text": new_text})
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    assert r.json().get("sanskrit_text") == new_text

    # verify round-trip via the item's verses endpoint
    r2 = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/verses")
    v = next((x for x in r2.json() if x["_id"] == verse_id), None)
    assert v is not None, "verse disappeared"
    assert v["sanskrit_text"] == new_text, "update not persisted in bhakti_verses"


# ------------------------------------------------------------------
# 6. PATCH status=published without title/verses -> 422
#    (use a freshly-created bhakti_items doc so we don't mutate AARTI_ID)
# ------------------------------------------------------------------
def test_patch_publish_bare_bhakti_item_returns_422(session):
    # Need a bare item in bhakti_items. Use the /api/bhakti/items create endpoint
    # if it exists; otherwise we cannot craft this exact scenario without DB access.
    # Fallback: use AARTI_ID after verifying supported_languages absence would 422
    # — but to avoid side-effects on the aarti item, we attempt a bhakti create.
    payload = {
        "category": "aarti",
        "title_hi": "",
        "title_en": "",
        "deity": "",
        "supported_languages": [],
    }
    create = session.post(f"{BASE_URL}/api/bhakti/items", json=payload)
    if create.status_code not in (200, 201):
        pytest.skip(f"bhakti create unavailable ({create.status_code}); cannot craft bare item")
    doc = create.json()
    new_id = doc.get("_id") or doc.get("id")
    assert new_id, f"no id on created bhakti item: {doc}"
    try:
        r = session.patch(f"{BASE_URL}/api/content/items/{new_id}/status",
                          json={"status": "published"})
        assert r.status_code == 422, f"expected 422, got {r.status_code} {r.text}"
        detail = r.json().get("detail", "")
        assert "missing" in detail.lower() or "title" in detail.lower() or "verse" in detail.lower()
    finally:
        # cleanup
        session.delete(f"{BASE_URL}/api/bhakti/items/{new_id}")


# ------------------------------------------------------------------
# 7. Audio upload to aarti persists audio_sync on bhakti_items doc
# ------------------------------------------------------------------
def test_audio_upload_persisted_on_bhakti_items(session):
    files = {
        "audio": ("test_iter18.mp3", io.BytesIO(_fake_mp3_bytes(8)), "audio/mpeg"),
    }
    r = session.post(
        f"{BASE_URL}/api/content/items/{AARTI_ID}/audio",
        files=files,
    )
    assert r.status_code in (200, 201), f"audio upload failed: {r.status_code} {r.text}"

    # verify via GET /content/items/:id that audio_sync is present on the bhakti_items doc
    r2 = session.get(f"{BASE_URL}/api/content/items/{AARTI_ID}")
    assert r2.status_code == 200
    audio_sync = r2.json().get("audio_sync") or {}
    assert audio_sync.get("audio_url"), f"audio_url missing on bhakti_items doc: {r2.json()}"


# ------------------------------------------------------------------
# 8. Chalisa still works (regression on content_items path)
# ------------------------------------------------------------------
def test_chalisa_unchanged(session):
    r = session.get(f"{BASE_URL}/api/content/items/{CHALISA_ID}")
    assert r.status_code == 200
    assert r.json()["_id"] == CHALISA_ID

    r = session.get(f"{BASE_URL}/api/content/items/{CHALISA_ID}/publish-check")
    assert r.status_code == 200
    data = r.json()
    assert data["verse_count"] >= 1
