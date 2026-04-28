# Sanatan Saathi — PRD

## Vision
Multilingual spiritual platform with React Admin Panel, FastAPI Backend, and Expo Mobile App.
Features: Multilingual content (Aartis/Chalisas/Granths/Vedas), Import Wizard, Live Preview, VedaChat AI, and **Graha-based Mantra Recommendation System** powered by Swiss Ephemeris (deterministic — no AI guesswork).

## What's Been Implemented

### Session 1: Foundation
- Existing codebase imported from user GitHub
- Import Wizard, Live Preview, Multilingual Tabs, Enhanced Granth Manager

### Session 2: Vedas & VedaChat
- Vedas & Puranas Manager (hierarchical Book → Chapter → Verse)
- VedaChat AI with knowledge upload + DB-context answers + Shloka references

### Session 3: Smart Search + Expo Guide
- Smart Search across all collections
- Expo App API config + setup guide

### Session 4 (Feb 2026): Graha-based Mantra System + Multilingual TTS
- **Swiss Ephemeris Kundli Engine** (`/app/backend/kundli_engine.py`) — accurate planetary positions, Ascendant, Nakshatra, retrograde/combust detection
- **Graha Scoring Engine** — 0-100 scoring based on Base Strength + Affliction (conjunctions/aspects) + House Impact; priorities HIGH/MEDIUM/LOW
- **Mantra Recommendation** — Top 1-2 afflicted grahas mapped to Devta + Mantra + Chant Count + Day + Color + Remedy (Hindi + English)
- Endpoints: `/api/kundli/generate`, `/api/kundli/my`, `/api/graha/score`, `/api/recommendations/mantra`, `/api/mantras/all`, `/api/notifications/today`
- **Frontend `GrahaKundliPage`** — Multilingual (हि/EN toggle) form + Ascendant + Planets table + Graha Scores + Recommendations with Mantra Audio button
- **Dashboard `आज का उपाय` Card** — Day-based + personalised mantra notifications (Hindi/English toggle)
- Sidebar updated: "Nakshatra & Upaya" replaced by "Graha & Kundli"
- **Switchable TTS Service** (`/app/backend/tts_service.py`) — Google Cloud TTS (primary), OpenAI TTS, ElevenLabs; provider chosen via Integration Hub
- TTS supports 12 languages (hi, en, sa, ta, te, bn, mr, gu, kn, ml, pa, od)
- TTS audio cached in MongoDB `tts_cache` collection by content+language+provider hash
- Notification scheduler endpoint `/api/notifications/today` — DAY_TO_GRAHA mapping (Sun→Sun, Mon→Moon, Tue→Mars, Wed→Mercury, Thu→Jupiter, Fri→Venus, Sat→Saturn)
- Pytest suite: `/app/backend/tests/test_graha_kundli.py` (8 tests, 100% pass)

## Architecture
- Backend: FastAPI + MongoDB (this platform)
- Admin Panel: React.js (this platform)
- Mobile App: Expo/React Native (user's local VS Code)
- AI: Claude via Emergent LLM Key (VedaChat + DOCX parsing)
- Astrology: Swiss Ephemeris (`pyswisseph`) — deterministic, no LLM
- TTS: Switchable (Google Cloud / OpenAI / ElevenLabs) — configured via Integration Hub

## DB Collections (Astrology)
- `kundli_data` — user's Kundli (one per admin user, upserted)
- `graha_scores` — separate per-graha score docs (linked by kundli_id)
- `daily_recommendations` — top mantras for date+user
- `mantras` — full Graha → Devta → Mantra mappings (seeded)
- `notifications` — daily notification log
- `tts_cache` — base64 audio cache by hash
- `integration_settings` — TTS provider + API keys

## Backlog
### P1
- [ ] Apply notification scheduler via APScheduler (currently on-demand). Wire mobile push (OneSignal/Expo push) using settings already in Integration Hub
- [ ] Transit-based alerts (Gochar / Sade Sati) — Swiss Ephemeris current planetary positions
- [ ] User-level kundli (currently per-admin); needed for mobile app users
- [ ] User asks Google Cloud TTS service account JSON to enable audio playback

### P2
- [ ] OpenAI TTS fallback when Google Cloud quota exceeded
- [ ] Refactor `server.py` (~4900 lines) → `routes/auth_routes.py`, `routes/kundli_routes.py`, `routes/content_routes.py`, etc.
- [ ] Media Studio (image/video gen) for content
- [ ] Content data migration scripts
- [ ] Analytics dashboard enhancements
- [ ] Server-side bulk write optimisation in /kundli/generate
- [ ] Ownership validation in /graha/score
- [ ] User upload real scripture PDFs at scale
