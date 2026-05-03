# Sanatan Saathi — Agent Guide

> Read this file **before** writing any code. It captures decisions made over 25+ sessions.

---

## What This Project Is

A mobile-first, multilingual digital spiritual companion for Sanatan Dharma. Users read, listen to, and learn Vedic mantras, Chalisas, Aartis, Kathas, Granths (Gita, Ramayana), and Vedas/Puranas across 12+ Indian languages.

**Primary audience:** 40+ users and families teaching children.

**Core promise:** Simple, accurate, devotional experience — not an information dump.

---

## Repo Layout

```
sanatan-app/
├── backend/              FastAPI Python monolith
│   ├── server.py         ★ ALL ~190 routes live here (~5100+ lines) — READ FIRST
│   ├── translation_service.py   Gemini translation (google-generativeai SDK)
│   ├── ai_interpreter.py        Vedic astrology AI narration (anthropic SDK)
│   ├── tts_service.py           Switchable TTS: Google / OpenAI / ElevenLabs
│   ├── kundli_engine.py         D1/D7/D9/D10 charts, Swiss Ephemeris
│   ├── dasha_engine.py          Vimshottari Dasha (Maha/Antara/Pratyantara)
│   ├── dosha_engine.py          Mangal / Kaal-Sarp / Pitri Dosha
│   ├── panchang_engine.py       Tithi / Nakshatra / Yoga / Rahukalam
│   ├── dharma_engine.py         70 rule-based daily guidance cards
│   ├── festival_engine.py       25 festival detection rules
│   ├── docx_parser.py           Deterministic DOCX import (no LLM needed)
│   ├── audio_sync_service.py    LRC + JSON sync map parser
│   ├── yoga_engine.py           5 canonical yoga detection rules
│   ├── static/                  Uploaded audio / video / thumbnails (served via FastAPI)
│   │   ├── audio/items/         Content item MP3s → /api/audio-static/items/
│   │   └── aarti/{id}/{lang}/   Per-language audio/video/thumbnail → /api/aarti-static/
│   ├── tests/                   pytest suite (~50+ tests)
│   ├── requirements.txt         Python deps (anthropic, google-generativeai, openai, motor…)
│   ├── Dockerfile
│   └── .env                     MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
│
├── frontend/             React 19 admin panel (CRA + Tailwind + shadcn/ui)
│   └── src/
│       ├── App.js                      ★ Route table — check here for page names
│       └── pages/
│           ├── BhaktiEditorDrawer.js   ★ ~1800 lines, unified Bhakti content editor
│           ├── AartiManagerPageNew.js  Aarti category manager
│           ├── ChalisaManagerPage.js   + 8 more category managers
│           ├── MultilingualEditorPage.js  AI translation UI
│           ├── IntegrationSettingsPage.js Admin API-key management hub
│           ├── VedaChatPage.js         AI scripture Q&A chat
│           └── DashboardPage.js
│
├── expo-app/             React Native + Expo SDK 50+
│   └── src/
│       ├── config/api.js              ★ API_BASE_URL — SET THIS for local dev
│       ├── contexts/AuthContext.js    JWT auth context (mobile)
│       └── screens/
│           ├── ContentDetailScreen.js ★ AartiHero + karaoke sync engine
│           └── v2/ContentDetailScreen.js  Live Aarti backend integration
│
├── docs/                 BLUEPRINT.md, ONBOARDING.md, SETUP.md, DATA_SCHEMA.md
├── seeds/                seed.py + 6 JSON files (305 seed docs)
└── backup/               mongodump archive (30 collections, PII-masked)
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, Motor (async MongoDB), bcrypt, PyJWT, APScheduler |
| **Database** | MongoDB 7 (30 collections) |
| **Admin Panel** | React 19, Tailwind CSS, shadcn/ui, Radix UI, axios |
| **Mobile App** | React Native + Expo SDK 50+, expo-av |
| **AI — Chat / Parsing** | Claude (Anthropic SDK `AsyncAnthropic`) |
| **AI — Translation** | Gemini 2.5 Flash (`google-generativeai`) |
| **AI — Image Gen** | Gemini (`google-genai` SDK) |
| **TTS** | Google Cloud TTS (default), OpenAI TTS (optional), ElevenLabs (optional) |
| **Astrology** | Swiss Ephemeris (`pyswisseph`) |

### AI/LLM Keys (configured via Admin → Integration Settings → AI/LLM)

| Setting key | Purpose |
|---|---|
| `anthropic_api_key` | Claude — VedaChat, DOCX parse, astrology narration |
| `gemini_api_key` | Gemini — translation, image generation |
| `openai_api_key` | OpenAI — TTS (optional) |
| `ai_model_chat` | Claude model for VedaChat (default: `claude-sonnet-4-5-20250929`) |
| `ai_model_parsing` | Claude model for DOCX/PDF parsing |

Keys are stored **encrypted** (Fernet) in MongoDB `integration_settings` collection via the admin UI. The `get_setting(key)` helper decrypts and returns them.

### Internal AI helpers (server.py)

```python
await _call_anthropic(system_message, user_prompt)          # Claude chat call
await _call_anthropic_parsing(system_message, user_prompt)  # Claude parse call (uses ai_model_parsing)
```

---

## Key Environment Variables

```
# backend/.env
MONGO_URL=mongodb://mongo:27017        # or localhost:27017 for local dev
DB_NAME=sanatan_saathi
JWT_SECRET=<strong-random-secret>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<initial-admin-password>
```

All LLM API keys are stored in the database — **not** in `.env`. Configure them through Admin → Integration Settings after first boot.

---

## Running Locally

### With Docker (recommended)

```bash
cd sanatan-app
docker-compose up --build
```

| Service | URL |
|---|---|
| Backend API | http://localhost:8001/api |
| Admin Panel | http://localhost:3000 |
| Expo Metro | http://localhost:8081 |
| MongoDB | localhost:27017 |

### Without Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Admin Panel
cd frontend
npm install && npm start

# Mobile
cd expo-app
npm install && npx expo start
```

**Important for mobile:** Set `API_BASE_URL` in `expo-app/src/config/api.js` to your local machine's LAN IP, e.g. `http://192.168.1.x:8001/api`.

### Seed the database (first run)

```bash
cd seeds
python seed.py
```

---

## Running Tests

```bash
cd backend
pytest -q
```

---

## Architecture Rules (Non-Negotiable)

### 1. Do NOT re-architect — extend existing system only
The monolith has 25+ sessions of accumulated complexity and ~190 endpoints. Rebuilding anything risks regressions. Prefer the smallest possible change.

### 2. All routes go in `server.py`
This is intentional. Refactoring to a `routes/` package is P2 backlog. Do not split it now.

### 3. Two content collections — use the resolver
`content_items`/`content_verses` (legacy) and `bhakti_items`/`bhakti_verses` (newer) both exist. Always use the `_resolve_item_collections(item_id)` helper — never query either collection directly by name.

### 4. Never change existing endpoint URLs or response shapes
Mobile app and admin panel depend on stable contracts. Only add new endpoints or optional fields.

### 5. AI translation is always DRAFT
Any AI-generated content (translations, DOCX parse) must land in a `is_draft: true` / `status: "draft"` state. Admin must explicitly publish.

### 6. Static files are served from `backend/static/`
Files are stored at paths relative to `Path(__file__).parent` — never hardcode `/app/backend/static/...` (that's the Docker path, not the Windows local path).

- Audio content: `backend/static/audio/items/{item_id}.mp3`
- Aarti per-language: `backend/static/aarti/{item_id}/{lang}/{audio|video|thumbnail}/`
- Served at: `/api/audio-static/` and `/api/aarti-static/`

### 7. Definition of done
Feature is complete when it **works on a real mobile device** — not just in the browser.

---

## Content Categories & Data Model

| Category | Collection | Notes |
|---|---|---|
| Aarti | `bhakti_items` / `content_items` | Per-language audio/video/thumbnail, sync JSON |
| Chalisa | `bhakti_items` | Doha + Chaupai, Beginner/Expert modes |
| Namavali | `bhakti_items` | 108 names |
| Sahasranama | `bhakti_items` | 1000 names |
| Vedic Mantra | `bhakti_items` | |
| Granth | `granth_books` + `granth_chapters` + `granth_verses` | Gita, Ramayana, Mahabharata |
| Veda/Purana | `veda_books` + `veda_chapters` + `veda_verses` | |
| Panchang | `panchang` | Daily tithi/nakshatra/yoga, cached 12h |
| Kundli | `kundli_data` + `nakshatra_profiles` | Per user, Swiss Ephemeris |

**Supported languages:** `hi` (Hindi), `en` (English), `sa` (Sanskrit), `mr` (Marathi), `gu` (Gujarati), `ta` (Tamil), `te` (Telugu), `bn` (Bengali), `kn` (Kannada), `ml` (Malayalam), `pa` (Punjabi), `od` (Odia)

---

## Admin Roles

| Role | Can do |
|---|---|
| `super_admin` | Everything including Integration Settings, user management |
| `content_admin` | Create/edit/publish content, AI translation, import |
| `moderator` | Read-only access + moderation queue |

---

## Key Patterns to Follow

### Adding a new backend endpoint
```python
@api_router.post("/content/my-new-thing")
async def my_new_thing(request: Request, admin: dict = Depends(require_role(["super_admin"]))):
    body = await request.json()
    ...
```

### Reading an integration setting (with DB-stored key)
```python
api_key = await get_setting("anthropic_api_key")   # decrypts from DB, falls back to env var
```

### Calling Claude
```python
response = await _call_anthropic(system_message, user_prompt)
response = await _call_anthropic_parsing(system_message, user_prompt)  # uses ai_model_parsing
```

### Calling Gemini (translation)
```python
from translation_service import translate_text, translate_verse
gemini_key = await get_setting("gemini_api_key")
result = await translate_text(text, "hi", ["mr", "gu"], api_key=gemini_key)
```

### Serializing MongoDB docs for API response
```python
return serialize_doc(doc)       # single document
return [serialize_doc(d) for d in docs]   # list
```

---

## What NOT to Do

- Do **not** add `EMERGENT_LLM_KEY` or import `emergentintegrations` — it has been fully removed.
- Do **not** hardcode `/app/backend/static/...` paths — use `Path(__file__).parent / "static" / ...`.
- Do **not** auto-publish AI-generated translations or parse results.
- Do **not** rename or remove existing API endpoints.
- Do **not** create duplicate content collections or new admin page types without checking if one already exists.
- Do **not** commit `.env` files or secrets.

---

## Docs to Read Before a Session

1. `docs/BLUEPRINT.md` — architectural constraints and product decisions
2. `memory/current_status.md` — what's done and known issues
3. `backend/server.py` lines 1–100 — imports and startup to understand what's loaded
