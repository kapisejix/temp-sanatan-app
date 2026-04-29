"""
Iteration 14 backend tests: Mobile JWT auth, Pratyantardasha, Yoga engine,
cross-token isolation, and admin regression. (Session 13 features)
"""
import os
import uuid
import time
import pytest
import requests
from datetime import datetime

def _load_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url
    # Fallback: read from frontend/.env
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")

BASE = _load_url().rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASSWORD = "SanatanAdmin@2026"


# ------------- Fixtures -------------

@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
               timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    d = r.json()
    tok = d.get("access_token") or d.get("token")
    assert tok, f"no token in admin login response: {d}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def fresh_user(s):
    """Create a fresh mobile user via signup and return its data + token."""
    email = f"test_iter14_{uuid.uuid4().hex[:8]}@sanatansaathi.com"
    pw = "Test@1234"
    r = s.post(f"{API}/auth/mobile/signup",
               json={"email": email, "password": pw, "name": "Test Iter14"},
               timeout=15)
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text[:200]}"
    d = r.json()
    return {"email": email, "password": pw, "token": d["token"], "user": d["user"]}


@pytest.fixture(scope="module")
def user_headers(fresh_user):
    return {"Authorization": f"Bearer {fresh_user['token']}"}


# ===================== MOBILE SIGNUP =====================

class TestMobileSignup:
    def test_signup_success_returns_token_and_user(self, fresh_user):
        assert fresh_user["token"] and isinstance(fresh_user["token"], str)
        u = fresh_user["user"]
        assert u["email"] == fresh_user["email"]
        assert u["role"] == "user"
        assert u["name"] == "Test Iter14"

    def test_signup_duplicate_email_409(self, s, fresh_user):
        r = s.post(f"{API}/auth/mobile/signup",
                   json={"email": fresh_user["email"], "password": "Test@1234", "name": "Dup"},
                   timeout=15)
        assert r.status_code == 409, f"expected 409, got {r.status_code}: {r.text[:200]}"

    def test_signup_invalid_email_400(self, s):
        r = s.post(f"{API}/auth/mobile/signup",
                   json={"email": "not-an-email", "password": "Test@1234", "name": "Bad"},
                   timeout=10)
        assert r.status_code == 400

    def test_signup_short_password_400(self, s):
        r = s.post(f"{API}/auth/mobile/signup",
                   json={"email": f"x{uuid.uuid4().hex[:6]}@test.com", "password": "abc", "name": "X"},
                   timeout=10)
        assert r.status_code == 400

    def test_signup_short_name_400(self, s):
        r = s.post(f"{API}/auth/mobile/signup",
                   json={"email": f"x{uuid.uuid4().hex[:6]}@test.com", "password": "Test@1234", "name": "A"},
                   timeout=10)
        assert r.status_code == 400


# ===================== MOBILE LOGIN =====================

class TestMobileLogin:
    def test_login_valid_creds(self, s, fresh_user):
        r = s.post(f"{API}/auth/mobile/login",
                   json={"email": fresh_user["email"], "password": fresh_user["password"]},
                   timeout=15)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d["token"]
        assert d["user"]["role"] == "user"
        assert d["user"]["email"] == fresh_user["email"]

    def test_login_wrong_password_401(self, s, fresh_user):
        r = s.post(f"{API}/auth/mobile/login",
                   json={"email": fresh_user["email"], "password": "WrongPass!1"},
                   timeout=10)
        assert r.status_code == 401

    def test_brute_force_lockout_429(self, s):
        """5 failed attempts → 429 lockout. Use a unique email to avoid polluting real user."""
        email = f"bf_{uuid.uuid4().hex[:8]}@sanatansaathi.com"
        # signup so user exists (wrong password attempts then triggers lockout)
        rs = s.post(f"{API}/auth/mobile/signup",
                    json={"email": email, "password": "Right@1234", "name": "BFTest"}, timeout=15)
        assert rs.status_code == 200
        statuses = []
        for _ in range(6):
            r = s.post(f"{API}/auth/mobile/login",
                       json={"email": email, "password": "Wrong@1234"}, timeout=10)
            statuses.append(r.status_code)
        assert 429 in statuses, f"expected 429 in lockout sequence, got {statuses}"
        # next attempt with right password should still be 429
        r = s.post(f"{API}/auth/mobile/login",
                   json={"email": email, "password": "Right@1234"}, timeout=10)
        assert r.status_code == 429, f"expected lockout to persist, got {r.status_code}"


# ===================== MOBILE /me + /logout =====================

class TestMobileMeAndLogout:
    def test_me_with_user_token(self, s, fresh_user, user_headers):
        r = s.get(f"{API}/auth/mobile/me", headers=user_headers, timeout=10)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d["email"] == fresh_user["email"]
        assert d["role"] == "user"

    def test_me_rejects_admin_token(self, s, admin_headers):
        r = s.get(f"{API}/auth/mobile/me", headers=admin_headers, timeout=10)
        assert r.status_code == 401, f"admin token should be rejected on /mobile/me, got {r.status_code}"

    def test_me_no_token_401(self, s):
        r = s.get(f"{API}/auth/mobile/me", timeout=10)
        assert r.status_code == 401

    def test_logout_blacklists_token(self, s):
        # Use clean session — shared `s` retains admin access_token cookie from earlier admin login
        # fixture which would (correctly) override the Bearer header in get_current_app_user.
        cs = requests.Session()
        # Create an isolated user just for logout
        email = f"logout_{uuid.uuid4().hex[:8]}@sanatansaathi.com"
        rs = cs.post(f"{API}/auth/mobile/signup",
                     json={"email": email, "password": "Test@1234", "name": "Logout User"},
                     timeout=15)
        assert rs.status_code == 200
        tok = rs.json()["token"]
        h = {"Authorization": f"Bearer {tok}"}
        # /me works
        assert cs.get(f"{API}/auth/mobile/me", headers=h, timeout=10).status_code == 200
        # logout
        rl = cs.post(f"{API}/auth/mobile/logout", headers=h, timeout=10)
        assert rl.status_code == 200
        # /me should now be 401
        rm = cs.get(f"{API}/auth/mobile/me", headers=h, timeout=10)
        assert rm.status_code == 401


# ===================== CROSS-TOKEN ISOLATION =====================

class TestCrossToken:
    def test_admin_token_can_access_admin_me(self, s, admin_headers):
        r = s.get(f"{API}/auth/me", headers=admin_headers, timeout=10)
        # admin-aware /me should accept admin token
        assert r.status_code == 200, f"admin /auth/me failed: {r.status_code} {r.text[:200]}"

    def test_user_token_can_call_kundli_generate(self, s, user_headers):
        payload = {
            "name": "TestIter14User",
            "gender": "male",
            "dob": "1990-01-15",
            "tob": "10:30",
            "birth_place": "Delhi, India",
        }
        r = s.post(f"{API}/kundli/generate", json=payload, headers=user_headers, timeout=45)
        assert r.status_code == 200, f"user kundli/generate failed: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert "planets" in d or "ascendant" in d or d.get("success")

    def test_user_token_can_call_kundli_my(self, s, user_headers):
        r = s.get(f"{API}/kundli/my", headers=user_headers, timeout=20)
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:200]}"

    def test_user_token_can_call_charts_d1_d9(self, s, user_headers):
        r = s.get(f"{API}/charts/d1-d9", headers=user_headers, timeout=20)
        assert r.status_code == 200, r.text[:200]

    def test_user_token_can_call_dasha_current(self, s, user_headers):
        r = s.get(f"{API}/dasha/current", headers=user_headers, timeout=20)
        assert r.status_code == 200, r.text[:200]

    def test_user_token_can_call_yogas(self, s, user_headers):
        r = s.get(f"{API}/yogas", headers=user_headers, timeout=20)
        assert r.status_code == 200, r.text[:200]


# ===================== PRATYANTARDASHA =====================

class TestPratyantardasha:
    def test_dasha_current_returns_pratyantardasha(self, s, user_headers):
        r = s.get(f"{API}/dasha/current", headers=user_headers, timeout=20)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        cd = d.get("current_dasha")
        assert cd, "current_dasha missing"
        assert "mahadasha" in cd and "antardasha" in cd and "pratyantardasha" in cd
        assert "pratyantardashas" in cd
        assert isinstance(cd["pratyantardashas"], list)
        assert len(cd["pratyantardashas"]) == 9, f"expected 9 PDs, got {len(cd['pratyantardashas'])}"

    def test_pd_window_contains_now(self, s, user_headers):
        r = s.get(f"{API}/dasha/current", headers=user_headers, timeout=20).json()
        cd = r["current_dasha"]
        as_of = cd["as_of"]
        # Find the matched current PD
        cur_pd = cd["pratyantardasha"]
        assert cur_pd, "no current PD selected"
        assert cur_pd["start"] <= as_of < cur_pd["end"], \
            f"now {as_of} not within PD window {cur_pd['start']}..{cur_pd['end']}"

    def test_pd_durations_sum_matches_ad_years(self, s, user_headers):
        """Sum of 9 PDs ≈ AD years (within 0.05y rounding)."""
        r = s.get(f"{API}/dasha/current", headers=user_headers, timeout=20).json()
        cd = r["current_dasha"]
        ad_years = cd["antardasha"]["years"]
        pd_sum = sum(pd["years"] for pd in cd["pratyantardashas"])
        assert abs(pd_sum - ad_years) < 0.05, f"PD sum {pd_sum} vs AD {ad_years}"

    def test_pd_starts_with_ad_planet(self, s, user_headers):
        r = s.get(f"{API}/dasha/current", headers=user_headers, timeout=20).json()
        cd = r["current_dasha"]
        ad_planet = cd["antardasha"]["planet"]
        first_pd = cd["pratyantardashas"][0]["planet"]
        assert first_pd == ad_planet, f"first PD {first_pd} should equal AD planet {ad_planet}"


# ===================== YOGA ENGINE =====================

class TestYogaEngine:
    def test_yogas_returns_5_canonical(self, s, user_headers):
        r = s.get(f"{API}/yogas", headers=user_headers, timeout=20)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert "yogas" in d and "summary" in d
        assert len(d["yogas"]) == 5, f"expected 5 yogas, got {len(d['yogas'])}"
        names_en = {y["name_en"] for y in d["yogas"]}
        expected = {"Raj Yoga", "Dhan Yoga", "Gaj Kesari Yoga", "Chandra Mangal Yoga", "Neech Bhang Raj Yoga"}
        assert names_en == expected, f"got {names_en}"

    def test_yoga_item_shape(self, s, user_headers):
        r = s.get(f"{API}/yogas", headers=user_headers, timeout=20).json()
        for y in r["yogas"]:
            for k in ["name", "name_en", "status", "strength", "planets", "planets_hi", "description"]:
                assert k in y, f"missing {k} in {y}"
            assert y["strength"] in ("low", "medium", "high")
            assert isinstance(y["status"], bool)

    def test_yoga_summary_consistency(self, s, user_headers):
        r = s.get(f"{API}/yogas", headers=user_headers, timeout=20).json()
        present = sum(1 for y in r["yogas"] if y["status"])
        assert r["summary"]["total_present"] == present
        assert r["summary"]["total_checked"] == 5


# ===================== YOGA ENGINE — UNIT TESTS (synthetic) =====================
# Direct call into yoga_engine to verify rule correctness
import sys
sys.path.insert(0, "/app/backend")
from yoga_engine import (  # noqa: E402
    detect_raj_yoga, detect_dhan_yoga, detect_gaj_kesari_yoga,
    detect_chandra_mangal_yoga, detect_neech_bhang_raj_yoga,
    detect_all_yogas, _strength_bucket, _planet_status,
)


def _planet(graha, house, rashi_idx, retro=False):
    return {"graha": graha, "house": house, "rashi_idx": rashi_idx, "is_retrograde": retro}


class TestYogaUnit:
    def test_strength_bucket_exalted_promotes(self):
        # exalted Sun (sign 0) — flags
        b = _strength_bucket([{"exalted": True}])
        assert b == "medium"  # score=3 → not >=4 → medium

        # exalted + own_sign → 5 → high
        b2 = _strength_bucket([{"exalted": True}, {"own_sign": True}])
        assert b2 == "high"

    def test_strength_bucket_debilitated_demotes(self):
        # exalted (3) + debilitated (-3) → 0 → low
        b = _strength_bucket([{"exalted": True}, {"debilitated": True}])
        assert b == "low"

    def test_planet_status_combust_when_with_sun(self):
        p = {"graha": "Mercury", "house": 5, "rashi_idx": 0}
        flags = _planet_status(p, sun_house=5)
        assert flags["combust"] is True

    def test_gaj_kesari_jupiter_kendra_from_moon(self):
        # Aries asc; Moon h1 sign0, Jupiter h4 sign3 — diff=4 → kendra
        planets = [
            _planet("Moon", 1, 0),
            _planet("Jupiter", 4, 3),  # exalted (sign 3 = Cancer)
        ]
        out = detect_gaj_kesari_yoga(planets)
        assert len(out) == 1
        assert out[0]["status"] is True
        # Jupiter exalted → at least medium
        assert out[0]["strength"] in ("medium", "high")

    def test_gaj_kesari_negative_when_jupiter_in_3rd_from_moon(self):
        planets = [
            _planet("Moon", 1, 0),
            _planet("Jupiter", 3, 2),
        ]
        out = detect_gaj_kesari_yoga(planets)
        assert out == []

    def test_chandra_mangal_conjunct(self):
        planets = [
            _planet("Moon", 5, 4),
            _planet("Mars", 5, 4),
        ]
        out = detect_chandra_mangal_yoga(planets)
        assert len(out) == 1 and out[0]["status"] is True

    def test_chandra_mangal_negative(self):
        planets = [
            _planet("Moon", 5, 4),
            _planet("Mars", 6, 5),
        ]
        assert detect_chandra_mangal_yoga(planets) == []

    def test_raj_yoga_kendra_trikona_conjunction(self):
        # Aries ascendant (idx 0): K-lords 1=Mars,4=Moon,7=Venus,10=Saturn;
        # Trikona: 1=Mars,5=Sun,9=Jupiter
        # Make Saturn (10th lord) and Jupiter (9th lord) conjunct in house 5.
        planets = [
            _planet("Saturn", 5, 4),  # 10th lord
            _planet("Jupiter", 5, 4),  # 9th lord — Sagittarius? sign4 ok
            _planet("Sun", 1, 0),
            _planet("Moon", 2, 1),
            _planet("Mars", 3, 2),
            _planet("Venus", 4, 3),
            _planet("Mercury", 6, 5),
        ]
        out = detect_raj_yoga(planets, asc_rashi_idx=0)
        assert len(out) >= 1
        assert all(y["status"] for y in out)

    def test_dhan_yoga_2nd_11th_lord_conjunction(self):
        # Aries asc: 2nd lord = Venus (sign1 Taurus), 11th lord = Saturn (sign10 Aquarius)
        planets = [
            _planet("Venus", 7, 6),
            _planet("Saturn", 7, 6),
            _planet("Sun", 1, 0),
            _planet("Moon", 2, 1),
            _planet("Mars", 3, 2),
            _planet("Mercury", 4, 3),
            _planet("Jupiter", 5, 4),
        ]
        out = detect_dhan_yoga(planets, asc_rashi_idx=0)
        assert len(out) == 1 and out[0]["status"] is True

    def test_neech_bhang_raj_sign_lord_in_kendra(self):
        # Aries asc. Sun debilitated in Libra (sign 6). Sign lord = Venus.
        # Place Venus in house 4 (kendra) → cancels debilitation.
        planets = [
            _planet("Sun", 7, 6),    # debilitated
            _planet("Venus", 4, 3),  # in kendra
            _planet("Moon", 1, 0),
            _planet("Mars", 2, 1),
            _planet("Mercury", 3, 2),
            _planet("Jupiter", 5, 4),
            _planet("Saturn", 6, 5),
        ]
        out = detect_neech_bhang_raj_yoga(planets, asc_rashi_idx=0)
        assert len(out) == 1 and out[0]["status"] is True

    def test_detect_all_yogas_canonical_5_with_negatives(self):
        # No yogas at all
        planets = [
            _planet("Sun", 1, 0), _planet("Moon", 2, 1),
            _planet("Mars", 3, 2), _planet("Mercury", 6, 5),
            _planet("Jupiter", 8, 7), _planet("Venus", 11, 10),
            _planet("Saturn", 12, 11),
        ]
        out = detect_all_yogas(planets, {"rashi_idx": 0})
        assert len(out["yogas"]) == 5
        assert out["summary"]["total_checked"] == 5


# ===================== ADMIN REGRESSION =====================

class TestAdminRegression:
    def test_admin_login(self, s):
        r = s.post(f"{API}/auth/admin/login",
                   json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200

    def test_admin_charts_d1_d9(self, s, admin_headers):
        r = s.get(f"{API}/charts/d1-d9", headers=admin_headers, timeout=20)
        assert r.status_code in (200, 404)  # 404 only if admin has no kundli

    def test_admin_yogas(self, s, admin_headers):
        r = s.get(f"{API}/yogas", headers=admin_headers, timeout=20)
        assert r.status_code in (200, 404)
