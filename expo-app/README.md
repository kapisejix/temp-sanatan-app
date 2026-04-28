# Sanatan Saathi — Mobile App (Expo)

A React Native mobile app for spiritual guidance, Kundli insights, Bhakti content, and AI chat — connected to live backend.

## ✨ Key Features

- **5 Bottom Tabs**: Home / Bhakti / Kundli / Panchang / Profile
- **Bhakti deep navigation**: Deity → Content (Aarti/Chalisa/Mantra) → Play
- **Explore section**: Kathas / Granth (Gita/Ramayana/Mahabharata) / Vedas & Puranas
- **Floating 🤖 AI Chat** on every screen
- **Live data** from backend (Panchang, Kundli, Dasha, Doshas, Mantras)
- **Audio playback** via Expo AV (TTS-powered when configured)
- **SafeArea** properly handled on all phones (no status bar / button overlap)
- **Hindi-primary UI** with English subtitles

---

## 📲 Quick Start (5 minutes)

### 1. Install dependencies

```bash
cd expo-app
yarn install
```

### 2. Start dev server

```bash
npx expo start
```

A QR code appears.

### 3. Open on phone

Install **Expo Go** ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)) → scan the QR code.

> Phone & computer must be on same Wi-Fi. If not, use `npx expo start --tunnel`.

📖 **Detailed setup**: see `VS_CODE_EXPO_GO_SETUP.md`

---

## 🧪 Test Flows (all should work)

| # | Flow | Expected |
|---|------|----------|
| 1 | Bhakti → Hanuman → Hanuman Chalisa → ▶ Play | Full text + audio playback |
| 2 | Bhakti → Explore → Kathas → Satyanarayan → 📖 Read / 🎧 Listen | Toggle works |
| 3 | Bhakti → Explore → Granth → Bhagavad Gita → Chapter 1 (अर्जुन विषाद योग) → Verses | Real backend verses |
| 4 | Bhakti → Explore → Vedas & Puranas → Rig Veda → Sukta list | List of suktas |
| 5 | Home → Quick Action "मेरी कुंडली" | Switches to Kundli tab |
| 6 | Floating 🤖 → Suggested prompt → AI replies | Live VedaChat |
| 7 | Kundli → Overview | Real Graha scores + Doshas |
| 8 | Kundli → Analysis | Real Mahadasha + Antardasha |
| 9 | Panchang → Today | Real Tithi/Nakshatra/Yoga/Rahu Kaal (Swiss Ephemeris) |

---

## 🗂️ Folder Structure

```
expo-app/
├── App.js                              ← 5 bottom tabs + per-tab Stack + AIChat modal
├── package.json
├── VS_CODE_EXPO_GO_SETUP.md            ← Full step-by-step setup
├── GOOGLE_CLOUD_TTS_SETUP.md           ← Audio TTS configuration
└── src/
    ├── api/
    │   └── client.js                   ← Axios + auto-login + interceptors
    ├── config/
    │   └── api.js                      ← Backend URL + COLORS
    ├── data/
    │   └── mockData.js                 ← Fallback data + Hanuman/Shiva content
    ├── hooks/
    │   └── useApiData.js               ← Live API + mock fallback
    ├── components/
    │   ├── SafeScreen.js               ← Wraps every screen with SafeAreaView
    │   ├── ScreenHeader.js             ← Back button + title
    │   └── FloatingAIButton.js
    └── screens/v2/
        ├── HomeScreen.js
        ├── BhaktiScreen.js              ← Deity grid + Daily + Explore
        ├── DeityDetailScreen.js         ← Per-deity: Aarti/Chalisa/Mantra/Stotram
        ├── ContentDetailScreen.js       ← Full text + ▶ Audio
        ├── KathasScreen.js
        ├── KathaDetailScreen.js         ← 📖 Read / 🎧 Listen toggle
        ├── GranthListScreen.js          ← Live: Gita/Ramayana/Mahabharata
        ├── GranthChaptersScreen.js
        ├── GranthVersesScreen.js        ← Sanskrit + Hindi + ▶ verse audio
        ├── VedasPuranasScreen.js        ← 4 Vedas + Puranas grid
        ├── VedaSuktasScreen.js
        ├── PuranaDetailScreen.js
        ├── KundliScreen.js              ← Overview/Charts/Analysis/Remedies
        ├── PanchangScreen.js            ← Today/Monthly/Festivals/Muhurat
        ├── ProfileScreen.js
        └── AIChatScreen.js              ← Modal AI chat
```

---

## 🧭 Navigation Architecture (this is what was fixed)

**Per-tab Stack** — each tab has its own Stack so deep navigation works correctly:

```
Tabs (Bottom)
 ├─ HomeTab → HomeStack → HomeScreen
 ├─ BhaktiTab → BhaktiStack
 │              ├─ BhaktiRoot
 │              ├─ DeityDetail → ContentDetail
 │              ├─ Kathas → KathaDetail
 │              ├─ GranthList → GranthChapters → GranthVerses
 │              └─ VedasPuranas → VedaSuktas / PuranaDetail
 ├─ KundliTab → KundliStack → KundliScreen
 ├─ PanchangTab → PanchangStack → PanchangScreen
 └─ ProfileTab → ProfileStack → ProfileScreen

RootStack (modal layer)
 └─ AIChat (modal, accessible from any tab)
```

All screens wrapped in `<SafeScreen>` (which uses `react-native-safe-area-context`) — **no UI overlap with status bar or home indicator**.

---

## 🔊 Audio

Uses **Expo AV** with TTS audio from backend (`/api/tts/synthesize`).

To activate audio playback, configure Google Cloud TTS — see `GOOGLE_CLOUD_TTS_SETUP.md`.

Without TTS configured, ▶ buttons gracefully show error message (no crash).

---

## 🌐 Backend Integration

Configured in `src/config/api.js`:

```js
export const API_BASE_URL = 'https://integrated-platform-13.preview.emergentagent.com/api';
```

Endpoints used (auto-login as admin via `/api/auth/admin/login`):

| Screen | Endpoint |
|--------|----------|
| Home | `/mobile/mantra-of-day`, `/mobile/panchang/today`, `/insights/today` |
| Kundli Overview | `/kundli/my` |
| Kundli Analysis | `/dasha/current` |
| Granth List | `/granth/books` |
| Granth Chapters | `/granth/hierarchy/{book_id}` |
| Granth Verses | `/granth/chapter-verses/{chapter_id}` |
| Vedas | `/vedas/books`, `/vedas/hierarchy/{id}` |
| Panchang | `/mobile/panchang/today` |
| AI Chat | `/vedachat/message` |
| Audio | `/tts/synthesize` |

Falls back to local mock data if backend unreachable.

---

## 💡 Tip — Testing on real device while developing

1. Run `npx expo start` in VS Code terminal
2. Edit any file in `src/screens/v2/`
3. **Save** → app on phone updates automatically

Press `r` in terminal to force reload, `j` to open debugger, `m` for menu.
