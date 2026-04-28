# Sanatan Saathi — Expo Mobile App Setup Guide
## Step-by-Step Integration with Expo Go for Testing

---

## Prerequisites

Make sure you have these installed on your computer:

1. **Node.js** (v18+) — [Download here](https://nodejs.org)
2. **Expo Go app** on your phone:
   - **Android**: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - **iPhone**: [App Store](https://apps.apple.com/app/expo-go/id982107779)

---

## Step 1: Download the Expo App Code

Download the `expo-app` folder from this platform. You can:
- Use "Save to Github" in Emergent, then clone the repo
- Or download the code and copy the `/expo-app` folder to your local machine

---

## Step 2: Open in VS Code

```bash
cd /path/to/sanatan-saathi/expo-app
code .
```

---

## Step 3: Install Dependencies

Open terminal in VS Code and run:

```bash
# Install all dependencies
npm install

# OR if you prefer yarn
yarn install
```

This installs: expo, react-navigation, zustand, @tanstack/react-query, expo-av, etc.

---

## Step 4: Verify API URL

The API is already configured to point to the live backend. Check the file:

**`src/config/api.js`**
```javascript
export const API_BASE_URL = 'https://integrated-platform-13.preview.emergentagent.com/api';
```

> **Note**: This URL points to the deployed backend. All your admin panel data (Chalisas, Vedas, Granth content) will be available in the mobile app.

---

## Step 5: Start the Expo Development Server

```bash
npx expo start
```

You'll see a QR code in the terminal.

---

## Step 6: Open on Your Phone

### Android:
1. Open **Expo Go** app on your Android phone
2. Tap **Scan QR Code**
3. Scan the QR code from the terminal
4. The app will load!

### iPhone:
1. Open your **Camera** app
2. Point it at the QR code in the terminal
3. Tap the notification "Open in Expo Go"
4. The app will load!

> **Important**: Your phone and computer must be on the **same WiFi network**.

---

## Step 7: Test the App

Once the app loads, you should see:

### Home Tab
- Daily greeting with current Panchang
- Daily Shloka card
- 8-category grid (Chalisa, Vedic Mantra, Ashtakam, etc.)

### Vedic Mantras Tab
- 8 category tiles (Vedic Mantras, Chalisa, Ashtakam, etc.)
- Click a category → see list of items
- Click an item → see full content with:
  - Sanskrit text
  - Transliteration
  - Meaning (based on selected language)
  - Beginner/Expert mode toggle

### Divya Granth Tab
- Bhagavad Gita, Ramcharitmanas, Mahabharata
- Click → see chapters → click chapter → read verses

### Vedas & Puranas Tab
- Rig Veda, Sama Veda, Yajur Veda, Atharva Veda
- Hierarchical navigation: Book → Mandala/Kanda → Verse

### VedaChat Tab
- AI-powered chatbot
- Ask questions about scriptures
- Get answers with Shloka references (Book, Chapter, Verse)

---

## Step 8: Language Selection

On first launch, you can set your preferred language:
- Go to Profile/Settings
- Select language (Hindi, English, Sanskrit, etc.)
- All content will filter based on your language selection

---

## Troubleshooting

### "Network request failed"
- Ensure your phone is on the same WiFi as your computer
- The API URL in `src/config/api.js` should be `https://integrated-platform-13.preview.emergentagent.com/api`
- This is a public URL, so it works from any network

### "Module not found"
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### App shows blank screen
```bash
# Check for errors in terminal
npx expo start --clear
```

---

## Building for Production (APK/IPA)

### Android APK (for testing):
```bash
npx eas build --profile preview --platform android
```

### iOS Build:
```bash
npx eas build --profile preview --platform ios
```

> **Note**: You'll need an [Expo account](https://expo.dev/signup) and for iOS, an Apple Developer account ($99/year).

---

## App Screens → API Mapping

| Screen | API Endpoint |
|---|---|
| Home - Daily Shloka | `GET /api/home/today` |
| Home - Categories | `GET /api/home/categories` |
| Category List | `GET /api/content/items-by-lang?category=chalisa&lang=hi` |
| Content Detail | `GET /api/content/verses-by-lang/{id}?lang=hi&mode=beginner` |
| Granth Books | `GET /api/granth/books` |
| Granth Chapters | `GET /api/granth/hierarchy/{book_id}` |
| Granth Verses | `GET /api/granth/chapter-verses/{chapter_id}?lang=hi` |
| Vedas Books | `GET /api/vedas/books` |
| Vedas Chapters | `GET /api/vedas/hierarchy/{book_id}` |
| Vedas Verses | `GET /api/vedas/chapter-verses/{chapter_id}?lang=hi` |
| Smart Search | `GET /api/search?q=keyword&lang=hi` |
| VedaChat Message | `POST /api/vedachat/message` |
| Languages | `GET /api/languages` |

---

## What's Included in the Expo App

| Feature | Status |
|---|---|
| Home Screen with daily content | Built |
| 5-Tab Navigation | Built |
| Vedic Mantras (8 categories) | Built |
| Content Detail with Beginner/Expert | Built |
| Divya Granth reader | Built |
| Vedas & Puranas browser | Built |
| VedaChat AI | Built |
| Language selection | Built |
| Audio player (placeholder) | Built |
| Auth screen | Built |

---

*For any questions, reach out in the Emergent chat. Happy testing!*
