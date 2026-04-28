# Sanatan Saathi — PRD

## Vision
Multilingual spiritual platform with React Admin Panel, FastAPI Backend, and Expo Mobile App.
Features: Multilingual content (Aartis/Chalisas/Granths/Vedas), Import Wizard, Live Preview, VedaChat AI, **Graha-based Mantra Recommendation System**, and **AI + Rule-Based Astrology Intelligence System** powered by Swiss Ephemeris (deterministic — no AI guesswork in computation).

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

### Session 4: Graha-based Mantra System + Multilingual TTS (Feb 2026)
- Swiss Ephemeris Kundli Engine (`kundli_engine.py`) — accurate planetary positions
- Graha Scoring Engine — 0-100 + priorities HIGH/MEDIUM/LOW
- Mantra Recommendation — Top 1-2 afflicted grahas → Devta + Mantra + Count + Day + Color + Remedy
- `GrahaKundliPage` (हि/EN toggle), Dashboard `आज का उपाय` card
- Switchable TTS (Google Cloud / OpenAI / ElevenLabs) via Integration Hub
- 12-language voice mapping, MongoDB cache

### Session 5: AI + Rule-Based Astrology Intelligence (Feb 2026, current)
- **Vimshottari Dasha Engine** (`dasha_engine.py`) — 120-year cycle from Moon nakshatra; Mahadasha + Antardasha + interpret_current_dasha (5-domain impact: career, marriage, health, finance, mind)
- **Dosha Detection Engine** (`dosha_engine.py`) — Mangal Dosha (Lagna+Moon+Venus refs), Kaal Sarp Dosha (planets one side of Rahu-Ketu axis), Sade Sati (current Saturn transit via real-time swisseph), Shani Dhaiya
- **D9 Navamsa Engine** (`d9_engine.py`) — deterministic offsets (movable=0/fixed=8/dual=4)
- **AI Hybrid Layer** (`ai_interpreter.py`) — Claude via Emergent LLM Key, strict prompt: ONLY explains rule output in 2-4 line Hindi/English, no hallucination, response cached in `ai_cache` field
- **North Indian Kundli SVG** (`NorthIndianChart.js`) — D1 + D9 with planet abbreviations, retrograde marker, Hindi/English labels
- **Dashboard sections**: "वर्तमान दशा प्रभाव" (Mahadasha + Antardasha + 3 themes + AI व्याख्या + 5 domain pills)
- **Endpoints**: `/api/dasha/current`, `/api/dasha/interpret`, `/api/dosha/detect`, `/api/dosha/interpret`, `/api/charts/d1-d9`, `/api/insights/today`
- Extended `/api/kundli/generate` to compute D9 + Dasha + Doshas in one call
- Pytest suite expanded: 13/13 passing in iteration_4

## Architecture
- Backend: FastAPI + MongoDB (this platform)
- Admin Panel: React.js (this platform)
- Mobile App: Expo/React Native (user's local VS Code)
- AI: Claude via Emergent LLM Key
  - VedaChat (free-form Q&A)
  - DOCX parsing
  - **Astrology Hybrid Interpreter** (rule-bound, 2-4 line, no hallucination)
- Astrology: Swiss Ephemeris (`pyswisseph`) — deterministic
- TTS: Switchable (Google / OpenAI / ElevenLabs)

## DB Collections
- `kundli_data` — Full Kundli (planets, scores, d9_chart, dasha_data, current_dasha, dasha_interpretation, doshas, ai_cache, top_recommendations)
- `graha_scores` — Per-graha scores (linked by kundli_id)
- `daily_recommendations` — Top mantras for date+user
- `mantras` — Graha → Devta → Mantra mappings
- `notifications` — Daily notification log
- `tts_cache` — Base64 audio cache by hash
- `integration_settings` — TTS provider + API keys

## API Endpoints (Astrology Suite)
- `POST /api/kundli/generate` — Full kundli + d9 + dasha + doshas
- `GET /api/kundli/my` — Saved kundli for current admin
- `GET /api/dasha/current` — MD/AD + rule interpretation
- `POST /api/dasha/interpret` — AI Hindi/English (cached)
- `GET /api/dosha/detect` — Mangal + Kaal Sarp + Sade Sati
- `POST /api/dosha/interpret` — AI per-dosha (cached)
- `GET /api/charts/d1-d9` — D1 + D9 SVG-ready data
- `GET /api/insights/today` — Combined daily insights
- `GET /api/notifications/today` — Day-based + personalised notifications
- `POST /api/tts/synthesize` — Switchable provider audio
- `GET /api/recommendations/mantra` — Top 1-2 mantras
- `GET /api/mantras/all` — All 9 graha-mantra mappings

## Backlog
### P1
- [ ] User-level Kundli (currently per-admin) — needed for mobile app
- [ ] APScheduler + mobile push (OneSignal/Expo) for daily reminders
- [ ] Dasha-change & Sade-Sati-start event notifications
- [ ] Google Cloud TTS service account JSON (user must provide)
- [ ] Pratyantardasha (3rd-level dasha)

### P2
- [ ] Refactor `server.py` (~5050 lines) → `routes/` modules
- [ ] Charts: D7 (Saptamamsa for children), D10 (Dasamsa for career)
- [ ] Yoga detection (Raj Yoga, Dhana Yoga, Gajakesari Yoga)
- [ ] Transit-based daily prediction (current planet positions vs natal)
- [ ] Media Studio (image/video gen)
- [ ] Server-side bulk write optimisation
- [ ] Ownership validation in /graha/score
