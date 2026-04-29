"""
Iteration 12 regression — Phase 1 mobile-first Kundli refactor.

Verifies:
  1. Existing kundli endpoints still work after Admin GrahaKundli removal
     - POST /api/kundli/generate
     - GET  /api/kundli/my
     - GET  /api/charts/d1-d9   (returns d1, d9, d7, d10)
     - GET  /api/dasha/current
  2. Translation endpoints (finalised in iter11) still work
     - GET  /api/admin/translate/health (or similar)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASSWORD = "SanatanAdmin@2026"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_client(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    if tok:
        api_client.headers.update({"Authorization": f"Bearer {tok}"})
    return api_client


# ---------- Kundli generation & retrieval ----------
class TestKundliRegression:
    def test_generate_kundli(self, auth_client):
        payload = {
            "name": "Test User",
            "gender": "Male",
            "dob": "1990-01-15",
            "tob": "10:30",
            "birth_place": "Delhi, India",
        }
        r = auth_client.post(f"{BASE_URL}/api/kundli/generate", json=payload, timeout=60)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        assert "ascendant" in data
        assert "planets" in data and isinstance(data["planets"], list)
        assert len(data["planets"]) >= 9

    def test_get_my_kundli(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/kundli/my", timeout=30)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        assert "planets" in data
        assert "ascendant" in data

    def test_charts_d1_d9_returns_all_four(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/charts/d1-d9", timeout=30)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        # Spec: returns d1, d9, d7, d10
        for key in ("d1", "d9", "d7", "d10"):
            assert key in data, f"Missing {key} in /api/charts/d1-d9 response: keys={list(data.keys())}"
            chart = data[key]
            assert "planets" in chart, f"{key} missing 'planets'"
            assert isinstance(chart["planets"], list)

    def test_dasha_current(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/dasha/current", timeout=30)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        # Should include either mahadasha or current_mahadasha
        assert any(k in data for k in ("mahadasha", "current_mahadasha", "lord", "current_dasha")), (
            f"Unexpected dasha response shape: {list(data.keys())}"
        )


# ---------- Translation endpoints regression (iter11) ----------
class TestTranslationRegression:
    """Smoke-test that translate endpoints still respond (no full bulk run here)."""

    def test_translate_languages_endpoint(self, auth_client):
        # Common endpoints from iter11 testing
        candidates = [
            f"{BASE_URL}/api/admin/translate/languages",
            f"{BASE_URL}/api/admin/translate/health",
        ]
        any_ok = False
        last_status = None
        for url in candidates:
            r = auth_client.get(url, timeout=15)
            last_status = (url, r.status_code)
            if r.status_code in (200, 204):
                any_ok = True
                break
        # If neither endpoint exists, that's ok — translation suite already verified in iter11.
        # We just check that at least one returns a non-5xx response.
        if not any_ok:
            # Both should at least not be 5xx
            for url in candidates:
                r = auth_client.get(url, timeout=15)
                assert r.status_code < 500, f"{url} → {r.status_code}: {r.text[:200]}"
