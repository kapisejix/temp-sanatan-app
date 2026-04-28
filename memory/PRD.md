# Sanatan Saathi — PRD

## Vision
Multilingual spiritual platform: React Admin Panel + FastAPI Backend + Expo Mobile App with AI + Rule-Based Astrology Intelligence.

## Sessions

### Session 1: Foundation (existing GitHub import + Multilingual + Import Wizard + Granth Manager)
### Session 2: Vedas & VedaChat AI (hierarchical scripture + Claude knowledge-grounded chat)
### Session 3: Smart Search + Expo skeleton
### Session 4: Graha-based Mantra + Multilingual TTS (Google/OpenAI/ElevenLabs switchable)
### Session 5: AI + Rule-Based Astrology Intelligence
- Vimshottari Dasha Engine (MD+AD, 5-domain impact)
- Dosha Detection (Mangal/Kaal Sarp/Sade Sati real Saturn transit)
- D9 Navamsa Engine
- AI Hybrid Interpreter (Claude rule-bound, 2-4 line, no hallucination)
- North Indian Kundli SVG (D1+D9)
- Dashboard "वर्तमान दशा प्रभाव"

### Session 6: Voice + Mobile App (Feb 2026 — current)
- **VedaChat Voice (Web)**:
  - `useSpeechRecognition` hook — browser SpeechRecognition Web API (Chrome/Edge), 9-language picker
  - Auto-detect Devanagari for TTS language routing
  - `SpeakerButton` plays AI answers via `/api/tts/synthesize`
  - "उत्तर सुनाएँ (auto-speak)" toggle for hands-free experience
- **Mobile App** (`/app/expo-app/` — Expo, mock data first):
  - 5 bottom tabs: Home, Bhakti, Kundli, Panchang, Profile
  - Floating AI Chat button (bottom-right, all screens)
  - HomeScreen: आज का उपाय (with Play + Why?), वर्तमान दशा प्रभाव, आज का पंचांग, Quick Actions, Trending Bhakti
  - BhaktiScreen: search, deity grid (6 deities), daily morning/evening, types grid (6 types)
  - KundliScreen: 4 top tabs (Overview/Charts/Analysis/Remedies) — score bars, dosha summary, D1/D9 placeholder, predictions, audio remedy
  - PanchangScreen: 4 top tabs (Today/Monthly/Festivals/Muhurat)
  - ProfileScreen: profile + settings + about
  - AIChatScreen: modal with suggested prompts, mock conversational AI
  - Mock data via `src/data/mockData.js` (TODAY_UPAYA, CURRENT_DASHA, TODAY_PANCHANG, TRENDING_BHAKTI, DEITIES, BHAKTI_TYPES, KUNDLI_OVERVIEW, MONTHLY_PANCHANG, FESTIVALS, MUHURATS)
  - Audio playback via Expo AV
  - Setup README with QR / Expo Go instructions

## Architecture
- Backend: FastAPI + MongoDB (this platform)
- Admin Panel: React.js (this platform)
- Mobile App: Expo/React Native (user runs locally, scans Expo Go QR)
- AI: Claude via Emergent LLM Key (VedaChat, DOCX parse, astrology rule-bound interpreter)
- Astrology: Swiss Ephemeris (`pyswisseph`) — deterministic, no LLM
- TTS: Switchable (Google / OpenAI / ElevenLabs)
- Voice Input: Browser Web Speech API (free, no SDK)

## Backlog
### P1
- [ ] User-level Kundli (currently per-admin) — required for mobile app real users
- [ ] APScheduler + push notifications (Dasha change, Sade Sati start, daily reminders)
- [ ] Google Cloud TTS service account JSON (user must provide via Integration Hub)
- [ ] Connect mobile app screens to live backend (replace mockData with axios)

### P2
- [ ] Pratyantardasha (3rd-level dasha)
- [ ] D7/D10 charts; Yoga detection (Raj/Dhana/Gajakesari)
- [ ] Refactor `server.py` (~5050 lines) → `routes/` modules
- [ ] Mobile app: deep-link integration, biometric auth
- [ ] Expo build configs (EAS) for Play Store + App Store
- [ ] Server-side bulk write optimisation

## Key API Endpoints
- `POST /api/kundli/generate`, `GET /api/kundli/my`
- `GET /api/dasha/current`, `POST /api/dasha/interpret`
- `GET /api/dosha/detect`, `POST /api/dosha/interpret`
- `GET /api/charts/d1-d9`
- `GET /api/insights/today`
- `GET /api/notifications/today`
- `POST /api/tts/synthesize`, `GET /api/tts/providers`
- `POST /api/vedachat/message`
