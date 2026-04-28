# SanatanSaathi - Expo Mobile App

## Quick Start

```bash
# 1. Copy this folder to your local machine
# 2. Install dependencies
npm install

# 3. Install iOS pods (Mac only)
cd ios && pod install && cd ..

# 4. Start Expo
npx expo start
```

## Project Structure

```
expo-app/
├── App.js                          # Main entry - 5-tab navigation + auth
├── package.json                    # Dependencies
├── src/
│   ├── config/
│   │   └── api.js                  # API URL, MSG91 config, colors, theme
│   ├── store/
│   │   └── authStore.js            # Zustand auth state + API client
│   └── screens/
│       ├── AuthScreen.js           # Phone OTP login (MSG91 widget)
│       ├── HomeScreen.js           # Daily shloka, panchang, category grid
│       ├── VedicMantrasScreen.js   # Category tiles (7 categories)
│       ├── CategoryListScreen.js   # Content list for a category
│       ├── ContentDetailScreen.js  # Verse reader (Beginner/Expert mode)
│       ├── DivyaGranthScreen.js    # Sacred texts (Gita, Ramayana, Mahabharata)
│       ├── VedasScreen.js          # Vedas & Puranas browser
│       └── VedaChatScreen.js       # AI chat (Claude Sonnet 4.5)
```

## Configuration

1. Open `src/config/api.js`
2. Set your `API_BASE_URL` to your deployed backend
3. Set `MSG91_WIDGET_ID` and `MSG91_AUTH_TOKEN` from MSG91 dashboard

## Backend API Endpoints Used

| Screen | Endpoints |
|--------|-----------|
| Home | `GET /api/home/daily`, `GET /api/home/categories` |
| Category List | `GET /api/content/items?category=...` |
| Content Detail | `GET /api/content/items/{id}`, `GET /api/content/items/{id}/verses` |
| Verse Meanings | `GET /api/content/verses/{id}/meanings` |
| Divya Granth | `GET /api/granth/books` |
| Vedas | `GET /api/vedas/books` |
| VedaChat | `POST /api/vedachat/message` |
| Auth (OTP) | `POST /api/auth/user/msg91-verify` |
| Auth (Google) | `POST /api/auth/user/google` |

## Next Steps to Add

1. **Audio Player** - `expo-av` for verse playback with highlighting
2. **Profile Screen** - User settings, saved shlokas, reading history
3. **Daily Routine** - Saved shloka list with reorder
4. **Share** - Shloka card image sharing to WhatsApp/Facebook
5. **Push Notifications** - Daily mantra reminders
6. **Streak Widget** - Gamification streak display on home
