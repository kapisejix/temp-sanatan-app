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

### Session 7: Mobile Live Backend + P1 Items (Feb 2026 — current)
- **Mobile API Client** (`src/api/client.js`):
  - axios + AsyncStorage token persistence
  - Auto-login with default admin credentials
  - 401 retry with re-login interceptor
  - Public + authenticated method namespaces
- **Mobile Hooks** (`src/hooks/useApiData.js`) — universal data fetcher with mock fallback
- **Live screens** — HomeScreen, KundliScreen, PanchangScreen, AIChatScreen now hit real backend
- **HomeScreen Audio** — `▶ सुनें` button calls `/api/tts/synthesize` and plays MP3 via Expo AV
- **AIChatScreen** — uses `/api/vedachat/message` (Claude); offline fallback maintained
- **New Backend Endpoints** (`mobile_extras.py`):
  - `GET /api/mobile/panchang/today` — real Swiss Ephemeris Tithi/Nakshatra/Yoga/Karana/Sunrise/Sunset/Rahu Kaal per lat/lon/tz; verified Delhi/Mumbai/Chennai give correct location-specific values
  - `GET /api/mobile/mantra-of-day` — public day-based mantra (rotates by weekday)
- **APScheduler** — daily 06:00 IST job creating notifications for all users with kundli (day-based + personalised + Sade Sati alerts)
- **VS Code + Expo Go Setup Guide** (`/app/expo-app/VS_CODE_EXPO_GO_SETUP.md`)
  - Step-by-step from Node install → Expo Go on phone → hot reload workflow
  - Recommended VS Code extensions
  - Troubleshooting matrix
  - Tunnel mode for different Wi-Fi
  - EAS build instructions for APK/IPA
- **Google Cloud TTS Setup Guide** (`/app/expo-app/GOOGLE_CLOUD_TTS_SETUP.md`)
  - Step-by-step Google Cloud project + service account JSON
  - Cost estimates (free tier covers personal use)
  - Switching to OpenAI / ElevenLabs without code changes

## Architecture
- Backend: FastAPI + MongoDB + APScheduler + Swiss Ephemeris + emergentintegrations (Claude)
- Admin Panel: React.js
- Mobile App: Expo / React Native (axios client → live backend with mock fallback)
- AI: Claude via Emergent LLM Key
- TTS: Switchable (Google / OpenAI / ElevenLabs)
- Voice STT: Browser Web Speech API (Web only; mobile can add Expo Speech Recognition later)

## DB Collections
- `kundli_data` — Full Kundli + d9 + dasha + dosha + ai_cache + top_recommendations
- `tts_cache` — Base64 audio cache by hash
- `notifications` — Daily notification log (auto-populated by APScheduler 06:00 IST)
- `integration_settings` — TTS provider + API keys
- `mantras`, `graha_scores`, `daily_recommendations` — supporting collections

## Backlog
### P1 — All COMPLETE this session ✅
### P2
- [ ] User signup/login screen on mobile (currently auto-admin)
- [ ] Pratyantardasha (3rd-level dasha)
- [ ] D7/D10 charts; Yoga detection (Raj/Dhana/Gajakesari)
- [ ] Refactor `server.py` (~5100 lines) → `routes/` modules
- [ ] Push notifications via Expo Notifications + OneSignal
- [ ] EAS build configs for Play Store + App Store
- [ ] Mobile Bhakti screen — connect to /api/content/categories
- [ ] Server-side bulk write optimisation
- [ ] Native voice STT on mobile (Expo Speech Recognition)
- [ ] Pratyantar Dasha for mobile

## Key API Endpoints
### Public (no auth)
- `GET /api/mobile/panchang/today` (real Swiss Ephemeris)
- `GET /api/mobile/mantra-of-day`
- `POST /api/auth/admin/login`

### Authenticated
- `POST /api/kundli/generate`, `GET /api/kundli/my`
- `GET /api/dasha/current`, `POST /api/dasha/interpret`
- `GET /api/dosha/detect`, `POST /api/dosha/interpret`
- `GET /api/charts/d1-d9`
- `GET /api/insights/today`, `GET /api/notifications/today`
- `POST /api/tts/synthesize`, `GET /api/tts/providers`
- `POST /api/vedachat/message`
