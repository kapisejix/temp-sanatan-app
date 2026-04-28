"""Backend tests for mobile endpoints + regression for astrology endpoints."""
import os
import re
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://integrated-platform-13.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASSWORD = "SanatanAdmin@2026"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


@pytest.fixture(scope="module")
def auth_token(session):
    # Try /auth/admin/login first (mobile client uses this)
    for ep in ["/auth/admin/login", "/auth/login"]:
        r = session.post(f"{API}{ep}", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        if r.status_code == 200:
            d = r.json()
            tok = d.get("access_token") or d.get("token")
            if tok:
                return tok
    pytest.skip("Admin login failed on both /auth/admin/login and /auth/login")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ===================== MOBILE PANCHANG =====================

class TestMobilePanchang:
    def test_panchang_today_default(self, session):
        r = session.get(f"{API}/mobile/panchang/today", timeout=20)
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
        d = r.json()
        for k in ["date","weekday_hi","tithi_hi","nakshatra_hi","yoga_hi","karana_hi","sunrise","sunset","rahu_kaal"]:
            assert k in d, f"missing {k}"
            assert isinstance(d[k], str) and len(d[k]) > 0, f"empty {k}"
        # paksha must be in tithi_hi
        assert ("शुक्ल" in d["tithi_hi"]) or ("कृष्ण" in d["tithi_hi"]), f"paksha missing: {d['tithi_hi']}"
        # sunrise HH:MM
        assert re.match(r"^\d{2}:\d{2}$", d["sunrise"]), d["sunrise"]
        assert re.match(r"^\d{2}:\d{2}$", d["sunset"]), d["sunset"]
        # rahu kaal HH:MM – HH:MM
        assert re.match(r"^\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}$", d["rahu_kaal"]), d["rahu_kaal"]

    def test_panchang_mumbai_differs_from_delhi(self, session):
        delhi = session.get(f"{API}/mobile/panchang/today", timeout=20).json()
        mumbai = session.get(
            f"{API}/mobile/panchang/today",
            params={"lat": 19.0760, "lon": 72.8777, "tz": "Asia/Kolkata"},
            timeout=20,
        ).json()
        assert "sunrise" in mumbai and "sunrise" in delhi
        # Mumbai is east-shifted vs Delhi by ~5° lon — sunrise differs by minutes
        assert mumbai["sunrise"] != delhi["sunrise"] or mumbai["sunset"] != delhi["sunset"], \
            f"Expected Mumbai sunrise/sunset to differ from Delhi default. mumbai={mumbai['sunrise']}/{mumbai['sunset']} delhi={delhi['sunrise']}/{delhi['sunset']}"


# ===================== MANTRA OF DAY =====================

class TestMantraOfDay:
    def test_mantra_of_day(self, session):
        r = session.get(f"{API}/mobile/mantra-of-day", timeout=15)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        for k in ["graha","graha_hi","devta_hi","mantra","count","day_hi","date"]:
            assert k in d, f"missing {k}"
        assert d["graha"] in ["Moon","Mars","Mercury","Jupiter","Venus","Saturn","Sun"], d["graha"]
        assert isinstance(d["count"], int) and d["count"] > 0
        assert len(d["mantra"]) > 0


# ===================== REGRESSION =====================

class TestAstrologyRegression:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert "Sanatan" in r.json().get("message","")

    def test_kundli_my(self, session, auth_headers):
        r = session.get(f"{API}/kundli/my", headers=auth_headers, timeout=20)
        # 200 if admin has kundli, 404/400 otherwise — both acceptable; auth must not 401
        assert r.status_code != 401, r.text[:200]
        assert r.status_code in (200, 400, 404), f"unexpected {r.status_code}: {r.text[:200]}"

    def test_dasha_current(self, session, auth_headers):
        r = session.get(f"{API}/dasha/current", headers=auth_headers, timeout=20)
        assert r.status_code != 401
        assert r.status_code in (200, 400, 404)

    def test_dosha_detect(self, session, auth_headers):
        r = session.get(f"{API}/dosha/detect", headers=auth_headers, timeout=20)
        assert r.status_code != 401
        assert r.status_code in (200, 400, 404)

    def test_charts_d1_d9(self, session, auth_headers):
        r = session.get(f"{API}/charts/d1-d9", headers=auth_headers, timeout=20)
        assert r.status_code != 401
        assert r.status_code in (200, 400, 404)

    def test_insights_today(self, session, auth_headers):
        r = session.get(f"{API}/insights/today", headers=auth_headers, timeout=20)
        assert r.status_code != 401
        assert r.status_code in (200, 400, 404)

    def test_notifications_today(self, session, auth_headers):
        r = session.get(f"{API}/notifications/today", headers=auth_headers, timeout=20)
        assert r.status_code != 401
        assert r.status_code in (200, 400, 404)

    def test_recommendations_mantra(self, session, auth_headers):
        r = session.get(f"{API}/recommendations/mantra", headers=auth_headers, timeout=20)
        assert r.status_code != 401
        assert r.status_code in (200, 400, 404)

    def test_kundli_generate(self, session, auth_headers):
        # Use a benign payload to verify endpoint is reachable & validates
        payload = {
            "name": "TEST_RegressionUser",
            "dob": "1990-01-01",
            "tob": "06:00",
            "place": "Delhi",
            "lat": 28.6139, "lon": 77.2090, "tz_offset": 5.5,
        }
        r = session.post(f"{API}/kundli/generate", json=payload, headers=auth_headers, timeout=30)
        assert r.status_code != 401
        # 200 success or 400/422 for validation — endpoint must exist
        assert r.status_code in (200, 400, 422), f"unexpected {r.status_code}: {r.text[:200]}"
