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

    def test_panchang_today_not_estimated(self, session):
        """is_estimated must be False and sunrise/sunset must NOT be the hardcoded 06:00/18:30 fallback."""
        r = session.get(f"{API}/mobile/panchang/today", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("is_estimated") is False, f"is_estimated should be False, got {d.get('is_estimated')} | sunrise={d.get('sunrise')}"
        assert d["sunrise"] != "06:00", f"sunrise still hardcoded fallback: {d['sunrise']}"
        assert d["sunset"] != "18:30", f"sunset still hardcoded fallback: {d['sunset']}"

    @staticmethod
    def _to_minutes(hhmm: str) -> int:
        h, m = hhmm.split(":")
        return int(h) * 60 + int(m)

    def test_panchang_mumbai_differs_from_delhi(self, session):
        delhi = session.get(f"{API}/mobile/panchang/today", timeout=20).json()
        mumbai = session.get(
            f"{API}/mobile/panchang/today",
            params={"lat": 19.0760, "lon": 72.8777, "tz": "Asia/Kolkata"},
            timeout=20,
        ).json()
        assert "sunrise" in mumbai and "sunrise" in delhi
        d_sr = self._to_minutes(delhi["sunrise"])
        m_sr = self._to_minutes(mumbai["sunrise"])
        diff = abs(m_sr - d_sr)
        # Mumbai is west-shifted vs Delhi by ~4° lon — sunrise should differ ≥10 min
        assert diff >= 10, (
            f"Expected Mumbai vs Delhi sunrise to differ by >=10 minutes; "
            f"got delhi={delhi['sunrise']} mumbai={mumbai['sunrise']} diff={diff}m"
        )
        assert mumbai.get("is_estimated") is False
        assert delhi.get("is_estimated") is False

    def test_panchang_chennai_differs_from_delhi(self, session):
        delhi = session.get(f"{API}/mobile/panchang/today", timeout=20).json()
        chennai = session.get(
            f"{API}/mobile/panchang/today",
            params={"lat": 13.0827, "lon": 80.2707, "tz": "Asia/Kolkata"},
            timeout=20,
        ).json()
        assert chennai["sunrise"] != delhi["sunrise"] or chennai["sunset"] != delhi["sunset"], \
            f"Chennai should differ from Delhi: chennai={chennai['sunrise']}/{chennai['sunset']} delhi={delhi['sunrise']}/{delhi['sunset']}"
        assert chennai.get("is_estimated") is False

    def test_rahu_kaal_varies_per_location(self, session):
        """Rahu Kaal is computed from sunrise/sunset so it should vary by location."""
        delhi = session.get(f"{API}/mobile/panchang/today", timeout=20).json()
        mumbai = session.get(
            f"{API}/mobile/panchang/today",
            params={"lat": 19.0760, "lon": 72.8777, "tz": "Asia/Kolkata"},
            timeout=20,
        ).json()
        chennai = session.get(
            f"{API}/mobile/panchang/today",
            params={"lat": 13.0827, "lon": 80.2707, "tz": "Asia/Kolkata"},
            timeout=20,
        ).json()
        # At least Mumbai or Chennai should differ from Delhi
        assert delhi["rahu_kaal"] != mumbai["rahu_kaal"] or delhi["rahu_kaal"] != chennai["rahu_kaal"], \
            f"Rahu Kaal identical across locations: delhi={delhi['rahu_kaal']} mumbai={mumbai['rahu_kaal']} chennai={chennai['rahu_kaal']}"


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
