"""End-to-end backend tests for Phase 1 Multilingual Editor (Gemini AI translations).

Covers:
- POST /api/admin/translate/text  (Gemini call)
- POST /api/admin/translate/verse with verse_id (saves drafts)
- GET    /api/admin/translate/drafts/{verse_id}
- PUT    /api/admin/translate/drafts/{verse_id}/{language}
- POST   /api/admin/translate/drafts/{verse_id}/{language}/publish
- DELETE /api/admin/translate/drafts/{verse_id}/{language}
- GET    /api/admin/translate/languages
- Auth:  unauthenticated requests return 401
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASS = "SanatanAdmin@2026"
HC_ITEM_ID = "69f053c8053b601fc045a5ca"  # Hanuman Chalisa


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def chaupai_verse_ids(auth_client):
    """Pick verses to AI-translate. Avoid DOHA #1 (already published manually)."""
    r = auth_client.get(f"{BASE_URL}/api/content/items/{HC_ITEM_ID}/verses", timeout=30)
    assert r.status_code == 200, f"Verses fetch failed: {r.status_code} {r.text}"
    verses = r.json()
    assert len(verses) >= 5, f"Expected >=5 verses, got {len(verses)}"
    skip = "69f053c8053b601fc045a5d0"  # DOHA #1 (manually published Marathi)
    ids = [v.get("id") or v.get("_id") for v in verses if (v.get("id") or v.get("_id")) != skip]
    return ids[:3]


# ---------------- Auth / public ----------------
class TestAuth:
    def test_unauth_translate_text_401(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/translate/text",
            json={"text": "ॐ", "source_language": "hi", "target_languages": ["en"]},
            timeout=15,
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text[:200]}"

    def test_unauth_languages_401(self):
        r = requests.get(f"{BASE_URL}/api/admin/translate/languages", timeout=15)
        assert r.status_code == 401

    def test_unauth_drafts_get_401(self):
        r = requests.get(f"{BASE_URL}/api/admin/translate/drafts/anyid", timeout=15)
        assert r.status_code == 401


# ---------------- Languages list ----------------
class TestLanguages:
    def test_languages_list(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/admin/translate/languages", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "languages" in data
        codes = {x["code"] for x in data["languages"]}
        for c in ["sa", "hi", "en", "mr", "gu", "ta", "te", "bn"]:
            assert c in codes, f"Missing language code {c} in {codes}"


# ---------------- Translate text (Gemini live) ----------------
class TestTranslateText:
    def test_translate_text_hi_to_multi(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/admin/translate/text",
            json={
                "text": "श्री हनुमान",
                "source_language": "hi",
                "target_languages": ["en", "mr", "gu"],
            },
            timeout=60,
        )
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert "translations" in data
        t = data["translations"]
        # All requested target langs should be present
        for c in ["en", "mr", "gu"]:
            assert c in t and isinstance(t[c], str) and len(t[c].strip()) > 0, f"Missing/empty {c}: {t}"
        # Unicode sanity: gu should contain Gujarati script chars (U+0A80–U+0AFF) for "Hanuman"
        gu_codepoints = [ord(ch) for ch in t["gu"]]
        assert any(0x0A80 <= cp <= 0x0AFF for cp in gu_codepoints), f"Gujarati script missing in: {t['gu']}"
        # mr should contain Devanagari (U+0900–U+097F)
        mr_codepoints = [ord(ch) for ch in t["mr"]]
        assert any(0x0900 <= cp <= 0x097F for cp in mr_codepoints), f"Devanagari missing in: {t['mr']}"


# ---------------- Translate verse + drafts CRUD ----------------
class TestVerseDrafts:
    def test_translate_verse_saves_draft(self, auth_client, chaupai_verse_ids):
        verse_id = chaupai_verse_ids[0]
        # Cleanup pre-existing draft for mr to make this idempotent
        auth_client.delete(f"{BASE_URL}/api/admin/translate/drafts/{verse_id}/mr", timeout=15)

        r = auth_client.post(
            f"{BASE_URL}/api/admin/translate/verse",
            json={
                "source_language": "hi",
                "target_languages": ["mr"],
                "verse_id": verse_id,
                "text": "जय हनुमान ज्ञान गुन सागर",
                "transliteration": "jaya hanuman gyaan gun saagar",
                "meaning": "Victory to Hanuman, ocean of knowledge and virtues.",
            },
            timeout=90,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert "translations" in data and "mr" in data["translations"]
        assert "saved_drafts" in data and "mr" in data["saved_drafts"]

        # GET drafts confirms persistence
        r2 = auth_client.get(f"{BASE_URL}/api/admin/translate/drafts/{verse_id}", timeout=15)
        assert r2.status_code == 200
        drafts = r2.json()
        mr = next((d for d in drafts if d["language"] == "mr" and d.get("is_draft")), None)
        assert mr is not None, f"mr draft not found among {drafts}"
        assert mr["is_ai_generated"] is True
        assert mr["is_draft"] is True
        assert mr.get("text") and mr.get("meaning")
        # _id must NOT leak as ObjectId; should be string id
        assert "_id" not in mr or isinstance(mr.get("_id"), str)

    def test_update_draft_marks_manual(self, auth_client, chaupai_verse_ids):
        verse_id = chaupai_verse_ids[0]
        # ensure a draft exists from prior test
        edit = "TEST_EDIT meaning manual override"
        r = auth_client.put(
            f"{BASE_URL}/api/admin/translate/drafts/{verse_id}/mr",
            json={"meaning": edit},
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        doc = r.json()
        assert doc.get("meaning") == edit
        assert doc.get("is_ai_generated") is False
        assert doc.get("is_draft") is True

    def test_publish_draft_moves_to_live(self, auth_client, chaupai_verse_ids):
        verse_id = chaupai_verse_ids[0]
        r = auth_client.post(
            f"{BASE_URL}/api/admin/translate/drafts/{verse_id}/mr/publish",
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.json()
        assert body.get("language") == "mr"

        # verse_meanings should now contain the meaning we set
        rm = auth_client.get(f"{BASE_URL}/api/content/verses/{verse_id}/meanings", timeout=15)
        assert rm.status_code == 200, rm.text
        meanings = rm.json()
        mr_m = next((m for m in meanings if m.get("language") == "mr"), None)
        assert mr_m is not None, f"Marathi meaning not found in: {meanings}"
        assert "TEST_EDIT" in (mr_m.get("meaning") or "")

        # Draft should be flipped to is_draft=false
        rd = auth_client.get(f"{BASE_URL}/api/admin/translate/drafts/{verse_id}", timeout=15)
        assert rd.status_code == 200
        drafts = rd.json()
        mr_drafts = [d for d in drafts if d["language"] == "mr"]
        assert any(d.get("is_draft") is False for d in mr_drafts), f"No published draft found: {mr_drafts}"

    def test_delete_draft(self, auth_client, chaupai_verse_ids):
        # Use a different verse so we don't disturb the just-published one.
        verse_id = chaupai_verse_ids[1]
        # First create a fresh AI draft for gu
        auth_client.delete(f"{BASE_URL}/api/admin/translate/drafts/{verse_id}/gu", timeout=15)
        rc = auth_client.post(
            f"{BASE_URL}/api/admin/translate/verse",
            json={
                "source_language": "hi",
                "target_languages": ["gu"],
                "verse_id": verse_id,
                "text": "श्रीगुरु चरन सरोज रज",
                "meaning": "The dust of the lotus feet of the divine guru.",
            },
            timeout=90,
        )
        assert rc.status_code == 200, rc.text
        # Delete it
        rd = auth_client.delete(
            f"{BASE_URL}/api/admin/translate/drafts/{verse_id}/gu",
            timeout=15,
        )
        assert rd.status_code == 200
        assert rd.json().get("deleted", 0) >= 1
        # Confirm gone (no draft with is_draft=true)
        rg = auth_client.get(f"{BASE_URL}/api/admin/translate/drafts/{verse_id}", timeout=15)
        gu_drafts = [d for d in rg.json() if d["language"] == "gu" and d.get("is_draft")]
        assert len(gu_drafts) == 0


# ---------------- Validation ----------------
class TestValidation:
    def test_unsupported_language_update(self, auth_client, chaupai_verse_ids):
        verse_id = chaupai_verse_ids[0]
        r = auth_client.put(
            f"{BASE_URL}/api/admin/translate/drafts/{verse_id}/zz",
            json={"meaning": "x"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_publish_missing_draft_404(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/admin/translate/drafts/000000000000000000000000/mr/publish",
            timeout=15,
        )
        assert r.status_code == 404
