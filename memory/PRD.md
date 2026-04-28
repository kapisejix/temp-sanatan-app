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

### Session 8: Mobile Navigation Overhaul + Intent-Based Bhakti (Feb 2026 — current)
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
### P2
- [ ] User signup/login screen on mobile (currently auto-admin)
- [ ] Pratyantardasha (3rd-level dasha)
- [ ] D7/D10 charts; Yoga detection (Raj/Dhana/Gajakesari)
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
