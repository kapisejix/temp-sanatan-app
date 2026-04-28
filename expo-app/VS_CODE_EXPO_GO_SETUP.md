# Sanatan Saathi — VS Code + Expo Go Setup

A complete walkthrough to run the mobile app on **your phone** using **Expo Go** while you develop in **VS Code**.

---

## ✅ What you'll get

- Mobile app running on your **physical Android/iOS phone**
- **Hot reload** (save in VS Code → app updates instantly)
- **Live backend** connection to your Sanatan Saathi server
- **Real Panchang, Kundli, Dasha, Mantra** data (not just mock)

---

## 📋 Prerequisites

| What | Why | How |
|------|-----|-----|
| **Node.js 18+** | Run JS tools | https://nodejs.org/ |
| **Yarn** | Package manager | `npm install -g yarn` |
| **VS Code** | Editor | https://code.visualstudio.com/ |
| **Expo Go app on phone** | Run app | [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS App Store](https://apps.apple.com/app/expo-go/id982107779) |
| **Same Wi-Fi** | Phone & computer must be on same network | — |

---

## 🚀 Step-by-step (first time only)

### 1. Get the project on your computer

```bash
# Option A — git clone (if you have access)
git clone <your-repo-url> sanatan-saathi
cd sanatan-saathi

# Option B — Emergent platform: use "Save to GitHub" feature, then clone the repo
# Option C — download zip, extract it
```

### 2. Open in VS Code

```bash
code .
```

### 3. Install recommended VS Code extensions

Open the **Extensions** panel (`Ctrl+Shift+X` / `Cmd+Shift+X`) and install:

- **ES7+ React/Redux/React-Native snippets** (`dsznajder.es7-react-js-snippets`)
- **React Native Tools** (`msjsdiag.vscode-react-native`)
- **Prettier — Code formatter** (`esbenp.prettier-vscode`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Expo Tools** (`expo.vscode-expo-tools`)

### 4. Install dependencies

In the VS Code terminal (`Ctrl+\`` / `Cmd+\``):

```bash
cd expo-app
yarn install
```

### 5. Configure backend URL

Open `expo-app/src/config/api.js` and verify:

```js
export const API_BASE_URL = 'https://integrated-platform-13.preview.emergentagent.com/api';
```

If you've deployed the backend somewhere else, change this URL. Then save (`Ctrl+S`).

### 6. Start the Expo dev server

```bash
npx expo start
```

You'll see something like:

```
› Metro waiting on exp://192.168.1.5:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
[QR code rendered in terminal]
```

### 7. Open on your phone

- **Android**: Open **Expo Go** → tap **Scan QR code** → point camera at the QR in your terminal
- **iOS**: Open **Camera** → point at the QR → tap the banner that appears → it opens in Expo Go

The app loads in 10-30 seconds. You'll see the **Sanatan Saathi** Home screen with live "आज का उपाय", real Panchang, and your Kundli data.

---

## 🔥 Hot Reload Workflow

Once running, every time you **save** a file in VS Code:

1. Metro bundler rebuilds (1-2 seconds)
2. Phone auto-reloads with your changes

Try editing `expo-app/src/screens/v2/HomeScreen.js` — change `नमस्ते 🙏` to `Hari Om 🙏` and save. Your phone shows the change instantly.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| **QR doesn't scan** | Both phone and computer must be on the **same Wi-Fi**. Disable VPN. |
| **"Network response timed out"** | Restart Metro: press `r` in the terminal where `expo start` is running. |
| **Connection refused on phone** | Run `npx expo start --tunnel` to use Expo's tunnel (works through firewalls). Slower but works on different networks. |
| **App stuck on splash** | Shake phone → tap "Reload" in Expo Go menu. |
| **Wrong API URL** | Check `src/config/api.js` and restart Expo with `r` key. |
| **Module not found errors** | `yarn install` again, then restart Expo. |
| **Hindi text not rendering** | Some old phones miss Devanagari fonts — install Google Indic Keyboard. |

### Common commands while Metro is running

In the terminal where `expo start` is running:

| Key | Action |
|-----|--------|
| `r` | Reload app |
| `j` | Open debugger |
| `m` | Toggle menu |
| `?` | Show all commands |
| `Ctrl+C` | Stop server |

---

## 🌐 Tunnel mode (different Wi-Fi)

If your phone and computer are on different networks (or corporate Wi-Fi blocks LAN):

```bash
npx expo start --tunnel
```

This routes traffic through Expo's servers — slower, but works everywhere. First run requires `npx expo install @expo/ngrok` (Expo will prompt automatically).

---

## 📱 What to test once connected

1. **Home screen** — आज का उपाय shows today's mantra (live from backend)
2. **Home → Panchang card** — shows real-time Tithi, Nakshatra, Yoga, Rahu Kaal
3. **Kundli tab → Overview** — your real Graha scores + Doshas (auto-logged-in as admin)
4. **Kundli tab → Analysis** — live Vimshottari Mahadasha + Antardasha
5. **AI Chat (floating 🤖)** — talk to VedaChat AI live (Claude-powered)

---

## 🏗️ Building APK / IPA for distribution

When ready to share with friends or publish:

```bash
# Free Expo account first
npx expo login

# Android APK (preview)
npx eas build --platform android --profile preview

# iOS TestFlight (requires Apple Developer account ~$99/yr)
npx eas build --platform ios --profile preview
```

EAS gives you a download link. Share with anyone.

---

## 🔐 Authentication

The mobile app currently **auto-logs in** as the demo admin (`admin@sanatansaathi.com`) on first launch. Token is stored in `AsyncStorage`. To change:

1. Open `expo-app/src/api/client.js`
2. Edit `DEFAULT_EMAIL` and `DEFAULT_PASSWORD`
3. Or implement a login screen that calls `api.loginDefault()` with user-entered credentials

---

## 📚 Folder structure (for VS Code navigation)

```
expo-app/
├── App.js                       ← Entry: bottom tabs + AIChat modal
├── package.json
├── src/
│   ├── api/client.js            ← Axios + auto-login + interceptors
│   ├── config/api.js            ← Backend URL + COLORS
│   ├── data/mockData.js         ← Fallback data when API unreachable
│   ├── hooks/useApiData.js      ← React hook with API + fallback
│   ├── components/
│   │   └── FloatingAIButton.js  ← Bottom-right 🤖
│   └── screens/v2/
│       ├── HomeScreen.js
│       ├── BhaktiScreen.js
│       ├── KundliScreen.js
│       ├── PanchangScreen.js
│       ├── ProfileScreen.js
│       └── AIChatScreen.js
```

---

## 💡 Pro Tips

- **Pin your phone next to your computer** for fast iteration
- **Use `console.log()`** — output appears in the Expo terminal
- **Shake phone in Expo Go** to access dev menu (Reload, Performance Monitor, Element Inspector)
- **Use `react-native-debugger`** (separate download) for full breakpoint debugging

---

## ❓ FAQ

**Q: Do I need a Mac to test on iPhone?**
A: No — Expo Go runs on iPhone without Xcode. Mac is only needed for **App Store submissions**.

**Q: Can I test on multiple phones at once?**
A: Yes — just scan the same QR code from each phone.

**Q: How do I see backend logs while developing?**
A: On Emergent platform, check the deployment dashboard. Locally, `tail -f /var/log/supervisor/backend.*.log`.

**Q: Will hot reload break my Kundli state?**
A: Save state survives reload via `AsyncStorage`. If state breaks, just shake phone → Reload.

---

Happy building 🙏  → सनातन साथी
