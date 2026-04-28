# Expo App Setup - Step by Step (Visual Studio Code)

## Prerequisites (Install Once)

### 1. Install Node.js
- Go to https://nodejs.org
- Download **LTS version** (18 or above)
- Install and verify: open Terminal → type `node --version`

### 2. Install VS Code
- Go to https://code.visualstudio.com
- Download and install for your OS

### 3. Install Expo Go on Your Phone
- **Android**: Open Play Store → Search "Expo Go" → Install
- **iPhone**: Open App Store → Search "Expo Go" → Install

---

## Setup Steps

### Step 1: Download the Project Code

**Option A**: From Emergent Platform
- Click "Download Code" from the Emergent chat
- Extract the ZIP file
- The `expo-app/` folder is your mobile app project

**Option B**: From GitHub (if you saved to GitHub)
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/expo-app
```

### Step 2: Open in VS Code

```bash
# Open VS Code and go to:
# File → Open Folder → Select the "expo-app" folder

# Or from Terminal:
cd expo-app
code .
```

### Step 3: Install Dependencies

Open VS Code Terminal (Ctrl+` or Terminal → New Terminal):

```bash
npm install
```

Wait for installation to complete (1-2 minutes).

### Step 4: Configure API URL

Open `src/config/api.js` in VS Code and update:

```javascript
// Replace with your deployed backend URL
export const API_BASE_URL = 'https://spiritual-platform-3.preview.emergentagent.com/api';

// Add your MSG91 credentials (from MSG91 dashboard)
export const MSG91_WIDGET_ID = 'YOUR_WIDGET_ID';
export const MSG91_AUTH_TOKEN = 'YOUR_AUTH_TOKEN';
```

### Step 5: Start the App

In VS Code Terminal:

```bash
npx expo start
```

You'll see a QR code in the terminal.

### Step 6: Open on Your Phone

**Android:**
- Open Expo Go app on your phone
- Tap "Scan QR Code"
- Scan the QR code from VS Code terminal
- App opens on your phone!

**iPhone:**
- Open your iPhone Camera app
- Point at the QR code
- Tap the "Open in Expo Go" banner
- App opens on your phone!

**IMPORTANT**: Your phone and computer must be on the same WiFi network.

---

## VS Code Recommended Extensions

Install these for better development experience:

1. **ES7+ React/Redux/React-Native Snippets** - Quick code snippets
2. **Prettier** - Code formatting
3. **React Native Tools** - Debugging support
4. **Color Highlight** - Preview colors in code

To install: VS Code → Extensions (Ctrl+Shift+X) → Search name → Install

---

## Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "npx expo start" fails | Run `npm install -g expo-cli` first |
| QR code doesn't scan | Make sure phone & PC are on same WiFi |
| "Network request failed" | Check API_BASE_URL in config/api.js |
| Blank white screen | Check Terminal for errors, restart with `npx expo start --clear` |
| Expo Go crashes | Update Expo Go app from App Store/Play Store |
| iOS simulator (Mac) | Press `i` in terminal after `npx expo start` |
| Android emulator | Press `a` in terminal after `npx expo start` |

---

## Testing Without MSG91

For testing login without MSG91 OTP:
1. In `AuthScreen.js`, the OTP flow is commented out
2. You can use the backend's fallback OTP: call `POST /api/auth/user/send-otp` → it returns `debug_otp` in response
3. Use that OTP to verify via `POST /api/auth/user/verify-otp`

---

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK for Android
eas build --platform android --profile preview

# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Submit to Google Play
eas submit --platform android

# Submit to Apple App Store
eas submit --platform ios
```

---

## Project Files to Modify

| What to Change | File |
|----------------|------|
| API URL & Config | `src/config/api.js` |
| Colors & Theme | `src/config/api.js` → COLORS |
| Login Screen | `src/screens/AuthScreen.js` |
| Home Screen | `src/screens/HomeScreen.js` |
| Add New Screen | Create in `src/screens/` → Add to `App.js` |
| Audio Player | `src/components/AudioPlayer.js` |

---

## Next Steps After Setup

1. Test all screens on your phone
2. Add MSG91 OTP credentials
3. Customize branding (logo, splash screen)
4. Upload content via admin panel → it appears in the app
5. Build production APK/IPA for store submission
