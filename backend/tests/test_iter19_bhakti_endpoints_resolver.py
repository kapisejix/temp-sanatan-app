"""Iteration 19 — RETEST that PUT/PATCH/DELETE /api/bhakti/items/:id work
when the item lives in `content_items` (not `bhakti_items`).

User feedback: deleting the Hanuman Chalisa returned 404 because
/api/bhakti/items/:id only looked in `bhakti_items`. The resolver
_resolve_item_collections now also drives PUT, PATCH /status, DELETE on
this surface.

We use a *throwaway* item created via POST /api/content/items so we can
DELETE it at the end without touching real data (Hanuman Chalisa).
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
ADMIN_EMAIL = "admin@sanatansaathi.com"
ADMIN_PASS = "SanatanAdmin@2026"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    token = r.json().get("access_token") or r.json().get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    s.headers.update({"Accept": "application/json"})
    return s


@pytest.fixture(scope="module")
def throwaway_item(session):
    """Create a content_items doc we can mutate/delete via /bhakti/items/:id."""
    payload = {
        "category": "chalisa",
        "title_hi": f"TEST_iter19_{int(time.time())}",
        "title_en": f"TEST_iter19_{int(time.time())}",
        "deity": "TestDeity",
        "supported_languages": ["hi", "en"],
    }
    r = session.post(f"{BASE_URL}/api/content/items", json=payload)
    assert r.status_code in (200, 201), f"create failed: {r.status_code} {r.text}"
    item_id = r.json().get("_id") or r.json().get("id")
    assert item_id
    yield item_id
    # Best-effort cleanup if any test left it around (DELETE is idempotent here)
    try:
        session.delete(f"{BASE_URL}/api/bhakti/items/{item_id}")
    except Exception:
        pass


# ------------------------------------------------------------------
# 1. PUT /api/bhakti/items/:id on a content_items doc must update
#    content_items (NOT 404, NOT silently no-op).
# ------------------------------------------------------------------
def test_put_bhakti_item_updates_content_items(session, throwaway_item):
    new_title = f"TEST_iter19_updated_{int(time.time())}"
    r = session.put(
        f"{BASE_URL}/api/bhakti/items/{throwaway_item}",
        json={"title_hi": new_title},
    )
    assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("title_hi") == new_title

    # Verify persisted via GET on /content/items/:id (also resolver-aware)
    g = session.get(f"{BASE_URL}/api/content/items/{throwaway_item}")
    assert g.status_code == 200
    assert g.json().get("title_hi") == new_title


# ------------------------------------------------------------------
# 2. PATCH /api/bhakti/items/:id/status on a content_items doc must
#    update its status (was previously a no-op since it only matched
#    bhakti_items).
# ------------------------------------------------------------------
def test_patch_status_on_content_items_doc(session, throwaway_item):
    r = session.patch(
        f"{BASE_URL}/api/bhakti/items/{throwaway_item}/status",
        json={"status": "archived"},
    )
    assert r.status_code == 200, f"PATCH failed: {r.status_code} {r.text}"
    assert r.json().get("status") == "archived"

    # round-trip
    g = session.get(f"{BASE_URL}/api/content/items/{throwaway_item}")
    assert g.status_code == 200
    assert g.json().get("status") == "archived"


# ------------------------------------------------------------------
# 3. DELETE /api/bhakti/items/:id on a content_items doc must succeed
#    with 200 (was 404 — the original bug).
# ------------------------------------------------------------------
def test_delete_bhakti_item_on_content_items_doc(session, throwaway_item):
    r = session.delete(f"{BASE_URL}/api/bhakti/items/{throwaway_item}")
    assert r.status_code == 200, f"DELETE failed: {r.status_code} {r.text}"
    assert r.json().get("success") is True

    # And it should now be gone
    g = session.get(f"{BASE_URL}/api/content/items/{throwaway_item}")
    assert g.status_code == 404


# ------------------------------------------------------------------
# 4. DELETE on a non-existent id should 404 (regression safety).
# ------------------------------------------------------------------
def test_delete_unknown_id_returns_404(session):
    fake_id = "0" * 24
    r = session.delete(f"{BASE_URL}/api/bhakti/items/{fake_id}")
    assert r.status_code == 404
