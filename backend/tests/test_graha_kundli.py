"""
Backend tests: Kundli, Graha scoring, Mantra recommendations, TTS, Notifications.
Covers endpoints under /api/kundli, /api/graha, /api/recommendations, /api/mantras,
/api/tts, /api/notifications.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://integrated-platform-13.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASSWORD = "SanatanAdmin@2026"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/admin/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    })
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    if not tok:
        # Some APIs rely on cookies; return session cookies
        return None
    return tok


@pytest.fixture(scope="session")
def auth_client(api_client, auth_token):
    if auth_token:
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ---------- Kundli ----------
class TestKundli:
    def test_generate_kundli(self, auth_client):
        payload = {
            "name": "Test User",
            "gender": "Male",
            "dob": "1990-08-15",
            "tob": "10:30",
            "birth_place": "Delhi, India"
        }
        r = auth_client.post(f"{BASE_URL}/api/kundli/generate", json=payload, timeout=60)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:400]}"
        data = r.json()
        assert "ascendant" in data
        assert "planets" in data
        assert "graha_scores" in data
        assert "recommendations" in data
        # planets should include 9 (Sun..Saturn + Rahu/Ketu)
        grahas = [p["graha"] for p in data["planets"]]
        for g in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]:
            assert g in grahas, f"Missing graha {g}"
        # Ascendant has rashi
        assert "rashi" in data["ascendant"]
        # graha_scores has 9 entries
        assert len(data["graha_scores"]) == 9
        pytest.kundli_id = None  # will be set by my_kundli test

    def test_my_kundli(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/kundli/my", timeout=30)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        data = r.json()
        # Should have kundli now
        assert data.get("kundli") is not None or "planets" in data, f"No kundli in response: {data}"

    def test_graha_score_recompute(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/graha/score", json={}, timeout=30)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert "graha_scores" in data
        assert len(data["graha_scores"]) == 9
        for s in data["graha_scores"]:
            assert "priority" in s
            assert s["priority"] in ["HIGH", "MEDIUM", "LOW"]
            assert 0 <= s["score"] <= 100


# ---------- Recommendations & Mantras ----------
class TestRecommendations:
    def test_mantra_recommendations(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/recommendations/mantra", timeout=30)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert "recommendations" in data
        # May be empty - that's ok
        assert isinstance(data["recommendations"], list)

    def test_all_mantras(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/mantras/all", timeout=30)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 9, f"Expected 9 mantras, got {len(data)}"
        grahas = {m["graha"] for m in data}
        expected = {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"}
        assert grahas == expected, f"Missing: {expected - grahas}"
        # Multilingual
        for m in data:
            assert "mantra" in m and "mantra_en" in m
            assert "devta_hi" in m


# ---------- Notifications ----------
class TestNotifications:
    def test_today_notifications(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/notifications/today", timeout=30)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert "notifications" in data or isinstance(data, dict)
        notifs = data.get("notifications", data if isinstance(data, list) else [])
        # Day-based notification always present
        day_based = [n for n in notifs if n.get("type") == "day_based"]
        assert len(day_based) >= 1, f"No day_based notif: {notifs}"
        n = day_based[0]
        # multilingual fields
        assert "title_hi" in n and "title_en" in n
        assert "mantra" in n and "mantra_en" in n
        # graha mapped correctly
        from datetime import datetime, timezone
        weekday = datetime.now(timezone.utc).weekday()
        day_to_graha = {0: "Moon", 1: "Mars", 2: "Mercury", 3: "Jupiter", 4: "Venus", 5: "Saturn", 6: "Sun"}
        expected_graha = day_to_graha[weekday]
        assert n["graha"] == expected_graha, f"Expected {expected_graha}, got {n['graha']}"


# ---------- TTS ----------
class TestTTS:
    def test_tts_providers(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/tts/providers", timeout=30)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert "providers" in data
        assert set(data["providers"]) == {"google", "openai", "elevenlabs"}
        assert "languages" in data
        assert len(data["languages"]) == 12, f"Expected 12 languages, got {len(data['languages'])}"

    def test_tts_synthesize_no_creds_graceful(self, auth_client):
        # Expected: 400 with helpful message (google creds not configured)
        r = auth_client.post(f"{BASE_URL}/api/tts/synthesize",
                             json={"text": "ॐ नमः शिवाय", "language": "hi"}, timeout=30)
        # Should fail gracefully - 400 with message
        assert r.status_code in [400, 500], f"Expected 400/500, got {r.status_code}: {r.text[:300]}"
        data = r.json()
        detail = data.get("detail", "")
        assert "Google" in detail or "not configured" in detail or "TTS" in detail, \
            f"Expected helpful message, got: {detail}"
