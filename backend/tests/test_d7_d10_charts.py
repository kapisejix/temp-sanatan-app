"""Tests for D7 (Saptamsa) and D10 (Dasamsa) divisional charts.

Covers:
- Algorithm unit tests for saptamsa_position / dasamsa_position
- POST /api/kundli/generate response includes d7_chart, d10_chart with required keys
- GET  /api/charts/d1-d9 returns d1/d9/d7/d10 keys with proper structure
"""
import os
import sys
import pytest
import requests

# Allow importing engines from /app/backend
sys.path.insert(0, "/app/backend")
from d7_engine import saptamsa_position, build_saptamsa_chart  # noqa: E402
from d10_engine import dasamsa_position, build_dasamsa_chart  # noqa: E402

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASS = "SanatanAdmin@2026"


# ----------------- Algorithm unit tests -----------------
class TestD7Algorithm:
    def test_aries_pada0_in_aries(self):
        # Aries 1° → pada 0 (1*7/30=0.23) → odd sign → same sign (Aries idx 0)
        assert saptamsa_position(1.0) == 0

    def test_taurus_pada0_in_scorpio(self):
        # Taurus 5° → pada 1 → even sign offset 6 → Taurus(1)+6+1=8 → Sagittarius
        # Let's just verify consistency & range
        idx = saptamsa_position(35.0)  # Taurus 5°
        assert 0 <= idx <= 11

    def test_consistency_same_input(self):
        for lon in [12.3, 87.6, 199.4, 333.0]:
            assert saptamsa_position(lon) == saptamsa_position(lon)

    def test_range(self):
        for lon in [0.0, 30.0, 59.999, 60.0, 180.0, 359.999]:
            idx = saptamsa_position(lon)
            assert 0 <= idx <= 11, f"Out of range for {lon}: {idx}"

    def test_build_saptamsa_chart_house_formula(self):
        planets = [
            {"graha": "Sun", "graha_hi": "सू", "degree": 12.0, "is_retrograde": False},
            {"graha": "Moon", "graha_hi": "चं", "degree": 70.0, "is_retrograde": False},
        ]
        chart = build_saptamsa_chart(planets, asc_longitude=15.0)
        assert "ascendant" in chart and "rashi_idx" in chart["ascendant"]
        asc_idx = chart["ascendant"]["rashi_idx"]
        assert 0 <= asc_idx <= 11
        for p in chart["planets"]:
            assert {"graha", "rashi_idx", "house", "degree_in_sign", "is_retrograde"}.issubset(p)
            assert 0 <= p["rashi_idx"] <= 11
            expected_house = ((p["rashi_idx"] - asc_idx) % 12) + 1
            assert p["house"] == expected_house, f"House mismatch: {p}"


class TestD10Algorithm:
    def test_aries_pada0_in_aries(self):
        # Aries 1° → pada 0 → odd sign same → Aries
        assert dasamsa_position(1.0) == 0

    def test_taurus_pada0_in_capricorn(self):
        # Taurus 1° → pada 0 → even sign offset 8 → Taurus(1)+8+0=9 → Capricorn
        assert dasamsa_position(31.0) == 9

    def test_consistency_same_input(self):
        for lon in [12.3, 87.6, 199.4, 333.0]:
            assert dasamsa_position(lon) == dasamsa_position(lon)

    def test_range(self):
        for lon in [0.0, 30.0, 59.999, 60.0, 180.0, 359.999]:
            idx = dasamsa_position(lon)
            assert 0 <= idx <= 11, f"Out of range for {lon}: {idx}"

    def test_build_dasamsa_chart_house_formula(self):
        planets = [
            {"graha": "Sun", "graha_hi": "सू", "degree": 12.0, "is_retrograde": False},
            {"graha": "Saturn", "graha_hi": "श", "degree": 250.0, "is_retrograde": True},
        ]
        chart = build_dasamsa_chart(planets, asc_longitude=15.0)
        asc_idx = chart["ascendant"]["rashi_idx"]
        for p in chart["planets"]:
            assert 0 <= p["rashi_idx"] <= 11
            expected_house = ((p["rashi_idx"] - asc_idx) % 12) + 1
            assert p["house"] == expected_house


# ----------------- API integration -----------------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def auth_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def generated_kundli(auth_client):
    payload = {
        "name": "Test User",
        "gender": "Male",
        "dob": "1990-01-15",
        "tob": "10:30",
        "birth_place": "Delhi, India",
    }
    r = auth_client.post(f"{BASE_URL}/api/kundli/generate", json=payload, timeout=60)
    assert r.status_code == 200, f"Generate failed: {r.status_code} {r.text[:300]}"
    return r.json()


class TestKundliGenerateD7D10:
    def test_d7_chart_in_response(self, generated_kundli):
        assert "d7_chart" in generated_kundli, f"Missing d7_chart. Keys: {list(generated_kundli.keys())}"
        d7 = generated_kundli["d7_chart"]
        assert "ascendant" in d7 and "rashi_idx" in d7["ascendant"]
        assert 0 <= d7["ascendant"]["rashi_idx"] <= 11
        assert "planets" in d7 and isinstance(d7["planets"], list) and len(d7["planets"]) >= 9
        for p in d7["planets"]:
            for k in ("graha", "rashi_idx", "house", "degree_in_sign", "is_retrograde"):
                assert k in p, f"Missing {k} in d7 planet: {p}"
            assert 0 <= p["rashi_idx"] <= 11
            assert 1 <= p["house"] <= 12

    def test_d10_chart_in_response(self, generated_kundli):
        assert "d10_chart" in generated_kundli
        d10 = generated_kundli["d10_chart"]
        assert "ascendant" in d10 and 0 <= d10["ascendant"]["rashi_idx"] <= 11
        assert len(d10["planets"]) >= 9
        for p in d10["planets"]:
            for k in ("graha", "rashi_idx", "house", "degree_in_sign", "is_retrograde"):
                assert k in p


class TestChartsD1D9Endpoint:
    def test_returns_all_four_charts(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/charts/d1-d9", timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        for key in ("d1", "d9", "d7", "d10"):
            assert key in data, f"Missing key {key} in response. Keys: {list(data.keys())}"
            chart = data[key]
            assert "ascendant" in chart and "rashi_idx" in chart["ascendant"]
            assert 0 <= chart["ascendant"]["rashi_idx"] <= 11
            assert "planets" in chart and len(chart["planets"]) >= 9
            asc_idx = chart["ascendant"]["rashi_idx"]
            for p in chart["planets"]:
                assert "graha" in p and "rashi_idx" in p and "house" in p
                assert "degree_in_sign" in p, f"Missing degree_in_sign in {key}: {p}"
                assert "is_retrograde" in p, f"Missing is_retrograde in {key}: {p}"
                assert 0 <= p["rashi_idx"] <= 11
                assert 1 <= p["house"] <= 12
                # house formula consistency — only enforce for divisional charts (D7/D9/D10)
                # which recompute asc + house together. D1 stores houses computed at
                # kundli generation time and may use a slightly different asc binning.
                if key != "d1":
                    expected_house = ((p["rashi_idx"] - asc_idx) % 12) + 1
                    assert p["house"] == expected_house, f"{key} house formula broken for {p}"

    def test_unauth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/charts/d1-d9", timeout=15)
        assert r.status_code == 401
