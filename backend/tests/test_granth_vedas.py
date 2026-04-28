"""Backend tests for Granth + Vedas endpoints used by Sanatan Saathi mobile app.

These endpoints are consumed by /app/expo-app/src/screens/v2/Granth*.js and
/app/expo-app/src/screens/v2/Veda*.js via /app/expo-app/src/api/client.js.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


# ===================== GRANTH =====================

class TestGranthEndpoints:
    """Granth book hierarchy used by GranthListScreen / GranthChaptersScreen / GranthVersesScreen."""

    def test_granth_books_returns_three(self, session):
        r = session.get(f"{API}/granth/books", timeout=20)
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
        data = r.json()
        # Either a list or {books: [...]}
        books = data if isinstance(data, list) else data.get("books") or data.get("items") or []
        assert isinstance(books, list)
        assert len(books) >= 3, f"expected >=3 books, got {len(books)}: {books}"
        # Validate structure
        names_lower = " ".join(
            (b.get("title_en", "") + " " + b.get("name_en", "") + " " + b.get("title", "") +
             " " + b.get("title_hi", "") + " " + b.get("name", "")).lower()
            for b in books
        )
        # accept Bhagavad Gita, Ramayana/Ramcharitmanas, Mahabharata
        assert "gita" in names_lower, f"expected 'gita' in book names, got: {names_lower}"
        assert ("ramayan" in names_lower) or ("ramcharitmanas" in names_lower) or ("रामचरितमानस" in names_lower), \
            f"expected ramayana/ramcharitmanas in book names, got: {names_lower}"
        assert "mahabharat" in names_lower, f"expected 'mahabharat' in book names, got: {names_lower}"

    def test_granth_hierarchy_first_book(self, session):
        r = session.get(f"{API}/granth/books", timeout=20)
        assert r.status_code == 200
        data = r.json()
        books = data if isinstance(data, list) else data.get("books") or data.get("items") or []
        assert books, "no books"
        first = books[0]
        book_id = first.get("id") or first.get("_id") or first.get("book_id")
        assert book_id, f"no id on first book: {first}"

        rh = session.get(f"{API}/granth/hierarchy/{book_id}", timeout=20)
        assert rh.status_code == 200, f"got {rh.status_code}: {rh.text[:300]}"
        h = rh.json()
        chapters = h if isinstance(h, list) else h.get("chapters") or h.get("items") or []
        assert isinstance(chapters, list) and len(chapters) > 0, f"chapters empty: {h}"
        ch0 = chapters[0]
        # Required fields used by GranthChaptersScreen
        assert ("chapter_num" in ch0) or ("chapterNumber" in ch0) or ("number" in ch0), f"chapter_num missing: {ch0}"
        assert ("title_hi" in ch0) or ("title" in ch0) or ("name_hi" in ch0), f"title_hi missing: {ch0}"
        assert ("verse_count" in ch0) or ("verses_count" in ch0) or ("count" in ch0), f"verse_count missing: {ch0}"

    def test_granth_chapter_verses(self, session):
        r = session.get(f"{API}/granth/books", timeout=20)
        data = r.json()
        books = data if isinstance(data, list) else data.get("books") or data.get("items") or []
        first = books[0]
        book_id = first.get("id") or first.get("_id") or first.get("book_id")
        rh = session.get(f"{API}/granth/hierarchy/{book_id}", timeout=20).json()
        chapters = rh if isinstance(rh, list) else rh.get("chapters") or rh.get("items") or []
        ch0 = chapters[0]
        chapter_id = ch0.get("id") or ch0.get("_id") or ch0.get("chapter_id")
        assert chapter_id, f"no chapter_id: {ch0}"

        rv = session.get(f"{API}/granth/chapter-verses/{chapter_id}?lang=hi", timeout=30)
        assert rv.status_code == 200, f"got {rv.status_code}: {rv.text[:300]}"
        v = rv.json()
        verses = v if isinstance(v, list) else v.get("verses") or v.get("items") or []
        assert isinstance(verses, list) and len(verses) > 0, f"verses empty: {v}"
        v0 = verses[0]
        # Sanskrit field check
        assert ("sanskrit" in v0) or ("text_sa" in v0) or ("verse" in v0) or ("text" in v0), f"sanskrit missing: {v0}"
        # Meaning structure (meaning.hi or display_meaning)
        has_meaning = (
            isinstance(v0.get("meaning"), dict) and "hi" in v0["meaning"]
        ) or ("display_meaning" in v0) or ("meaning_hi" in v0) or ("translation" in v0)
        assert has_meaning, f"meaning.hi/display_meaning missing: {v0}"


# ===================== VEDAS =====================

class TestVedasEndpoints:
    """Vedas endpoints used by VedasPuranasScreen / VedaSuktasScreen."""

    def test_vedas_books_returns_four(self, session):
        r = session.get(f"{API}/vedas/books", timeout=20)
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
        data = r.json()
        books = data if isinstance(data, list) else data.get("books") or data.get("items") or []
        assert isinstance(books, list)
        assert len(books) >= 4, f"expected >=4 vedas, got {len(books)}: {books}"

    def test_vedas_hierarchy_first(self, session):
        r = session.get(f"{API}/vedas/books", timeout=20)
        data = r.json()
        books = data if isinstance(data, list) else data.get("books") or data.get("items") or []
        assert books
        first = books[0]
        veda_id = first.get("id") or first.get("_id") or first.get("book_id")
        assert veda_id

        rh = session.get(f"{API}/vedas/hierarchy/{veda_id}", timeout=20)
        assert rh.status_code == 200, f"got {rh.status_code}: {rh.text[:300]}"
        h = rh.json()
        # Hierarchy may have suktas/mandalas/items
        assert isinstance(h, (dict, list)), f"unexpected hierarchy type: {type(h)}"
