"""Iteration 17 - Verify verse meanings endpoint persistence (used by drawer language tabs)."""
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
HANUMAN_ID = "69f053c8053b601fc045a5ca"


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
    return s


@pytest.fixture(scope="module")
def first_verse_id(session):
    r = session.get(f"{BASE_URL}/api/content/items/{HANUMAN_ID}/verses")
    assert r.status_code == 200
    verses = r.json()
    assert isinstance(verses, list) and len(verses) >= 1
    vid = verses[0].get("id") or verses[0].get("_id")
    assert vid
    return vid


def test_create_and_get_meaning_hi(session, first_verse_id):
    payload = {
        "language": "hi",
        "meaning": f"TEST_iter17_meaning_hi_{int(time.time())}",
        "word_breakdown": []
    }
    r = session.post(f"{BASE_URL}/api/content/verses/{first_verse_id}/meanings", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["language"] == "hi"
    assert data["meaning"] == payload["meaning"]

    # GET to verify persistence
    r2 = session.get(f"{BASE_URL}/api/content/verses/{first_verse_id}/meanings")
    assert r2.status_code == 200
    meanings = r2.json()
    hi = [m for m in meanings if m.get("language") == "hi"]
    assert len(hi) == 1, f"Expected exactly one 'hi' meaning, got {len(hi)}"
    assert hi[0]["meaning"] == payload["meaning"]


def test_update_meaning_idempotent(session, first_verse_id):
    new_meaning = f"TEST_iter17_updated_{int(time.time())}"
    payload = {"language": "hi", "meaning": new_meaning, "word_breakdown": []}
    r = session.post(f"{BASE_URL}/api/content/verses/{first_verse_id}/meanings", json=payload)
    assert r.status_code == 200
    r2 = session.get(f"{BASE_URL}/api/content/verses/{first_verse_id}/meanings")
    hi = [m for m in r2.json() if m.get("language") == "hi"]
    assert len(hi) == 1
    assert hi[0]["meaning"] == new_meaning


def test_create_meaning_en_separate_lang(session, first_verse_id):
    payload = {"language": "en", "meaning": f"TEST_iter17_en_{int(time.time())}", "word_breakdown": []}
    r = session.post(f"{BASE_URL}/api/content/verses/{first_verse_id}/meanings", json=payload)
    assert r.status_code == 200
    r2 = session.get(f"{BASE_URL}/api/content/verses/{first_verse_id}/meanings")
    langs = {m.get("language") for m in r2.json()}
    assert "en" in langs and "hi" in langs
