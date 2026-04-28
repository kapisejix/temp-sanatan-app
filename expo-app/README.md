# Sanatan Saathi — Mobile App (Expo)

A React Native mobile app for spiritual guidance, Kundli insights, Bhakti content, and AI chat.

## 🎯 Features

- **5 Bottom Tabs**: Home, Bhakti, Kundli, Panchang, Profile
- **Floating AI Chat** button on all screens
- **Hindi-primary** UI with multilingual content
- **Mock data** today (replace with backend `/api/...` later)
- Audio support via Expo AV

---

## 📲 Run on your phone (Expo Go)

### One-time setup (on your computer)

1. Install Node.js 18+ and Yarn.
2. Install Expo CLI globally:
   ```bash
   npm install -g expo-cli
   ```
3. Install dependencies:
   ```bash
   cd expo-app
   yarn install
   ```

### Start the dev server

```bash
cd expo-app
npx expo start
```

A QR code will appear in your terminal.

### Open on your phone

- **Android**: Install **Expo Go** from Play Store → open Expo Go → scan the QR code.
- **iOS**: Install **Expo Go** from App Store → scan the QR code with Camera app → tap the banner to open in Expo Go.

> Both phone and computer must be on the same Wi-Fi.

---

## 📂 Project Structure

```
expo-app/
├── App.js                          # Bottom tab navigator + AIChat modal
├── package.json                    # expo, react-navigation, expo-av
├── src/
│   ├── components/
│   │   └── FloatingAIButton.js     # Bottom-right floating AI button
│   ├── config/
│   │   └── api.js                  # Backend URL + COLORS theme
│   ├── data/
│   │   └── mockData.js             # All mock JSON data
│   ├── screens/v2/
│   │   ├── HomeScreen.js           # आज का उपाय / दशा / पंचांग / Quick / Trending
│   │   ├── BhaktiScreen.js         # Search / Deities / Daily / Types
│   │   ├── KundliScreen.js         # Top tabs: Overview / Charts / Analysis / Remedies
│   │   ├── PanchangScreen.js       # Top tabs: Today / Monthly / Festivals / Muhurat
│   │   ├── ProfileScreen.js        # User profile + settings
│   │   └── AIChatScreen.js         # Modal AI chat with suggested prompts
│   └── store/                      # Auth (legacy, unused for now)
└── assets/                         # icons & splash
```

---

## 🔌 Connect to Real Backend (Optional)

Edit `src/config/api.js`:

```js
export const API_BASE_URL = 'https://YOUR-BACKEND-URL/api';
```

Then in any screen, replace mock imports with `axios` calls:

```js
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const { data } = await axios.get(`${API_BASE_URL}/insights/today`);
```

Available backend endpoints:
- `GET /api/insights/today`
- `GET /api/dasha/current`
- `GET /api/dosha/detect`
- `GET /api/charts/d1-d9`
- `GET /api/recommendations/mantra`
- `POST /api/tts/synthesize`
- `POST /api/vedachat/message`

---

## 🎨 Theme

Defined in `src/config/api.js`:

| Token            | Value     | Use                              |
|------------------|-----------|----------------------------------|
| `primary`        | `#E95A34` | Saffron-orange (Sanatan)         |
| `background`     | `#F8F3F1` | Warm cream                       |
| `surface`        | `#FFFFFF` | Cards                            |
| `text`           | `#374652` | Body                             |
| `accent`         | `#FEF0EC` | Light saffron tint               |

---

## 🧪 Test Checklist

- [ ] Run `npx expo start` → QR appears
- [ ] Scan with Expo Go on Android & iOS
- [ ] All 5 tabs load (Home, Bhakti, Kundli, Panchang, Profile)
- [ ] Floating 🤖 button opens AI Chat modal
- [ ] Kundli screen — top tabs (Overview/Charts/Analysis/Remedies) switch correctly
- [ ] Panchang screen — top tabs (Today/Monthly/Festivals/Muhurat) switch correctly
- [ ] Audio plays from `▶ सुनें` button on Home

---

## 🚀 Build for Stores

```bash
# Android (APK)
npx eas build --platform android --profile preview

# iOS (TestFlight)
npx eas build --platform ios --profile preview
```

Requires free Expo account.
