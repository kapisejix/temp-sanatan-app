"""Iteration 15 — Panchang v2, Dharma Engine, DOCX bug fix regression.

Covers:
- GET /api/panchang/day (fields, festivals, Abhijit skip-Wed, cache speed, system toggle)
- GET /api/dharma/today (anonymous + mobile-user personalized)
- POST /api/admin/import-wizard with real-world Chalisa.docx (deterministic parser)
- Regression: mobile login, admin login, yogas, kundli/my
"""
import os
import time
import datetime as dt
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend/.env
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
assert BASE_URL, "REACT_APP_BACKEND_URL missing"

MOBILE_EMAIL = "mtest@sanatansaathi.com"
MOBILE_PW = "Test@1234"
ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PW = "SanatanAdmin@2026"

CHALISA_URL = (
    "https://customer-assets.emergentagent.com/"
    "job_integrated-platform-13/artifacts/4iyz2k07_Chalisa.docx"
)
CHALISA_PATH = Path("/tmp/Chalisa.docx")


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    return s


@pytest.fixture(scope="module")
def mobile_token(sess):
    r = sess.post(
        f"{BASE_URL}/api/auth/mobile/login",
        json={"email": MOBILE_EMAIL, "password": MOBILE_PW},
    )
    if r.status_code != 200:
        pytest.skip(f"mobile login failed: {r.status_code} {r.text[:200]}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PW},
    )
    assert r.status_code == 200, f"admin login failed: {r.text[:200]}"
    return r.json()["token"]


# ==================== PANCHANG ====================
REQUIRED_PANCHANG_FIELDS = {
    "date", "weekday_hi", "main_line_hi", "sunrise", "sunset",
    "tithi_hi", "tithi_end", "nakshatra_hi", "nakshatra_end",
    "yoga_hi", "yoga_end", "karana_hi", "rahu_kaal", "gulika_kaal",
    "yamagandam", "abhijit_muhurta", "amrit_kalam",
    "is_bhadra", "is_panchak", "month_hi", "festivals",
}


class TestPanchang:
    def test_all_required_fields_present(self):
        r = requests.get(
            f"{BASE_URL}/api/panchang/day",
            params={"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata"},
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        missing = REQUIRED_PANCHANG_FIELDS - set(data.keys())
        assert not missing, f"Missing fields: {missing}"

    def test_raksha_bandhan_2026_07_29(self):
        r = requests.get(
            f"{BASE_URL}/api/panchang/day",
            params={"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata",
                    "date": "2026-07-29"},
        )
        assert r.status_code == 200
        data = r.json()
        fest_names = {f.get("name_hi") for f in data.get("festivals", [])}
        assert "रक्षा बन्धन" in fest_names, f"Raksha Bandhan missing: {fest_names}"
        assert "पूर्णिमा" in fest_names, f"Purnima missing: {fest_names}"

    def test_kartik_month_2026_11_08(self):
        r = requests.get(
            f"{BASE_URL}/api/panchang/day",
            params={"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata",
                    "date": "2026-11-08"},
        )
        assert r.status_code == 200
        assert r.json()["month_hi"] == "कार्तिक"

    def test_abhijit_null_on_wednesday(self):
        # 2026-01-07 is a Wednesday
        assert dt.date(2026, 1, 7).weekday() == 2
        r = requests.get(
            f"{BASE_URL}/api/panchang/day",
            params={"date": "2026-01-07"},
        )
        assert r.status_code == 200
        assert r.json()["abhijit_muhurta"] is None

    def test_abhijit_non_null_on_non_wednesday(self):
        # 2026-11-08 is Sunday (weekday=6)
        r = requests.get(f"{BASE_URL}/api/panchang/day",
                         params={"date": "2026-11-08"})
        assert r.status_code == 200
        assert r.json()["abhijit_muhurta"] not in (None, "", "null")

    def test_cache_fast_on_repeat(self):
        # first hit might be slow
        params = {"lat": 28.61, "lon": 77.21, "tz": "Asia/Kolkata",
                  "date": "2026-07-29"}
        requests.get(f"{BASE_URL}/api/panchang/day", params=params)
        t0 = time.time()
        r = requests.get(f"{BASE_URL}/api/panchang/day", params=params)
        elapsed = time.time() - t0
        assert r.status_code == 200
        assert elapsed < 1.0, f"cache hit too slow: {elapsed:.2f}s"

    def test_system_toggle_returns_system_field(self):
        rn = requests.get(f"{BASE_URL}/api/panchang/day",
                          params={"date": "2026-11-08", "system": "north"})
        rs = requests.get(f"{BASE_URL}/api/panchang/day",
                          params={"date": "2026-11-08", "system": "south"})
        assert rn.status_code == 200 and rs.status_code == 200
        assert rn.json().get("system") == "north"
        assert rs.json().get("system") == "south"


# ==================== DHARMA ====================
class TestDharma:
    def test_anonymous_returns_cards(self):
        r = requests.get(f"{BASE_URL}/api/dharma/today")
        assert r.status_code == 200
        d = r.json()
        assert d.get("is_personalized") is False
        assert "cards" in d and isinstance(d["cards"], list)
        # At least the weekday rule should match
        assert d.get("rules_matched", 0) >= 1

    def test_mobile_user_personalized(self, mobile_token):
        r = requests.get(
            f"{BASE_URL}/api/dharma/today",
            headers={"Authorization": f"Bearer {mobile_token}"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d.get("is_personalized") is True, f"not personalized: {d}"
        assert d.get("rules_matched", 0) > 0
        assert len(d.get("cards", [])) > 0
        assert d.get("user_id")

    def test_card_structure(self, mobile_token):
        r = requests.get(
            f"{BASE_URL}/api/dharma/today",
            headers={"Authorization": f"Bearer {mobile_token}"},
        )
        cards = r.json().get("cards", [])
        assert cards, "no cards returned"
        required = {"rule_id", "priority", "focus_planet", "focus_planet_hi",
                    "deity_hi", "mantra", "chant_count", "reason_hi",
                    "context_hi", "actions", "offering_hi", "color_hi", "day_hi"}
        missing = required - set(cards[0].keys())
        assert not missing, f"card missing fields: {missing}"
        assert isinstance(cards[0]["actions"], list)

    def test_dedup_and_sort(self, mobile_token):
        r = requests.get(
            f"{BASE_URL}/api/dharma/today",
            headers={"Authorization": f"Bearer {mobile_token}"},
        )
        cards = r.json().get("cards", [])
        assert len(cards) <= 5, "more than 5 cards returned"
        # de-dup by focus_planet
        planets = [c["focus_planet"] for c in cards]
        assert len(planets) == len(set(planets)), f"duplicates: {planets}"
        # sorted desc by priority
        priorities = [c["priority"] for c in cards]
        assert priorities == sorted(priorities, reverse=True), \
            f"not sorted desc: {priorities}"


# ==================== DOCX BUG FIX ====================
class TestDocxImport:
    @classmethod
    def setup_class(cls):
        if not CHALISA_PATH.exists() or CHALISA_PATH.stat().st_size < 100000:
            data = requests.get(CHALISA_URL, timeout=30).content
            CHALISA_PATH.write_bytes(data)
        assert CHALISA_PATH.stat().st_size > 1_000_000

    def test_docx_parser_unit(self):
        """docx_parser.parse_docx_bytes deterministic, fast, correct counts."""
        import sys
        sys.path.insert(0, "/app/backend")
        from docx_parser import parse_docx_bytes  # type: ignore

        t0 = time.time()
        items = parse_docx_bytes(CHALISA_PATH.read_bytes())
        elapsed = time.time() - t0
        assert elapsed < 10.0, f"parser too slow: {elapsed:.2f}s"
        assert len(items) == 3, f"expected 3 items, got {len(items)}"
        total_verses = sum(len(it.get("verses", [])) for it in items)
        assert 120 <= total_verses <= 140, f"unexpected verses: {total_verses}"
        # verse_num is re-numbered linearly per item
        for it in items:
            nums = [v.get("verse_num") for v in it.get("verses", [])]
            assert nums == sorted(nums), "verses not linearly numbered"
            assert nums[0] == 1, f"first verse_num must be 1, got {nums[0]}"

    def test_import_wizard_chalisa(self, admin_token):
        with open(CHALISA_PATH, "rb") as f:
            t0 = time.time()
            r = requests.post(
                f"{BASE_URL}/api/admin/import-wizard",
                headers={"Authorization": f"Bearer {admin_token}"},
                files={"file": ("Chalisa.docx", f,
                                "application/vnd.openxmlformats-officedocument"
                                ".wordprocessingml.document")},
                data={"category": "chalisa", "language": "hi"},
                timeout=30,
            )
            elapsed = time.time() - t0
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        assert elapsed < 10.0, f"endpoint too slow: {elapsed:.2f}s"
        d = r.json()
        assert d.get("items_count") == 3, f"items_count={d.get('items_count')}"
        tv = d.get("total_verses", 0)
        assert 120 <= tv <= 140, f"total_verses={tv}"
        parsed = d.get("parsed_data", [])
        assert parsed, "parsed_data missing"
        v0 = parsed[0].get("verses", [])
        assert v0, "no verses in first item"
        sample = v0[0]
        assert sample.get("sanskrit_text"), "empty sanskrit_text"
        assert sample.get("transliteration"), "empty transliteration"
        assert sample.get("meaning"), "empty meaning"


# ==================== REGRESSION ====================
class TestRegression:
    def test_mobile_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/mobile/login",
                          json={"email": MOBILE_EMAIL, "password": MOBILE_PW})
        assert r.status_code == 200
        assert r.json().get("token")

    def test_admin_login_bcrypt_format(self, admin_token):
        assert admin_token and admin_token.count(".") == 2  # JWT

    def test_yogas(self, mobile_token):
        r = requests.get(f"{BASE_URL}/api/yogas",
                         headers={"Authorization": f"Bearer {mobile_token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_kundli_my(self, mobile_token):
        r = requests.get(f"{BASE_URL}/api/kundli/my",
                         headers={"Authorization": f"Bearer {mobile_token}"})
        assert r.status_code == 200

    def test_content_audio_endpoint(self):
        # public GET — should return 200 with empty payload or audio meta
        # 69f053c8053b601fc045a5ca (Hanuman Chalisa from iter 13)
        r = requests.get(
            f"{BASE_URL}/api/content/items/69f053c8053b601fc045a5ca/audio"
        )
        assert r.status_code in (200, 404)
