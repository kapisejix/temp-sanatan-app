# API.md — Sanatan Saathi Backend Reference

> **Base URL** — `${REACT_APP_BACKEND_URL}/api`  (or `${EXPO_PUBLIC_API_BASE_URL}` already includes `/api`).
> **Auth** — `Authorization: Bearer <jwt>` header. Tokens come from `/auth/admin/login` or `/auth/mobile/login`.
> **Response shape** — All non-204 responses are JSON. Errors: `{ "detail": "..." }` with HTTP 4xx/5xx.

The backend ships **~190 routes**. This document covers the **canonical core** with full request/response samples — see the *Full Endpoint Catalog* at the bottom for the complete list.

> Live OpenAPI/Swagger UI is available at `${BASE}/docs` when the backend is running — that is the authoritative source if anything below drifts.

---

## 1. Authentication

### POST /api/auth/admin/login
Admin panel login.
```json
// Request
{ "email": "admin@yourdomain.com", "password": "ChangeMeStrong@2026" }

// 200 Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "69f053c8053b601fc045a5c9",
    "email": "admin@yourdomain.com",
    "name": "Super Admin",
    "role": "super_admin"
  }
}
```

### POST /api/auth/mobile/signup
```json
// Request
{ "name": "Asha", "email": "asha@example.com", "password": "Test@12345", "phone": null }

// 200
{ "token": "...", "user": { "id": "...", "email": "...", "name": "Asha", "preferred_language": "hi" } }
```

### POST /api/auth/mobile/login
Same shape as admin login, returns mobile JWT.

### GET /api/auth/me  *(Bearer)*
Returns the authenticated profile.

### PUT /api/auth/mobile/settings  *(Bearer)*
Patch user preferences.
```json
// Request
{ "preferred_language": "mr", "name": "Asha P." }

// 200
{ "ok": true, "user": { ... } }
```

### POST /api/auth/logout  *(Bearer)*
Blacklists the current JWT.

### POST /api/auth/refresh
```json
{ "refresh_token": "..." }
```

### POST /api/auth/forgot-password / reset-password
Standard email-flow stubs. See `server.py` for current implementation status.

---

## 2. Content (Chalisa, Sahasranama, Mantras, etc. — `content_items`)

### GET /api/content/items
Query params: `category`, `status`, `limit`, `skip`, `q` (search).
```json
// 200
{
  "items": [
    {
      "_id": "69f053c8053b601fc045a5ca",
      "category": "chalisa",
      "slug": "hanuman-chalisa",
      "title_hi": "हनुमान चालीसा",
      "title_en": "Hanuman Chalisa",
      "deity": "Hanuman",
      "supported_languages": ["hi", "en", "sa"],
      "total_verses": 42,
      "status": "published",
      "audio_sync": { "audio_url": "/api/audio-static/items/...mp3", "sync_map": [...] },
      "languages": { "hi": { "full_text": "..." } }
    }
  ],
  "total": 9
}
```

### GET /api/content/items/{item_id}
Full document with embedded `languages.{code}` map and `audio_sync`.

### POST /api/content/items  *(admin Bearer)*
Create a new content item. Required: `category`, `title_hi`. Optional `slug`, `deity`, etc.

### PUT /api/content/items/{item_id}  *(admin Bearer)*
Patches any subset of fields. Used by the unified editor for title, languages, full text, etc.

### DELETE /api/content/items/{item_id}  *(admin Bearer)*
Hard-delete + cascade `content_verses`.

### PATCH /api/content/items/{item_id}/status  *(admin Bearer)*
```json
{ "status": "published" | "draft" | "archived" }
```

### GET /api/content/items/{item_id}/publish-check
Validation report (warns about audio without sync, missing languages, etc.).

### GET /api/content/items/{item_id}/verses
Verse list for an item.

### POST /api/content/items/{item_id}/verses  *(admin Bearer)*
Bulk replace verses.
```json
{
  "verses": [
    { "verse_num": 1, "verse_type": "doha", "sanskrit_text": "...", "transliteration": "..." }
  ]
}
```

### PUT /api/content/verses/{verse_id}
Edit one verse. Returns updated doc.

### GET /api/content/verses/{verse_id}/meanings
Meaning per language.

### POST /api/content/verses/{verse_id}/meanings  *(admin Bearer)*
```json
{ "language": "hi", "meaning": "...", "word_breakdown": [] }
```

---

## 3. Per-language Aarti / Bhakti media

These are the endpoints that power the unified Bhakti Editor's Audio / Video / Sync tabs.

### GET /api/content/items/{item_id}/lang/{lang}/media
Returns the **language-specific** bundle (text, audio, video, thumbnail, sync) — the single endpoint mobile uses for Aarti playback.
```json
// 200
{
  "lang": "hi",
  "audio_versions": [
    { "slot": 1, "label": "Normal", "url": "/api/aarti-static/.../v1.mp3", "format": "mp3" }
  ],
  "video": null,
  "thumbnail": { "url": "/api/aarti-static/.../thumbnail/main.png", "format": "png" },
  "sync": {
    "sync_map": [
      { "verse_num": 1, "start_ms": 0, "end_ms": 5000, "text": "...",
        "lines": [ { "text": "...", "start_ms": 0, "end_ms": 5000 } ] }
    ],
    "duration_ms": 10000
  },
  "full_text": "..."
}
```

### POST /api/content/items/{item_id}/lang/{lang}/audio  *(admin, multipart)*
Upload an MP3 variant for one language.
```
form-data:
  slot:   1..4
  label:  "Normal" | "Female" | "Slow" | …
  file:   <mp3 binary>
```

### DELETE /api/content/items/{item_id}/lang/{lang}/audio/{slot}  *(admin)*
Remove one slot.

### POST /api/content/items/{item_id}/lang/{lang}/video  *(admin, multipart)*
```
form-data:
  file: <mp4 binary>
```

### DELETE /api/content/items/{item_id}/lang/{lang}/video  *(admin)*

### POST /api/content/items/{item_id}/lang/{lang}/thumbnail  *(admin, multipart)*
PNG/JPG thumbnail for the language bucket.

### POST /api/content/items/{item_id}/lang/{lang}/sync  *(admin, JSON)*
Persist the line-level sync map for a language.
```json
// Request body — strict nested format
{
  "audio_file": "/api/aarti-static/.../v1.mp3",
  "duration_ms": 10000,
  "verses": [
    {
      "verse_id": 1,
      "start_ms": 0,
      "end_ms": 5000,
      "lines": [ { "text": "जय गणेश", "start_ms": 0, "end_ms": 2500 } ]
    }
  ]
}

// 200
{ "ok": true, "sync_map": [...], "duration_ms": 10000 }
```
**Validation rules** (server side): no overlaps within a verse, `end_ms > start_ms`, lines text non-empty.

---

## 4. Bhakti items collection (`bhakti_items` — Aarti, Stotram, Sahasranama, Kavacham, etc.)

These mirror the `content_items` endpoints but live in `bhakti_items`. The frontend's *resolve_item_collection* helper picks the right collection by id.

| Method | Path |
|---|---|
| GET | `/api/bhakti/items` |
| GET | `/api/bhakti/items/{item_id}` |
| POST | `/api/bhakti/items` |
| PUT | `/api/bhakti/items/{item_id}` |
| PATCH | `/api/bhakti/items/{item_id}/status` |
| DELETE | `/api/bhakti/items/{item_id}` |
| POST | `/api/bhakti/bulk-delete` |
| POST | `/api/bhakti/bulk-export` |
| POST | `/api/bhakti/bulk-tts` |

**Document schema** is the same union as `content_items` but with optional Aarti-only fields: `video_url`, `music_type`, `best_occasion`, `audio_timestamps[]`, `languages.{lang}.video|thumbnail|sync|audio_versions`. See [`DATA_SCHEMA.md`](./DATA_SCHEMA.md).

---

## 5. Mobile-specific

| Method | Path | Notes |
|---|---|---|
| GET | `/api/mobile/panchang/today` | Public. Optional `lat`, `lon`, `tz`. |
| GET | `/api/mobile/mantra-of-day` | Public. |
| GET | `/api/home/today` *(Bearer)* | Personalized home feed. |
| GET | `/api/home/categories` | Public. |
| GET | `/api/home/daily` | Public. |
| GET | `/api/insights/today` *(Bearer)* | AI insights based on user kundli. |
| GET | `/api/notifications/today` *(Bearer)* | Daily notifications digest. |
| GET | `/api/recommendations/mantra` *(Bearer)* | Graha-based mantra suggestion. |
| GET | `/api/offline/bundle` *(Bearer)* | Bulk content for offline mode. |
| GET | `/api/offline/content/{item_id}` *(Bearer)* | Single-item offline pack. |

---

## 6. Astrology

| Method | Path | Notes |
|---|---|---|
| POST | `/api/kundli/generate` *(Bearer)* | Body: birth details (`date`, `time`, `lat`, `lon`, `tz`). |
| GET | `/api/kundli/my` *(Bearer)* | Current user's kundli. |
| GET | `/api/charts/d1-d9` *(Bearer)* | Returns all divisional charts incl. d7/d10. |
| GET | `/api/charts/all` *(Bearer)* | Same + summary. |
| GET | `/api/dasha/current` *(Bearer)* | Current Mahadasha/Antardasha. |
| POST | `/api/dasha/interpret` *(Bearer)* | AI Dasha narrative. |
| GET | `/api/dosha/detect` *(Bearer)* | Mangal/Kaal-Sarp/Pitri detection. |
| POST | `/api/dosha/interpret` *(Bearer)* | AI dosha narrative. |
| GET | `/api/yogas` *(Bearer)* | Yogas detected from current kundli. |
| POST | `/api/graha/score` *(Bearer)* | Body: `{ "graha": "Sun" }`. |
| GET | `/api/dharma/today` *(Bearer)* | Today's dharma rule applied to user. |
| GET | `/api/panchang/day` | Public. Query: `lat`, `lon`, `tz`, `date`, `system`. |
| GET | `/api/nakshatras` | Public. List of 27. |
| GET | `/api/nakshatra/{n}/content` | Per-nakshatra mantras + remedies. |

---

## 7. AI / TTS / Chat

### POST /api/tts/synthesize  *(Bearer)*
```json
// Request
{ "text": "ॐ गं गणपतये नमः", "language": "hi" }

// 200 — base64 audio + metadata
{ "audio_base64": "...", "format": "mp3", "duration_ms": 1850, "provider": "google" }
```

### GET /api/tts/providers
Lists configured providers and current default.

### POST /api/vedachat/message  *(Bearer)*
```json
// Request
{ "message": "Tell me about Hanuman Chalisa", "conversation_id": null }

// 200
{
  "conversation_id": "abc...",
  "answer": "...",
  "citations": [ { "verse_id": "...", "ref": "Chalisa 1.1" } ]
}
```

### GET /api/vedachat/conversations  *(Bearer)*
List user's conversations.

### POST /api/vedachat/upload-knowledge  *(admin, multipart)*
PDF/DOCX → embedded into the VedaChat KB.

---

## 8. Translation (admin)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/translate/text` | `{ text, source, targets:[…] }` → multi-lang dict. |
| POST | `/api/admin/translate/verse` | Translates a verse + saves drafts. |
| GET | `/api/admin/translate/drafts/{verse_id}` | Per-verse draft list. |
| PUT | `/api/admin/translate/drafts/{verse_id}/{language}` | Manual edit. |
| POST | `/api/admin/translate/drafts/{verse_id}/{language}/publish` | Move draft → live. |
| DELETE | `/api/admin/translate/drafts/{verse_id}/{language}` | Discard draft. |
| GET | `/api/admin/translate/languages` | Supported languages list. |

---

## 9. CMS / blog / pages

| Method | Path |
|---|---|
| GET | `/api/blog/posts` *(public)* |
| GET | `/api/blog/posts/{slug}` *(public)* |
| GET | `/api/admin/blog/posts` *(admin)* |
| POST/PUT/DELETE | `/api/admin/blog/posts(/{id})` *(admin)* |
| GET | `/api/pages` / `/api/pages/{slug}` *(public)* |
| GET/POST/PUT/DELETE | `/api/admin/pages(/{id})` *(admin)* |

---

## 10. Imports (DOCX / PDF)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/upload/docx` *(multipart)* | Parses DOCX → returns parsed verses + draft `upload_id`. |
| POST | `/api/admin/upload/publish/{upload_id}` | Commit parsed draft into `content_items`. |
| POST | `/api/admin/upload/pdf` *(multipart)* | Parses PDF (panchang etc.). |
| POST | `/api/admin/upload/pdf/publish/{upload_id}` | Commit PDF parse. |
| POST | `/api/admin/import-wizard` *(multipart)* | Universal wizard endpoint. |
| POST | `/api/admin/import-wizard/publish/{upload_id}` | Commit wizard output. |
| POST | `/api/admin/panchang/import-pdf` | Panchang-specific PDF import. |

---

## 11. Granth & Vedas

| Method | Path |
|---|---|
| GET | `/api/granth/books` |
| GET | `/api/granth/books/{book_id}` |
| GET | `/api/granth/hierarchy/{book_id}` |
| GET | `/api/granth/chapter-verses/{chapter_id}` |
| GET | `/api/granth/chapters/{chapter_id}/verses` |
| GET | `/api/vedas/books` |
| GET | `/api/vedas/books/{book_id}` |
| GET | `/api/vedas/hierarchy/{book_id}` |
| GET | `/api/vedas/chapter-verses/{chapter_id}` |
| PUT | `/api/vedas/verses/{verse_id}` *(admin)* |
| POST | `/api/vedas/upload-parse` *(admin)* |

---

## 12. Admin operations

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/dashboard` | KPIs. |
| GET/POST/PUT/DELETE | `/api/admin/admins(/{id})` | Sub-admin CRUD. |
| GET | `/api/admin/users` | App users list. |
| GET | `/api/admin/contacts` | Contact form submissions. |
| GET | `/api/admin/audit-trail` | All admin mutations. |
| GET | `/api/admin/security/dashboard` | Login attempts, blocked IPs. |
| GET | `/api/admin/security/blocked-ips` |  |
| POST | `/api/admin/security/block-ip` | `{ ip, reason }` |
| DELETE | `/api/admin/security/blocked-ips/{ip}` |  |
| GET/POST/PUT/DELETE | `/api/admin/integrations(/{key})` | API keys & 3rd-party config. |
| GET | `/api/admin/settings` |  |
| PUT | `/api/admin/settings/{key}` |  |
| GET | `/api/admin/uploads(/{upload_id})` | Upload audit log. |
| GET/POST/PUT/DELETE | `/api/admin/vrat-festivals(/{id})` | Vrat & festivals. |
| GET/POST/PUT/DELETE | `/api/admin/daily-schedule(/{id})` | Daily mantras schedule. |
| GET/POST/PUT | `/api/admin/panchang(/{id})` | Panchang overrides. |
| GET | `/api/admin/preview/item/{item_id}` | Preview rendering. |
| POST | `/api/admin/preview/render` | Render dry-run. |
| GET | `/api/admin/analytics/overview` |  |
| GET | `/api/admin/analytics/streaks` |  |

---

## 13. Public + misc

| Method | Path | Notes |
|---|---|---|
| GET | `/api/` | Health. |
| GET | `/api/sitemap.xml` |  |
| GET | `/api/public/homepage` | Marketing site data. |
| POST | `/api/public/contact` | `{ name, email, message }` |
| POST | `/api/public/birth-chart` | Anonymous chart preview. |
| POST | `/api/public/ask` | Free-tier VedaChat (rate-limited). |
| POST | `/api/analytics/event` | `{ name, props }` |
| GET | `/api/search` | Cross-collection search. |
| GET | `/api/languages` | Supported language list. |
| GET | `/api/mantras/all` |  |
| GET | `/api/user/streak/{user_id}` |  |
| POST | `/api/user/streak/check-in` |  |
| GET | `/api/user/upaya-history/{user_id}` |  |
| POST | `/api/user/upaya` |  |
| GET | `/api/user/nakshatra-profile/{user_id}` |  |
| POST | `/api/user/nakshatra-profile` |  |

---

## Full Endpoint Catalog (sorted)

For the complete machine-generated list, run:

```bash
grep -hE "@(api_router|router|app)\.(get|post|put|delete|patch)" backend/server.py | sort -u
```

This will emit all ~190 routes including the legacy ones (`/arti/items`, `/content/items/{id}/audio/sync`, etc.) preserved for backward compatibility.

For full request/response models, query parameters and validation rules, **always defer to `${BASE}/docs`** (FastAPI's auto-generated OpenAPI UI).
