# Sanatan Saathi — PRD

## Vision
Multilingual spiritual platform: React Admin Panel + FastAPI Backend + Expo Mobile App with AI + Rule-Based Astrology Intelligence.

## Sessions

### Session 1: Foundation (existing GitHub import + Multilingual + Import Wizard + Granth Manager)
### Session 2: Vedas & VedaChat AI
### Session 3: Smart Search + Expo skeleton
### Session 4: Graha-based Mantra + Multilingual TTS (Google/OpenAI/ElevenLabs switchable)
### Session 5: AI + Rule-Based Astrology Intelligence (Vimshottari Dasha, Doshas, D9, AI Hybrid Layer, Charts)
### Session 6: Voice + Mobile App scaffold (browser STT + speaker, Expo 5-tab + AI chat modal)
### Session 7: Mobile Live Backend + APScheduler + VS Code/TTS guides

### Session 8: Mobile Navigation Overhaul + Intent-Based Bhakti (Feb 2026)

### Session 9: Multilingual Editor + Gemini AI Translation (Feb 2026)
- **New backend service** `/app/backend/translation_service.py` wrapping Gemini 2.5 Flash via `emergentintegrations.LlmChat` (uses Emergent Universal Key)
- **8 new admin endpoints** under `/api/admin/translate/*`:
  - `POST /text` — single text → multi-lang translation
  - `POST /verse` — translate text/transliteration/meaning of a verse, optionally save drafts
  - `GET /drafts/{verse_id}` — list drafts
  - `PUT /drafts/{verse_id}/{language}` — admin manual edit
  - `POST /drafts/{verse_id}/{language}/publish` — move into live `verse_meanings` + `content_verses.text_translations.{lang}` + `content_verses.transliteration_translations.{lang}`
  - `DELETE /drafts/{verse_id}/{language}`
  - `GET /languages` — supported language list
- **Drafts collection** `verse_translation_drafts` keyed by `(verse_id, language, is_draft)` with `is_ai_generated` flag — AI never auto-publishes
- **New admin page** `/admin/multilingual-editor` (`MultilingualEditorPage.js`):
  - Item picker → verses list → editor pane
  - Source language toggle (sa/hi/en) + 6 target language tabs (mr/gu/ta/te/bn/en)
  - Per-language draft status dots (green=published, purple=AI draft, amber=manual draft)
  - "AI Translate (current)" + "Translate All Languages" buttons
  - Save Draft / Publish / Delete actions
  - Frontend retry-on-budget-error UX
- **TipTap-powered Unicode-safe editor** (`UnicodeRichEditor.js`) with proper Noto fonts for Devanagari/Gujarati/Tamil/Telugu/Bengali/Kannada/Malayalam/Gurmukhi/Oriya scripts
- **iteration_10.json**: 11/11 backend pytest pass, frontend e2e pass on all flows

### Session 10: One-click Whole-Item Translate + D7/D10 Charts + Chart Redesign (Feb 2026)
- **One-click "AI Translate Whole Item"** button in Multilingual Editor — loops every verse of an item across all 6 target languages with a live progress bar, retry-on-budget, and 250ms pacing. All output stays as drafts.
- **D7 (Saptamsa) + D10 (Dasamsa) divisional charts** — new `/app/backend/d7_engine.py` and `/app/backend/d10_engine.py` (Parashara classical rules: odd signs = same, even signs = +6 / +8 offset). Stored on `kundli_data.{d7_chart, d10_chart}` and returned by `POST /api/kundli/generate` + `GET /api/charts/d1-d9` (now also returns d7 and d10).
- **NorthIndianChart redesign** — rashi numbers (1-12) at the inner vertex of each of 12 house cells (matches classic North Indian convention from user's reference image), graha abbreviations with degree-in-sign superscripts (e.g. शु¹⁵, के⁰², गु⁰³), distinct color per graha, retrograde marker.
- GrahaKundliPage backfills d7/d10 from `/charts/d1-d9` for legacy kundli docs that pre-date this session.
- **iteration_11.json**: 14/14 backend pytest pass, frontend e2e on 4-chart render + bulk translate + progress bar + button-disable regression.

### Session 11: Mobile-first Kundli refactor + Chart no-overlap engine (Feb 2026 — current)
- **Removed Grah & Kundli from Admin Panel** (route + sidebar entry). Backend kundli APIs remain intact for mobile consumption.
- **New shared layout module** `/app/frontend/src/lib/kundliLayout.js` (also copied to `/app/expo-app/src/lib/`): pure-JS BBox-based layout engine with no-overlap guarantees:
  - 1-2 planets → centered row; 3-4 → vertical stack; 5+ → 2-col grid
  - Font auto-scales 8..14px based on planet count
  - >7 planets → first 7 + "+N" overflow indicator
  - Hindi planet abbreviations (सू/चं/मं/बु/गु/शु/श/रा/के)
- **Web NorthIndianChart** rewritten to use the shared module
- **Mobile NorthIndianChart** built with `react-native-svg`
- **Mobile KundliScreen** rewritten — Form (Name/DOB/TOB/POB) + 4-tab layout: Charts (D1↔D9↔D7↔D10 chip switcher + planet table), Overview, Analysis, Remedies
- **Deferred to Phase 2** (per user request): zoom/pan/tap-bottomsheet, animated planet transitions
- **iteration_12.json**: 5/5 backend regression + 48/48 layout-engine unit tests + admin route removal verified.

### Session 8: Mobile Navigation Overhaul + Intent-Based Bhakti (Feb 2026)
- **Per-tab Stack architecture** in App.js — fixes "inner links don't work":
  - HomeStack, BhaktiStack (11 inner screens), KundliStack, PanchangStack, ProfileStack
  - AIChat as RootStack modal (accessible from any tab)
- **SafeAreaProvider + `SafeScreen` wrapper** — every screen now respects status bar + home indicator (no UI overlap on any phone)
- **Intent-based Bhakti navigation**:
  - By Deity → DeityDetailScreen → ContentDetailScreen (full text + Expo AV audio)
  - Daily Bhakti → ContentDetailScreen
  - Explore → Kathas / Granth / Vedas & Puranas
- **Kathas flow**: Satyanarayan & Bhagwat with Read 📖 / Listen 🎧 toggle
- **Granth flow** (live admin DB):
  - GranthListScreen → fetches `/api/granth/books`
  - GranthChaptersScreen → `/api/granth/hierarchy/{book_id}`
  - GranthVersesScreen → `/api/granth/chapter-verses/{chapter_id}` with Sanskrit + Hindi meaning + per-verse ▶ TTS
- **Vedas flow** (live admin DB):
  - VedasPuranasScreen → 4 Vedas list + Puranas grid (3 available + 3 Coming Soon)
  - VedaSuktasScreen → `/api/vedas/hierarchy/{id}`
  - PuranaDetailScreen → intro + chapter placeholder
- **DEITY_CONTENT** with full Hindi text:
  - Hanuman: Chalisa (full 40 chaupais), Aarti, Bajrang Baan
  - Shiva: Mahamrityunjaya, Aarti, Tandav Stotram (excerpt)
  - Krishna: Aarti, Moola Mantra
  - Durga: Aarti (Jay Ambe Gauri), Beej Mantra
  - Ganesha: Aarti, Moola Mantra
  - Rama: Tarak Mantra, Aarti
- **Audio playback** via Expo AV calling `/api/tts/synthesize` (graceful degradation when TTS not configured)
- **Quick Actions** on Home now correctly switch between tabs via `getParent()?.navigate(tab)`
- README.md fully rewritten with test flow checklist

## Architecture
- Backend: FastAPI + MongoDB + APScheduler + Swiss Ephemeris + emergentintegrations (Claude)
- Admin Panel: React.js
- Mobile App: Expo / React Native — per-tab Stack + SafeAreaProvider, axios client → live backend
- AI: Claude via Emergent LLM Key
- TTS: Switchable (Google / OpenAI / ElevenLabs)
- Voice STT: Browser Web Speech API (Web)

## Tested Flows (iteration_8 — 20/20 backend + structural)
- Bhakti → Hanuman → Hanuman Chalisa → ▶ Play
- Bhakti → Explore → Kathas → Satyanarayan → 📖 Read / 🎧 Listen
- Bhakti → Explore → Granth → Bhagavad Gita → Chapter 1 (अर्जुन विषाद योग) → Verses (Sanskrit + Hindi)
- Bhakti → Explore → Vedas & Puranas → Rig Veda → Sukta list
- Home Quick Action → switches tab properly
- Floating 🤖 → AI Chat modal from any tab

## Backlog
### P1 (next phases of multilingual upgrade)
- [ ] **Phase 2: Audio-Text Synchronization** — Admin upload MP3 + LRC/JSON sync file; Mobile player highlights current verse synced with audio playback
- [ ] **Phase 2: Mobile Beginner Mode** — Guided learning flow, Guru/Student voice looping using Google Cloud TTS
- [ ] **Phase 2: Mobile Expert Mode** — Consumption + Reel/Video generation flow

### P2
- [ ] User signup/login screen on mobile (currently auto-admin)
- [ ] Pratyantardasha (3rd-level dasha)
- [ ] Yoga detection (Raj/Dhana/Gajakesari)
- [ ] Refactor `server.py` (~5100 lines) → `routes/` modules
- [ ] Push notifications via Expo Notifications + OneSignal
- [ ] EAS build configs for Play Store + App Store
- [ ] Native voice STT on mobile (Expo Speech Recognition)
- [ ] Bulk content import for Puranas (currently placeholder)
- [ ] Search bar functionality on Bhakti screen (currently UI-only)

## Key API Endpoints
### Public (no auth)
- `GET /api/mobile/panchang/today`, `GET /api/mobile/mantra-of-day`
- `GET /api/granth/books`, `GET /api/granth/hierarchy/{book_id}`, `GET /api/granth/chapter-verses/{chapter_id}`
- `GET /api/vedas/books`, `GET /api/vedas/hierarchy/{book_id}`, `GET /api/vedas/chapter-verses/{chapter_id}`

### Authenticated
- `POST /api/kundli/generate`, `GET /api/kundli/my`
- `GET /api/dasha/current`, `POST /api/dasha/interpret`
- `GET /api/dosha/detect`, `POST /api/dosha/interpret`
- `GET /api/charts/d1-d9`, `GET /api/insights/today`, `GET /api/notifications/today`
- `POST /api/tts/synthesize`, `POST /api/vedachat/message`
- `POST /api/admin/translate/text` — Gemini AI text translation
- `POST /api/admin/translate/verse` — Gemini AI verse translation (text+transliteration+meaning), saves drafts
- `GET /api/admin/translate/drafts/{verse_id}` — list drafts for a verse
- `PUT /api/admin/translate/drafts/{verse_id}/{language}` — admin manual edit
- `POST /api/admin/translate/drafts/{verse_id}/{language}/publish` — publish to verse_meanings + content_verses
- `DELETE /api/admin/translate/drafts/{verse_id}/{language}` — delete draft
- `GET /api/admin/translate/languages` — supported language list
