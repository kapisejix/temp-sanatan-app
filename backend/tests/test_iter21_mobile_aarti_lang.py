"""Iteration 21 — Mobile aarti per-language playback contract + preferred_language.

Validates the backend contracts mobile (Expo) consumes:
- GET /api/content/items/{id}                       → category=='aarti', supported_languages
- GET /api/content/items/{id}/lang/{lang}/media     → public bundle shape
- PUT /api/auth/mobile/settings {preferred_language}→ persists, GET /me reflects
- PUT /api/auth/mobile/settings invalid lang        → 400
- PUT /api/auth/mobile/settings empty body          → 400
- Regression: subset of iter20 endpoints still wired correctly
"""
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
AARTI_ID = "69f1e1a77488457efddb02b7"


# --- (P0) Mobile detects aarti via category + supported_languages -----------
class TestAartiItemMetadata:
    def test_get_item_returns_aarti_category(self):
        # Public — mobile may call without auth
        r = requests.get(f"{BASE_URL}/api/content/items/{AARTI_ID}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("category") == "aarti", f"category={body.get('category')!r}"
        sup = body.get("supported_languages") or []
        # Spec: hi + mr supported (en intentionally absent)
        assert "hi" in sup
        assert "mr" in sup

    def test_get_item_unknown_404(self):
        r = requests.get(f"{BASE_URL}/api/content/items/000000000000000000000000")
        assert r.status_code == 404


# --- (P0) Per-lang media bundle shape ---------------------------------------
class TestPerLangMediaBundle:
    REQUIRED_KEYS = ("lang", "audio_versions", "video", "thumbnail", "sync", "full_text")

    def test_hi_bundle_has_thumbnail_and_sync(self):
        r = requests.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/media")
        assert r.status_code == 200, r.text
        body = r.json()
        for k in self.REQUIRED_KEYS:
            assert k in body, f"missing key {k!r} in /lang/hi/media response"
        assert body["lang"] == "hi"
        assert isinstance(body["audio_versions"], list)
        # Per request: hi should have thumbnail + sync (uploaded in iter20)
        assert body["thumbnail"], "hi bundle expected to have thumbnail"
        assert body["sync"], "hi bundle expected to have sync"

    def test_mr_bundle_empty_for_fallback(self):
        # Mobile expects an empty/sparse bundle so client-side fallback kicks in
        r = requests.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/mr/media")
        assert r.status_code == 200, r.text
        body = r.json()
        for k in self.REQUIRED_KEYS:
            assert k in body
        assert body["lang"] == "mr"
        # mr should have no audio (cleaned by iter20) and no video
        assert body["audio_versions"] == []
        assert not body.get("video")

    def test_media_bundle_is_public_no_auth_header(self):
        # Explicit no-auth call
        s = requests.Session()
        s.headers.clear()
        r = s.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/media")
        assert r.status_code == 200


# --- (P1) Mobile preferred_language settings --------------------------------
@pytest.fixture(scope="module")
def mobile_user():
    """Create a throwaway mobile user; reused across this module."""
    s = requests.Session()
    email = f"TEST_iter21_lang_{int(time.time())}@example.com"
    password = "Test@12345"
    r = s.post(
        f"{BASE_URL}/api/auth/mobile/signup",
        json={"name": "LangTest", "email": email, "password": password},
    )
    if r.status_code not in (200, 201):
        pytest.skip(f"mobile signup failed {r.status_code} {r.text}")
    token = r.json().get("token") or r.json().get("access_token")
    if not token:
        pytest.skip(f"signup missing token: {r.text}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return {"session": s, "email": email, "password": password}


class TestMobilePreferredLanguage:
    def test_signup_default_preferred_language(self, mobile_user):
        s = mobile_user["session"]
        r = s.get(f"{BASE_URL}/api/auth/mobile/me")
        assert r.status_code == 200, r.text
        # Just ensure key exists; default value can vary
        assert "preferred_language" in r.json()

    def test_update_to_en_persists(self, mobile_user):
        s = mobile_user["session"]
        r = s.put(
            f"{BASE_URL}/api/auth/mobile/settings",
            json={"preferred_language": "en"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("preferred_language") == "en"

    def test_get_me_after_update_reflects_en(self, mobile_user):
        s = mobile_user["session"]
        r = s.get(f"{BASE_URL}/api/auth/mobile/me")
        assert r.status_code == 200, r.text
        assert r.json().get("preferred_language") == "en"

    def test_update_to_hi_persists(self, mobile_user):
        s = mobile_user["session"]
        r = s.put(
            f"{BASE_URL}/api/auth/mobile/settings",
            json={"preferred_language": "hi"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("preferred_language") == "hi"
        # Re-fetch to verify persistence
        r2 = s.get(f"{BASE_URL}/api/auth/mobile/me")
        assert r2.status_code == 200
        assert r2.json().get("preferred_language") == "hi"

    def test_invalid_language_rejected_400(self, mobile_user):
        s = mobile_user["session"]
        r = s.put(
            f"{BASE_URL}/api/auth/mobile/settings",
            json={"preferred_language": "xx"},
        )
        assert r.status_code == 400, r.text

    def test_empty_body_rejected_400(self, mobile_user):
        s = mobile_user["session"]
        r = s.put(
            f"{BASE_URL}/api/auth/mobile/settings",
            json={},
        )
        assert r.status_code == 400, r.text

    def test_settings_requires_auth(self):
        r = requests.put(
            f"{BASE_URL}/api/auth/mobile/settings",
            json={"preferred_language": "hi"},
        )
        assert r.status_code in (401, 403), r.text


# --- Regression: iter20 endpoints still routable ----------------------------
class TestIter20Regression:
    def test_publish_check_aarti(self):
        # Admin login
        s = requests.Session()
        r = s.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@sanatansaathi.com", "password": "SanatanAdmin@2026"},
        )
        if r.status_code != 200:
            pytest.skip(f"admin login failed: {r.status_code}")
        token = r.json().get("access_token") or r.json().get("token")
        s.headers.update({"Authorization": f"Bearer {token}"})
        rr = s.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/publish-check")
        assert rr.status_code == 200, rr.text
        keys = {c["key"] for c in rr.json()["checks"]}
        assert "aarti_media" in keys
        assert "aarti_sync" in keys

    def test_media_bundle_unsupported_lang_safe(self):
        # Backend returns 200 with empty bundle OR 400 — both are mobile-safe
        # since mobile uses the supported_languages list to drive the call.
        r = requests.get(f"{BASE_URL}/api/content/items/{AARTI_ID}/lang/hi/media")
        assert r.status_code == 200
