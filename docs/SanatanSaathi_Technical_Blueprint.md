# Sanatan Saathi — Technical Development Blueprint
## Version 1.0 | Prepared by E1 Agent | January 2026

---

# TABLE OF CONTENTS

1. [Project Understanding & Vision](#1-project-understanding--vision)
2. [Architecture Overview](#2-architecture-overview)
3. [What We Build Here vs Expo Mobile](#3-what-we-build-here-vs-expo-mobile)
4. [Database Schema (MongoDB Collections)](#4-database-schema)
5. [Backend API Endpoints](#5-backend-api-endpoints)
6. [Admin Panel — Screens & Flows](#6-admin-panel)
7. [AI Integrations](#7-ai-integrations)
8. [Authentication & Role System](#8-authentication--role-system)
9. [Content Pipeline (DOCX/PDF Parsing)](#9-content-pipeline)
10. [Mobile App (Expo) — Integration Guide](#10-mobile-app-expo-guide)
11. [Development Phases & Timeline](#11-development-phases)
12. [Setup Instructions for Local Development](#12-setup-instructions)

---

# 1. PROJECT UNDERSTANDING & VISION

## What is Sanatan Saathi?
Sanatan Saathi is a **comprehensive digital spiritual companion for Sanatan Dharma** — a platform where devotees can:
- **Read & Listen** to Vedic Mantras, Chalisas, Ashtakams, Artis, Kathas in 12+ Indian languages
- **Learn** through Beginner/Expert modes with word-by-word breakdown, transliteration, and meanings
- **Practice** daily spiritual routines with personalized mantra lists
- **Ask** scripture-based questions to an AI agent (VedaChat powered by Claude)
- **Create & Share** beautiful shloka video cards on social media
- **Explore** sacred texts (Bhagavad Gita, Ramayana, Mahabharata, Vedas, Puranas)

## Core Value Proposition
- One app for ALL spiritual content (not scattered across multiple apps)
- AI-powered learning (VedaChat answers from actual scriptures with verse references)
- Beginner-friendly with Expert depth
- 12+ language support with Sanskrit original + transliteration + meaning
- Daily routine builder for consistent spiritual practice

## Target Users
| User Type | Description | Key Features |
|---|---|---|
| **Beginner Devotee** | New to scriptures, wants to learn basics | Beginner mode, word breakdown, slow TTS, daily routine |
| **Expert Practitioner** | Regular practitioner, knows shlokas | Expert mode, continuous play, minimal annotations |
| **Content Admin** | Manages spiritual content | Admin panel, DOCX upload, verse editing |
| **Scholar/Researcher** | Deep study of Vedas/Puranas | VedaChat AI, Vedas & Puranas section |

---

# 2. ARCHITECTURE OVERVIEW

```
+------------------------------------------------------------------+
|                    SANATAN SAATHI ARCHITECTURE                     |
+------------------------------------------------------------------+
|                                                                    |
|  +-----------------+     +------------------+     +--------------+ |
|  |  WEB ADMIN      |     |   BACKEND APIs   |     |  MOBILE APP  | |
|  |  (React.js)     |<--->|   (FastAPI)      |<--->|  (Expo/RN)   | |
|  |  Built Here     |     |   Built Here     |     |  Your VS Code| |
|  +-----------------+     +------------------+     +--------------+ |
|                                |                                   |
|                    +-----------+-----------+                       |
|                    |                       |                       |
|              +-----v------+    +----------v---------+              |
|              |  MongoDB    |    |  AI Services       |              |
|              |  Database   |    |  (Emergent LLM Key)|              |
|              |  20+ Colls  |    |  - Claude (Chat)   |              |
|              +-------------+    |  - Claude (Parser) |              |
|                                 |  - OpenAI TTS      |              |
|                                 |  - Nano Banana     |              |
|                                 |  - Sora 2 (Video)  |              |
|                                 +--------------------+              |
+------------------------------------------------------------------+
```

### Tech Stack Decisions

| Layer | Technology | Why |
|---|---|---|
| **Web Admin Frontend** | React.js + Tailwind CSS + Radix UI | Modern, component-based, responsive admin panel |
| **Backend API** | FastAPI (Python) | Fast, async, auto-docs (Swagger), great for AI integrations |
| **Database** | MongoDB | Document-based, flexible schema for varied content types (mantras, kathas, artis have different structures). Designed for easy migration to Supabase/PostgreSQL later |
| **AI Chat** | Claude (via Emergent Key) | Best for nuanced scripture understanding, multi-turn conversations |
| **AI Parsing** | Claude (via Emergent Key) | Excellent at extracting structured data from DOCX/PDF |
| **Text-to-Speech** | OpenAI TTS (via Emergent Key) | High-quality voices for Hindi/Sanskrit, no separate API key needed |
| **Image Generation** | Gemini Nano Banana (via Emergent Key) | Shloka card backgrounds, decorative images |
| **Video Generation** | Sora 2 (via Emergent Key) | Short shloka video reels |
| **Authentication** | JWT (JSON Web Tokens) | Stateless, works across web + mobile |

---

# 3. WHAT WE BUILD HERE vs EXPO MOBILE

## Built on This Platform (Web Admin + Backend)
Everything the mobile app needs to function:

| Component | Status | Description |
|---|---|---|
| Complete REST API | Built Here | All endpoints for content, auth, user, admin |
| Admin Panel | Built Here | Full web dashboard for content management |
| Database Schema | Built Here | All collections with sample data |
| VedaChat AI | Built Here | Claude-powered chatbot API |
| DOCX Parser | Built Here | Upload & parse pipeline |
| PDF Parser | Built Here | Vedas/Puranas extraction |
| TTS Generation | Built Here | Audio generation API |
| Image Generation | Built Here | Shloka card API |
| Auth System | Built Here | JWT-based, works with mobile |

## Built in Your VS Code (Expo Mobile App)
The mobile app consumes our APIs:

| Component | Where | What You Need |
|---|---|---|
| Expo Project Setup | Your VS Code | Expo CLI, React Native |
| 5-Tab Navigation | Your VS Code | expo-router |
| Home Screen | Your VS Code | Calls our `/api/home/*` endpoints |
| Vedic Mantras Screens | Your VS Code | Calls our `/api/content/*` endpoints |
| Divya Granth Screens | Your VS Code | Calls our `/api/granth/*` endpoints |
| Vedas & Puranas Screens | Your VS Code | Calls our `/api/vedas/*` endpoints |
| VedaChat Screen | Your VS Code | Calls our `/api/vedachat/*` endpoints |
| Audio Player | Your VS Code | expo-av + our audio URLs |
| Profile/Settings | Your VS Code | Calls our `/api/user/*` endpoints |

I will provide **complete Expo integration guide** with code snippets for each screen.

---

# 4. DATABASE SCHEMA (MongoDB Collections)

## 4.1 Content Collections

### `content_items` — Master Content Table
```json
{
  "_id": "ObjectId",
  "category": "chalisa | vedic_mantra | ashtakam | sahasranama | nama_ramayanam",
  "slug": "hanuman-chalisa",
  "title_hi": "हनुमान चालीसा",
  "title_en": "Hanuman Chalisa",
  "title_sa": "हनुमान् चालीसा",
  "deity": "Hanuman",
  "deity_hi": "हनुमान",
  "description_hi": "...",
  "description_en": "...",
  "thumbnail_url": "https://...",
  "audio_url": "https://...",
  "audio_duration_seconds": 420,
  "has_beginner_mode": true,
  "has_expert_mode": true,
  "total_verses": 40,
  "sort_order": 1,
  "is_active": true,
  "is_premium": false,
  "tags": ["daily", "popular", "hanuman"],
  "supported_languages": ["hi", "en", "sa", "mr", "gu", "ta", "te", "bn", "kn", "ml", "pa", "od"],
  "like_count": 0,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z",
  "created_by": "admin_user_id",
  "status": "draft | published | archived"
}
```

### `content_verses` — Verses/Shlokas
```json
{
  "_id": "ObjectId",
  "item_id": "content_item_id (ref)",
  "verse_num": 1,
  "verse_type": "doha | chaupai | shloka | mantra | stanza",
  "sanskrit_text": "श्रीगुरु चरन सरोज रज...",
  "transliteration": "Shri Guru Charan Saroj Raj...",
  "audio_url": "https://... (individual verse audio)",
  "audio_start_ms": 0,
  "audio_end_ms": 15000,
  "sort_order": 1,
  "is_active": true
}
```

### `verse_meanings` — Multilingual Meanings
```json
{
  "_id": "ObjectId",
  "verse_id": "content_verse_id (ref)",
  "language": "hi | en | mr | gu | ta | te | bn | kn | ml | pa | od",
  "meaning": "गुरु के चरण कमल की धूल से...",
  "word_breakdown": [
    {"word": "श्रीगुरु", "meaning_hi": "श्री गुरु", "meaning_en": "Revered Guru"},
    {"word": "चरन", "meaning_hi": "चरण", "meaning_en": "Feet"},
    {"word": "सरोज", "meaning_hi": "कमल", "meaning_en": "Lotus"},
    {"word": "रज", "meaning_hi": "धूल", "meaning_en": "Dust"}
  ]
}
```

## 4.2 Katha & Puja Collections

### `katha_items`
```json
{
  "_id": "ObjectId",
  "title_hi": "सत्यनारायण कथा",
  "title_en": "Satyanarayan Katha",
  "deity": "Vishnu",
  "deity_hi": "विष्णु",
  "thumbnail_url": "https://...",
  "intro_text_hi": "...",
  "intro_text_en": "...",
  "puja_vidhi": [
    {"step": 1, "text_hi": "स्नान करें", "text_en": "Take bath"},
    {"step": 2, "text_hi": "...", "text_en": "..."}
  ],
  "samagri": [
    {"item_hi": "अक्षत (चावल)", "item_en": "Rice", "quantity": "100g"},
    {"item_hi": "हल्दी", "item_en": "Turmeric", "quantity": "1 packet"}
  ],
  "total_chapters": 5,
  "sort_order": 1,
  "is_active": true,
  "status": "published"
}
```

### `katha_verses`
```json
{
  "_id": "ObjectId",
  "katha_id": "katha_item_id (ref)",
  "chapter_num": 1,
  "chapter_name_hi": "प्रथम अध्याय",
  "chapter_name_en": "Chapter 1",
  "verse_num": 1,
  "text_hi": "...",
  "text_sa": "...",
  "meaning_hi": "...",
  "meaning_en": "...",
  "audio_url": "https://..."
}
```

## 4.3 Arti Collections

### `arti_items`
```json
{
  "_id": "ObjectId",
  "title_hi": "ॐ जय जगदीश हरे",
  "title_en": "Om Jai Jagdish Hare",
  "deity": "Vishnu",
  "deity_hi": "विष्णु",
  "thumbnail_url": "https://...",
  "music_url": "https://...",
  "audio_duration_seconds": 300,
  "sort_order": 1,
  "is_active": true,
  "status": "published"
}
```

### `arti_lines`
```json
{
  "_id": "ObjectId",
  "arti_id": "arti_item_id (ref)",
  "line_num": 1,
  "text_hi": "ॐ जय जगदीश हरे",
  "text_sa": "...",
  "transliteration": "Om Jai Jagdish Hare",
  "is_refrain": true,
  "audio_start_ms": 0,
  "audio_end_ms": 8000
}
```

## 4.4 Divya Granth (Sacred Texts)

### `granth_books`
```json
{
  "_id": "ObjectId",
  "title_hi": "श्रीमद्भगवद्गीता",
  "title_en": "Bhagavad Gita",
  "slug": "bhagavad-gita",
  "description_hi": "...",
  "description_en": "...",
  "thumbnail_url": "https://...",
  "total_chapters": 18,
  "total_verses": 700,
  "sort_order": 1,
  "is_active": true
}
```

### `granth_chapters`
```json
{
  "_id": "ObjectId",
  "book_id": "granth_book_id (ref)",
  "chapter_num": 1,
  "title_hi": "अर्जुन विषाद योग",
  "title_en": "Arjuna Vishada Yoga",
  "description_hi": "...",
  "total_verses": 47,
  "shloka_audio_url": "https://... (male Sanskrit voice)",
  "meaning_audio_url": "https://... (female Hindi voice)",
  "sort_order": 1
}
```

### `granth_verses`
```json
{
  "_id": "ObjectId",
  "chapter_id": "granth_chapter_id (ref)",
  "verse_num": 1,
  "sanskrit": "धृतराष्ट्र उवाच...",
  "transliteration": "Dhritarashtra Uvacha...",
  "meaning_hi": "...",
  "meaning_en": "...",
  "meaning_mr": "...",
  "word_meanings": [
    {"word": "धृतराष्ट्र", "meaning": "Dhritarashtra"},
    {"word": "उवाच", "meaning": "said"}
  ],
  "audio_start_ms": 0,
  "audio_end_ms": 12000,
  "sort_order": 1
}
```

## 4.5 Vedas & Puranas

### `veda_books`
```json
{
  "_id": "ObjectId",
  "title_hi": "ऋग्वेद",
  "title_en": "Rig Veda",
  "category": "veda | purana",
  "sub_type": "rig | sama | yajur | atharva",
  "pdf_url": "https://...",
  "thumbnail_url": "https://...",
  "total_chapters": 10,
  "description_hi": "...",
  "description_en": "...",
  "sort_order": 1,
  "is_active": true,
  "parsing_status": "pending | processing | completed | error"
}
```

### `veda_chapters`
```json
{
  "_id": "ObjectId",
  "book_id": "veda_book_id (ref)",
  "chapter_num": 1,
  "title_hi": "प्रथम मण्डल",
  "title_en": "First Mandala",
  "total_verses": 191,
  "sort_order": 1
}
```

### `veda_verses`
```json
{
  "_id": "ObjectId",
  "chapter_id": "veda_chapter_id (ref)",
  "verse_num": 1,
  "text_sa": "अग्निमीळे पुरोहितं...",
  "transliteration": "Agnim Ile Purohitam...",
  "meaning_hi": "...",
  "meaning_en": "...",
  "audio_url": "https://...",
  "sort_order": 1
}
```

## 4.6 User Collections

### `user_profiles`
```json
{
  "_id": "ObjectId",
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "+919876543210",
  "avatar_url": "https://...",
  "language_pref": "hi",
  "mode_pref": "beginner | expert",
  "is_premium": false,
  "subscription_plan": "free | monthly | yearly",
  "subscription_expires_at": null,
  "streak_count": 15,
  "streak_last_date": "2026-01-15",
  "notification_enabled": true,
  "dark_mode": false,
  "tts_voice_pref": "male_hindi",
  "created_at": "2026-01-01T00:00:00Z",
  "last_active_at": "2026-01-15T08:30:00Z"
}
```

### `user_saved_shlokas`
```json
{
  "_id": "ObjectId",
  "user_id": "user_profile_id (ref)",
  "item_id": "content_item_id (ref)",
  "verse_id": "content_verse_id (ref)",
  "category": "chalisa | vedic_mantra | ...",
  "sort_order": 1,
  "added_at": "2026-01-15T08:30:00Z"
}
```

### `user_likes`
```json
{
  "_id": "ObjectId",
  "user_id": "user_profile_id (ref)",
  "item_id": "content_item_id (ref)",
  "liked_at": "2026-01-15T08:30:00Z"
}
```

### `user_reading_history`
```json
{
  "_id": "ObjectId",
  "user_id": "user_profile_id (ref)",
  "item_id": "content_item_id (ref)",
  "item_type": "content | granth | veda | katha",
  "last_verse_num": 15,
  "progress_percent": 37.5,
  "total_time_seconds": 600,
  "last_read_at": "2026-01-15T08:30:00Z"
}
```

### `user_videos`
```json
{
  "_id": "ObjectId",
  "user_id": "user_profile_id (ref)",
  "verse_id": "content_verse_id (ref)",
  "video_url": "https://...",
  "thumbnail_url": "https://...",
  "is_public": true,
  "created_at": "2026-01-15T08:30:00Z"
}
```

## 4.7 Admin & System Collections

### `admin_users`
```json
{
  "_id": "ObjectId",
  "email": "admin@sanatansaathi.com",
  "password_hash": "bcrypt_hash",
  "name": "Super Admin",
  "role": "super_admin | content_admin | moderator",
  "is_active": true,
  "created_by": "admin_user_id or null",
  "last_login_at": "2026-01-15T08:30:00Z",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### `panchang`
```json
{
  "_id": "ObjectId",
  "date": "2026-01-15",
  "tithi": "शुक्ल पक्ष तृतीया",
  "nakshatra": "रोहिणी",
  "yoga": "शोभन",
  "karana": "बव",
  "sunrise": "07:12",
  "sunset": "17:48",
  "rahu_kaal": "10:30-12:00",
  "festival_name": "मकर संक्रांति",
  "festival_name_en": "Makar Sankranti",
  "is_panchak": false,
  "is_bhadra": false,
  "linked_content_ids": ["content_item_id_1", "content_item_id_2"],
  "special_message_hi": "...",
  "special_message_en": "..."
}
```

### `upload_logs`
```json
{
  "_id": "ObjectId",
  "admin_id": "admin_user_id (ref)",
  "file_name": "Chalisa_Sangrah.docx",
  "file_type": "docx | pdf | image",
  "file_url": "https://...",
  "status": "uploaded | parsing | parsed | published | error",
  "parsed_items_count": 12,
  "error_message": null,
  "parsed_data": {},
  "created_at": "2026-01-15T08:30:00Z",
  "published_at": null
}
```

### `app_settings`
```json
{
  "_id": "ObjectId",
  "key": "featured_content | home_banner | daily_shloka | announcement",
  "value": {},
  "is_active": true,
  "updated_at": "2026-01-15T08:30:00Z",
  "updated_by": "admin_user_id"
}
```

### `vedachat_conversations`
```json
{
  "_id": "ObjectId",
  "user_id": "user_profile_id (ref)",
  "messages": [
    {
      "role": "user",
      "content": "What does Krishna say about duty?",
      "timestamp": "2026-01-15T08:30:00Z"
    },
    {
      "role": "assistant",
      "content": "In Bhagavad Gita, Chapter 2, Verse 47...",
      "references": [
        {"book": "Bhagavad Gita", "chapter": 2, "verse": 47}
      ],
      "timestamp": "2026-01-15T08:30:05Z"
    }
  ],
  "created_at": "2026-01-15T08:30:00Z",
  "last_message_at": "2026-01-15T08:30:05Z"
}
```

**Total Collections: 22**

---

# 5. BACKEND API ENDPOINTS

## 5.1 Authentication APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/admin/login` | Admin login (email + password) | Public |
| POST | `/api/auth/admin/register` | Create new admin (Super Admin only) | Super Admin |
| POST | `/api/auth/user/register` | User registration (OTP/email) | Public |
| POST | `/api/auth/user/login` | User login | Public |
| GET | `/api/auth/me` | Get current user/admin profile | Authenticated |
| POST | `/api/auth/refresh` | Refresh JWT token | Authenticated |

## 5.2 Content Management APIs (Admin)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/admin/upload/docx` | Upload DOCX file for parsing | Content Admin+ |
| POST | `/api/admin/upload/pdf` | Upload PDF for Vedas parsing | Content Admin+ |
| POST | `/api/admin/upload/publish/{upload_id}` | Publish parsed content to DB | Content Admin+ |
| GET | `/api/admin/uploads` | List all uploads with status | Content Admin+ |
| GET | `/api/admin/uploads/{id}` | Get parsed preview of upload | Content Admin+ |
| DELETE | `/api/admin/uploads/{id}` | Delete upload | Super Admin |

## 5.3 Content Items APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/content/items` | List all content items (filter by category, status) | Public |
| GET | `/api/content/items/{id}` | Get single content item with full details | Public |
| POST | `/api/content/items` | Create content item | Content Admin+ |
| PUT | `/api/content/items/{id}` | Update content item | Content Admin+ |
| DELETE | `/api/content/items/{id}` | Delete content item | Super Admin |
| PATCH | `/api/content/items/{id}/status` | Change status (draft/published/archived) | Content Admin+ |
| PATCH | `/api/content/items/{id}/sort` | Update sort order | Content Admin+ |

## 5.4 Verse APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/content/items/{item_id}/verses` | Get all verses for a content item | Public |
| GET | `/api/content/verses/{id}` | Get single verse with meanings | Public |
| PUT | `/api/content/verses/{id}` | Update verse (Sanskrit, transliteration) | Content Admin+ |
| POST | `/api/content/verses/{id}/meanings` | Add/update meaning for a language | Content Admin+ |
| GET | `/api/content/verses/{id}/meanings/{lang}` | Get meaning in specific language | Public |

## 5.5 Katha & Puja APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/katha/items` | List all kathas | Public |
| GET | `/api/katha/items/{id}` | Get katha with intro, vidhi, samagri | Public |
| GET | `/api/katha/items/{id}/chapters` | Get katha chapters/verses | Public |
| POST | `/api/katha/items` | Create katha | Content Admin+ |
| PUT | `/api/katha/items/{id}` | Update katha | Content Admin+ |

## 5.6 Arti APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/arti/items` | List all artis | Public |
| GET | `/api/arti/items/{id}` | Get arti with lines | Public |
| POST | `/api/arti/items` | Create arti | Content Admin+ |
| PUT | `/api/arti/items/{id}` | Update arti | Content Admin+ |

## 5.7 Divya Granth APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/granth/books` | List all granth books | Public |
| GET | `/api/granth/books/{id}` | Get book with chapters | Public |
| GET | `/api/granth/chapters/{id}` | Get chapter with verses | Public |
| GET | `/api/granth/chapters/{id}/verses` | Get paginated verses | Public |
| POST | `/api/granth/books` | Create book | Super Admin |
| PUT | `/api/granth/books/{id}` | Update book | Content Admin+ |
| PUT | `/api/granth/verses/{id}` | Update verse | Content Admin+ |

## 5.8 Vedas & Puranas APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/vedas/books` | List all veda/purana books | Public |
| GET | `/api/vedas/books/{id}` | Get book with chapters | Public |
| GET | `/api/vedas/chapters/{id}/verses` | Get paginated verses | Public |
| POST | `/api/vedas/books` | Create book + trigger PDF parsing | Super Admin |
| PUT | `/api/vedas/verses/{id}` | Update verse | Content Admin+ |

## 5.9 VedaChat APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/vedachat/message` | Send message, get AI response | Authenticated User |
| GET | `/api/vedachat/conversations` | Get user's conversation history | Authenticated User |
| GET | `/api/vedachat/conversations/{id}` | Get specific conversation | Authenticated User |
| DELETE | `/api/vedachat/conversations/{id}` | Delete conversation | Authenticated User |

## 5.10 User APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/user/profile` | Get user profile | Authenticated |
| PUT | `/api/user/profile` | Update profile (name, language, mode) | Authenticated |
| GET | `/api/user/saved-shlokas` | Get saved shlokas (daily routine) | Authenticated |
| POST | `/api/user/saved-shlokas` | Save shloka to routine | Authenticated |
| DELETE | `/api/user/saved-shlokas/{id}` | Remove from routine | Authenticated |
| PUT | `/api/user/saved-shlokas/reorder` | Reorder saved shlokas | Authenticated |
| POST | `/api/user/like/{item_id}` | Like/unlike content | Authenticated |
| GET | `/api/user/likes` | Get all liked items | Authenticated |
| GET | `/api/user/history` | Get reading history | Authenticated |
| POST | `/api/user/history` | Update reading progress | Authenticated |
| GET | `/api/user/videos` | Get user-created videos | Authenticated |

## 5.11 Home & Discovery APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/home/today` | Get today's data (shloka, panchang, greeting) | Public |
| GET | `/api/home/featured` | Get featured content | Public |
| GET | `/api/home/categories` | Get category grid (8 tiles) | Public |
| GET | `/api/search?q=...` | Search across all content | Public |

## 5.12 Admin Management APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/admin/users` | List all app users | Content Admin+ |
| GET | `/api/admin/users/{id}` | Get user details | Content Admin+ |
| GET | `/api/admin/admins` | List all admin users | Super Admin |
| POST | `/api/admin/admins` | Create admin user | Super Admin |
| PUT | `/api/admin/admins/{id}` | Update admin role | Super Admin |
| DELETE | `/api/admin/admins/{id}` | Deactivate admin | Super Admin |
| GET | `/api/admin/dashboard` | Dashboard stats | Content Admin+ |
| GET | `/api/admin/panchang` | List panchang entries | Content Admin+ |
| POST | `/api/admin/panchang` | Create panchang entry | Content Admin+ |
| PUT | `/api/admin/panchang/{id}` | Update panchang | Content Admin+ |
| GET | `/api/admin/settings` | Get app settings | Super Admin |
| PUT | `/api/admin/settings/{key}` | Update app setting | Super Admin |

## 5.13 Audio & Media APIs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/media/generate-tts` | Generate TTS audio for text | Content Admin+ |
| POST | `/api/media/generate-image` | Generate shloka card image | Authenticated |
| POST | `/api/media/generate-video` | Generate shloka video | Authenticated |
| POST | `/api/media/upload` | Upload audio/image file | Content Admin+ |

**Total API Endpoints: ~70+**

---

# 6. ADMIN PANEL — SCREENS & FLOWS

## 6.1 Admin Panel Navigation (Sidebar)

```
SANATAN SAATHI ADMIN
├── Dashboard (overview stats)
├── Content Upload
│   ├── Upload DOCX
│   ├── Upload PDF (Vedas)
│   └── Upload History
├── Content Manager
│   ├── Vedic Mantras
│   ├── Chalisa
│   ├── Ashtakam
│   ├── Sahasranama
│   ├── Nama Ramayanam
│   └── All Content
├── Verse Manager
│   └── Edit verses, meanings, word breakdown
├── Arti Manager
│   └── Manage artis + lines
├── Katha Manager
│   └── Manage kathas + vidhi + samagri
├── Granth Manager
│   ├── Bhagavad Gita
│   ├── Ramayana
│   └── Mahabharata
├── Vedas & Puranas
│   └── Manage veda books + PDF parsing
├── Audio Manager
│   ├── Upload Audio
│   ├── Generate TTS
│   └── YouTube Links
├── VedaChat Settings
│   └── Context configuration
├── Panchang Settings
│   └── Daily data, festivals, panchak
├── Users
│   └── App user list + details
├── Admin Users
│   └── Manage admins (Super Admin only)
├── App Settings
│   ├── Featured Content
│   ├── Home Banner
│   ├── Daily Shloka
│   └── Announcements
└── My Profile
```

## 6.2 Key Admin Panel Screens

### Dashboard
- Total content items by category (pie chart)
- Total users (daily/weekly/monthly growth)
- Content upload status (pending/published)
- Recent uploads
- Today's daily shloka preview
- Quick action buttons

### Content Upload Screen
- Drag & drop DOCX file
- Select category (Chalisa, Vedic Mantra, etc.)
- Click "Parse with AI" button
- Preview parsed data in table format
- Edit any parsed row before publishing
- Error rows highlighted in red
- "Publish All" or "Publish Selected" buttons

### Content Manager Screen
- Table view: Title, Category, Status, Verses Count, Sort Order, Actions
- Filter by: Category, Status, Language
- Search by title
- Inline status toggle (Draft/Published/Archived)
- Drag to reorder
- Click to edit full details

### Verse Manager Screen
- Select content item from dropdown
- See all verses in table
- Click verse to expand editor
- Edit: Sanskrit text, Transliteration
- Tab for each language meaning
- Word breakdown editor (add/remove/edit words)
- Save individual verse or bulk save

### Audio Manager Screen
- List all content items with audio status
- Upload audio file (drag & drop)
- Enter YouTube URL
- Generate TTS button (calls OpenAI TTS API)
- Audio preview player
- Set audio timestamps per verse

### Panchang Settings Screen
- Calendar view showing existing entries
- Form: Date, Tithi, Nakshatra, Yoga, Karana, Sunrise, Sunset
- Festival name (Hindi + English)
- Link to specific content (for festival-related mantras)
- Panchak/Bhadra toggle
- Bulk import from CSV

## 6.3 Role-Based Access

| Screen | Super Admin | Content Admin | Moderator |
|---|---|---|---|
| Dashboard | Full | Full | View only |
| Content Upload | Full | Upload + Parse + Publish | Upload + Parse (no publish) |
| Content Manager | Full CRUD + Delete | CRUD (no delete) | View + Flag |
| Verse Manager | Full | Full | View only |
| Audio Manager | Full | Full | View only |
| Katha Manager | Full | Full | View + Flag |
| Granth Manager | Full | Edit verses | View only |
| Vedas Manager | Full | Edit verses | View only |
| Panchang | Full | Full | View only |
| Users | Full + Subscription | View only | No access |
| Admin Users | Full CRUD | No access | No access |
| App Settings | Full | No access | No access |
| Payments | Full | No access | No access |

---

# 7. AI INTEGRATIONS

All AI services use **Emergent LLM Key** (no additional API keys needed):

## 7.1 VedaChat (Claude API)
- **Model**: Claude Sonnet 4.5 (via Emergent Key)
- **Purpose**: Answer spiritual questions with scripture references
- **Context**: All published content from DB is used as context
- **Features**:
  - Multi-turn conversations
  - Scripture verse references (Book, Chapter, Verse)
  - Hindi + English responses based on user language preference
  - Conversation history stored in MongoDB

## 7.2 DOCX Parser (Claude API)
- **Model**: Claude Sonnet 4.5 (via Emergent Key)
- **Purpose**: Parse uploaded DOCX files into structured data
- **Extracts**:
  - H1 → Category
  - H2 → Item Name (title)
  - H3 → Section
  - Verse blocks → Individual verses with Sanskrit + transliteration
- **Output**: Structured JSON for preview and DB insertion

## 7.3 PDF Parser (Claude API)
- **Model**: Claude Sonnet 4.5 (via Emergent Key)
- **Purpose**: Extract shlokas from Vedas/Puranas PDFs
- **Process**: PDF → pdfplumber extracts text → Claude structures into verses

## 7.4 Text-to-Speech (OpenAI TTS)
- **Model**: OpenAI TTS (via Emergent Key)
- **Purpose**: Generate audio for verses in Hindi/Sanskrit
- **Voices**: Multiple voice options (male/female, Hindi/Sanskrit)
- **Output**: Audio file URL stored in DB

## 7.5 Image Generation (Gemini Nano Banana)
- **Purpose**: Generate shloka card backgrounds and decorative images
- **Use Case**: When user creates a shareable shloka card
- **Output**: Beautiful background image with Indian art style

## 7.6 Video Generation (Sora 2)
- **Purpose**: Generate short shloka video reels
- **Use Case**: User creates video from a verse
- **Output**: Short video with shloka text overlay

---

# 8. AUTHENTICATION & ROLE SYSTEM

## 8.1 Admin Authentication (JWT)
- Email + Password login
- Bcrypt password hashing
- JWT tokens (access + refresh)
- Role embedded in JWT payload
- Middleware validates role for each endpoint

## 8.2 User Authentication (JWT)
- Email/Phone + OTP login
- Google OAuth option (future)
- JWT tokens for mobile app
- Token refresh mechanism

## 8.3 Role Hierarchy
```
Super Admin (Level 1)
  └── Can manage everything
  └── Creates Content Admins & Moderators

Content Admin (Level 2)
  └── Can upload, edit, publish content
  └── Cannot manage admins or payments

Moderator (Level 3)
  └── Can upload and preview
  └── Cannot publish without review
  └── Can flag issues
```

---

# 9. CONTENT PIPELINE (DOCX/PDF PARSING)

## 9.1 DOCX Upload Flow

```
Step 1: Admin selects DOCX file
         ↓
Step 2: File uploaded to server
         ↓
Step 3: python-docx extracts raw text with heading levels
         ↓
Step 4: Claude API receives extracted text with prompt:
        "Parse this Hindu scripture document. Extract:
         - H1 as category
         - H2 as item title (in Hindi + English)
         - H3 as section headers
         - Verse blocks with Sanskrit text and transliteration
         Return as structured JSON"
         ↓
Step 5: Claude returns structured JSON
         ↓
Step 6: Preview table shown to admin
        (each row = one verse, with edit capability)
         ↓
Step 7: Admin reviews, edits if needed
         ↓
Step 8: Admin clicks "Publish"
         ↓
Step 9: Data saved to MongoDB collections:
        - content_items (one per H2)
        - content_verses (one per verse)
        - verse_meanings (one per verse per language)
         ↓
Step 10: Upload log updated with status "published"
```

## 9.2 PDF Upload Flow (Vedas/Puranas)

```
Step 1: Admin uploads PDF
         ↓
Step 2: pdfplumber extracts text page by page
         ↓
Step 3: Claude API structures text into:
        - Book metadata
        - Chapter divisions
        - Individual verses with meanings
         ↓
Step 4: Preview shown to admin
         ↓
Step 5: Publish saves to veda_books, veda_chapters, veda_verses
```

---

# 10. MOBILE APP (EXPO) — INTEGRATION GUIDE

## 10.1 Expo Project Setup (For Your VS Code)

```bash
# Install Expo CLI
npm install -g expo-cli

# Create project
npx create-expo-app SanatanSaathi --template blank

# Install dependencies
npx expo install expo-router expo-av expo-image
npx expo install @react-navigation/native @react-navigation/bottom-tabs
npx expo install zustand @tanstack/react-query axios
npx expo install expo-notifications expo-clipboard expo-sharing
```

## 10.2 API Configuration

```javascript
// config/api.js
const API_BASE_URL = "https://your-backend-url.com/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

// Add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

## 10.3 Screen-to-API Mapping

| Expo Screen | API Endpoints Used |
|---|---|
| Home Tab | `GET /api/home/today`, `GET /api/home/featured`, `GET /api/home/categories` |
| Category List | `GET /api/content/items?category=chalisa` |
| Content Detail | `GET /api/content/items/{id}`, `GET /api/content/items/{id}/verses` |
| Verse with Meaning | `GET /api/content/verses/{id}/meanings/{lang}` |
| Katha List | `GET /api/katha/items` |
| Katha Detail | `GET /api/katha/items/{id}`, `GET /api/katha/items/{id}/chapters` |
| Arti List | `GET /api/arti/items` |
| Arti Player | `GET /api/arti/items/{id}` |
| Granth Library | `GET /api/granth/books` |
| Chapter Reader | `GET /api/granth/chapters/{id}/verses` |
| Vedas Home | `GET /api/vedas/books` |
| Vedas Reader | `GET /api/vedas/chapters/{id}/verses` |
| VedaChat | `POST /api/vedachat/message` |
| Profile | `GET /api/user/profile` |
| Saved Shlokas | `GET /api/user/saved-shlokas` |
| Like Content | `POST /api/user/like/{item_id}` |
| Generate TTS | `POST /api/media/generate-tts` |
| Create Video | `POST /api/media/generate-video` |

## 10.4 Tab Navigation Structure

```
BottomTabs
├── Home (HomeStack)
│   ├── HomeScreen
│   ├── CategoryListScreen
│   ├── ContentDetailScreen
│   └── VerseReaderScreen
├── Vedic Mantras (VedicStack)
│   ├── VedicCategoriesScreen (8 tiles)
│   ├── ContentListScreen
│   └── ContentDetailScreen (Beginner/Expert)
├── Divya Granth (GranthStack)
│   ├── GranthLibraryScreen
│   ├── BookTOCScreen
│   └── ChapterReaderScreen
├── Vedas & Puranas (VedasStack)
│   ├── VedasHomeScreen
│   ├── BookDetailScreen
│   └── VerseReaderScreen
└── VedaChat (ChatStack)
    └── ChatScreen
```

---

# 11. DEVELOPMENT PHASES & TIMELINE

## What I Build Here (This Platform)

| Phase | What | Sessions | Priority |
|---|---|---|---|
| **Phase 1** | Database schema (all 22 collections) + Seed data | 1 session | P0 |
| **Phase 2** | Admin Auth (JWT + 3 roles) + Admin CRUD | 1 session | P0 |
| **Phase 3** | Content APIs (items, verses, meanings) | 1 session | P0 |
| **Phase 4** | Admin Panel UI (Dashboard, Content Manager, Verse Manager) | 1-2 sessions | P0 |
| **Phase 5** | DOCX Upload + Claude parsing pipeline | 1 session | P0 |
| **Phase 6** | Katha, Arti, Granth, Vedas APIs | 1 session | P1 |
| **Phase 7** | VedaChat AI integration | 1 session | P1 |
| **Phase 8** | User APIs (profile, likes, saved, history) | 1 session | P1 |
| **Phase 9** | TTS, Image Gen, Video Gen APIs | 1 session | P1 |
| **Phase 10** | Admin Panel (Audio Manager, Panchang, Settings) | 1 session | P2 |
| **Phase 11** | Home & Discovery APIs | 1 session | P2 |
| **Phase 12** | Polish, testing, documentation | 1 session | P2 |
| | **Total** | **~10-12 sessions** | |

## What You Build in VS Code (Expo)

| Phase | What | Estimated Time |
|---|---|---|
| **E1** | Expo setup + Tab navigation shell | 1-2 days |
| **E2** | Home tab (greeting, shloka card, grid) | 2-3 days |
| **E3** | Vedic Mantras screens (Beginner/Expert) | 3-4 days |
| **E4** | Audio player with verse highlighting | 2-3 days |
| **E5** | Divya Granth reader | 2-3 days |
| **E6** | Vedas & Puranas reader | 2 days |
| **E7** | VedaChat screen | 2-3 days |
| **E8** | Profile, Settings, Daily Routine | 2-3 days |
| **E9** | Share, Video Create | 2-3 days |
| **E10** | Polish + App Store submission | 3-5 days |
| | **Total** | **~25-35 days** |

---

# 12. SETUP INSTRUCTIONS FOR LOCAL DEVELOPMENT

## 12.1 Backend API (After downloading from this platform)

```bash
# Clone/download the code
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables (.env file)
MONGO_URL=mongodb://localhost:27017
DB_NAME=sanatan_saathi
EMERGENT_LLM_KEY=your_key_here

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## 12.2 Admin Panel Frontend

```bash
cd frontend

# Install dependencies
yarn install

# Set environment variables (.env)
REACT_APP_BACKEND_URL=http://localhost:8001

# Run
yarn start
```

## 12.3 Expo Mobile App (Your VS Code)

```bash
# Create Expo project
npx create-expo-app SanatanSaathi

# Configure API URL
# In your Expo app config, point to your deployed backend:
API_URL=https://your-deployed-backend.com/api

# Run on device
npx expo start
```

---

# SUMMARY

| Metric | Value |
|---|---|
| **Database Collections** | 22 |
| **API Endpoints** | 70+ |
| **Admin Panel Screens** | 15+ |
| **AI Integrations** | 6 (Claude Chat, Claude Parser x2, OpenAI TTS, Nano Banana, Sora 2) |
| **Admin Roles** | 3 (Super Admin, Content Admin, Moderator) |
| **Content Categories** | 7 (Vedic Mantras, Chalisa, Ashtakam, Sahasranama, Katha, Arti, Nama Ramayanam) |
| **Sacred Text Books** | 3+ (Gita, Ramayana, Mahabharata) |
| **Veda Books** | 4+ (Rig, Sama, Yajur, Atharva) |
| **Languages Supported** | 12+ |
| **Development Sessions (Web)** | ~10-12 |
| **Development Time (Mobile)** | ~25-35 days |

---

*This blueprint is designed for your review. Please confirm if this matches your vision, and let me know if any changes are needed before I start coding Phase 1.*
