# DATA_SCHEMA.md — MongoDB Collections

> All collections live in `${DB_NAME}` (default `sanatan_saathi`). `_id` is a Mongo `ObjectId` stringified before sending to clients (the `_id` BSON field is excluded from API responses; clients receive `_id` already-stringified or under `id`).

---

## Quick collection map

| Collection | Purpose | Notes |
|---|---|---|
| `admin_users` | Admin panel users | bcrypt password hash |
| `app_users` | Mobile app users | preferred_language, profile prefs |
| `content_items` | Long-form content (Chalisa, Sahasranama, Mantras, …) | unified multilingual schema |
| `content_verses` | Per-item verses | `text_translations.{lang}` map |
| `verse_meanings` | Verse meanings per language | one row per `(verse_id, language)` |
| `verse_translation_drafts` | AI-translation drafts | `is_draft=true`, never auto-published |
| `bhakti_items` | Aarti, Stotram, Kavacham, Nam Ramayanam, … | shares schema with `content_items` |
| `bhakti_verses` | Verses for bhakti items | small set — Aarti uses full_text instead |
| `arti_items` | **Legacy** Aarti collection | retained for read-back; new aartis in `bhakti_items` |
| `kundli_data` | User birth charts | one per user |
| `panchang` / `panchang_cache` | Panchang docs + computed daily cache |  |
| `vrat_festivals` | Vrat & festival calendar |  |
| `vedachat_conversations` | VedaChat threads | `messages[]` array |
| `granth_books` / `granth_chapters` / `granth_verses` | Sacred-text reader (Ramayana, Mahabharata) |  |
| `veda_books` / `veda_chapters` / `veda_verses` | Vedas reader |  |
| `mantras` | Standalone mantras library |  |
| `notifications` | User-bound notifications |  |
| `daily_schedules` | Admin-curated daily mantra plan |  |
| `cms_pages` / `blog_posts` | Marketing CMS |  |
| `audit_trail` | Every admin mutation | `actor`, `action`, `before`, `after` |
| `login_attempts` / `blocked_ips` / `security_events` | Security log |  |
| `token_blacklist` | Revoked JWTs |  |
| `analytics_events` | Frontend telemetry |  |
| `upload_logs` | DOCX/PDF intake log |  |
| `integration_settings` | 3rd-party credentials store |  |
| `birth_chart_analyses` | Public birth-chart submissions |  |
| `graha_scores` / `user_streaks` |  |  |
| `otp_store` / `public_chat_limits` | Rate limit / OTP buckets |  |

---

## Canonical multilingual document — `content_items` / `bhakti_items`

```json
{
  "_id": "69f053c8053b601fc045a5ca",
  "category": "chalisa",                       // aarti | chalisa | namavali | sahasranama
                                              // | vedic_mantra | stotram | kavacham
                                              // | nam_ramayanam | ashtakam | shatkam | suktam
  "subcategory": "ganesha",                    // optional, free-form
  "slug": "hanuman-chalisa",
  "title_hi": "हनुमान चालीसा",
  "title_en": "Hanuman Chalisa",
  "title_sa": "",
  "deity": "Hanuman",
  "deity_hi": "हनुमान",
  "description_hi": "...",
  "description_en": "...",
  "thumbnail_url": "",                         // legacy single-thumbnail
  "video_url": "",                             // legacy single-video
  "music_type": "Traditional harmonium",       // aarti-only metadata
  "best_occasion": "Wednesday, Chaturthi",     // aarti-only metadata

  "has_beginner_mode": true,
  "has_expert_mode": true,
  "total_verses": 42,
  "sort_order": 1,
  "is_active": true,
  "is_premium": false,
  "tags": ["daily", "popular"],
  "supported_languages": ["hi", "en", "sa", "mr"],
  "like_count": 0,
  "status": "published",                       // draft | published | archived
  "created_by": "<admin_id>",
  "created_at": "2026-04-28T06:29:28.343787+00:00",
  "updated_at": "2026-04-30T14:52:17.313276+00:00",

  // Legacy flat full text (mirrored for old mobile clients)
  "full_text":     "...",
  "text_hi":       "...",
  "text_en":       "...",

  // === Per-language bucket (the canonical multilingual map) ===
  "languages": {
    "hi": {
      "full_text": "ॐ गं गणपतये नमः ...",     // entire item text
      "verses":    [],                          // optional — for verse-by-verse items
      "audio_versions": [
        { "slot": 1, "label": "Normal",
          "url": "/api/aarti-static/<id>/hi/audio/v1.mp3",
          "format": "mp3", "duration_ms": null,
          "uploaded_at": "2026-..." }
      ],
      "video": {
        "url": "/api/aarti-static/<id>/hi/video/main.mp4",
        "format": "mp4"
      },
      "thumbnail": {
        "url": "/api/aarti-static/<id>/hi/thumbnail/main.png",
        "format": "png"
      },
      "sync": {                                 // ← line-level Expert-Mode sync
        "sync_map": [
          { "verse_num": 1, "start_ms": 0, "end_ms": 5000,
            "text": "जय गणेश",
            "lines": [
              { "text": "जय गणेश", "start_ms": 0, "end_ms": 2500 }
            ]
          }
        ],
        "duration_ms": 10000,
        "updated_at": "2026-..."
      }
    },
    "en": { "...": "..." },
    "mr": { "...": "..." }
  },

  // === Legacy single-language audio sync (still read by older clients) ===
  "audio_sync": {
    "audio_url": "/api/audio-static/items/<id>.mp3",
    "sync_map": [ /* same shape as languages.hi.sync.sync_map */ ],
    "duration_ms": 30000,
    "format": "mp3",
    "variants": [
      { "slot": 2, "label": "Female",
        "url": "/api/audio-static/items/<id>_v2.mp3",
        "format": "mp3", "duration_ms": null,
        "uploaded_at": "2026-..." }
    ],
    "uploaded_at": "2026-...",
    "uploaded_by": "<admin_id>",
    "updated_at": "2026-..."
  },
  "audio_url": "/api/audio-static/items/<id>.mp3"   // shortcut for the default variant
}
```

### Field rules
- `category` and `slug` together must be unique.
- `supported_languages` MUST include every language for which a `languages.{code}` bucket exists.
- For Aarti items, the **Publish** validator additionally requires either `languages.{lang}.video` OR `languages.{lang}.thumbnail` for every active language.
- `audio_sync` (top-level) is the *legacy* single-language sync; `languages.{lang}.sync` is the *current* per-language sync. New clients should prefer the latter via `GET /api/content/items/:id/lang/:lang/media`.

---

## Sync JSON — Expert Mode line-level

This is what is **persisted under `languages.{lang}.sync.sync_map`**, and what is **uploaded** via `POST /api/content/items/:id/lang/:lang/sync`.

```json
{
  "audio_file": "/api/aarti-static/<id>/hi/audio/v1.mp3",
  "duration_ms": 10000,
  "verses": [
    {
      "verse_id": 1,
      "start_ms": 0,
      "end_ms": 5000,
      "lines": [
        { "text": "जय गणेश", "start_ms": 0,    "end_ms": 2500 },
        { "text": "देवा",     "start_ms": 2500, "end_ms": 5000 }
      ]
    }
  ]
}
```

### Validation rules (enforced server-side and by the editor)
- All `start_ms` / `end_ms` are non-negative integers in **milliseconds**.
- Within a verse, `lines[].end_ms` must equal the next line's `start_ms` (gap-free).
- Verses must be sorted by `start_ms`; no overlaps between consecutive verses.
- `lines[].text` must be non-empty (whitespace-only is rejected).
- LRC `.lrc` uploads are converted client-side by `parseLrcToNested()` before save.

> The frontend stores the canonical JSON shape (`verses[].verse_id`, `verses[].lines[]`). The DB document uses the alias `verse_num` (legacy). Both are accepted on read.

---

## Verse documents

`content_verses` (and `bhakti_verses`) — one row per verse:

```json
{
  "_id": "69f053c8053b601fc045a5d0",
  "item_id": "69f053c8053b601fc045a5ca",
  "verse_num": 1,
  "verse_type": "doha",                  // doha | chaupai | mantra | refrain | …
  "sanskrit_text": "…",
  "transliteration": "Shri Guru …",
  "sort_order": 1,
  "is_active": true,
  "text_translations": {
    "mr": "…", "ta": "…", "gu": "…", "bn": "…", "en": "…", "te": "…"
  },
  "transliteration_translations": {
    "mr": "…", "ta": "…", "gu": "…", "bn": "…", "en": "…", "te": "…"
  },
  "updated_at": "2026-…"
}
```

`verse_meanings`:

```json
{
  "_id": "69f053c8053b601fc045a5d5",
  "verse_id": "69f053c8053b601fc045a5d0",
  "language": "hi",
  "meaning": "…",
  "word_breakdown": [
    { "word": "श्रीगुरु", "meaning": "honored teacher" }
  ]
}
```

`verse_translation_drafts` (AI output, never auto-published):

```json
{
  "_id": "...",
  "verse_id": "...",
  "language": "ta",
  "is_draft": true,
  "is_ai_generated": true,
  "text_translation": "...",
  "transliteration_translation": "...",
  "meaning": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

---

## User documents

`admin_users`:
```json
{
  "_id": "...",
  "email": "admin@yourdomain.com",
  "password_hash": "$2b$12$...",
  "name": "Super Admin",
  "role": "super_admin",                   // super_admin | admin | content_admin
  "is_active": true,
  "created_by": null,
  "created_at": "...",
  "last_login_at": "...",
  "last_login_ip": "..."
}
```

`app_users`:
```json
{
  "_id": "...",
  "email": "asha@example.com",
  "name": "Asha",
  "phone": null,
  "password_hash": "$2b$12$...",
  "role": "user",
  "preferred_language": "hi",              // null until LanguageSettingsScreen is used
  "is_active": true,
  "created_at": "...",
  "updated_at": "...",
  "last_login_at": "...",
  "last_login_ip": "..."
}
```

---

## Astrology documents

`kundli_data`:
```json
{
  "_id": "...",
  "user_id": "...",
  "name": "Asha",
  "dob": "1990-04-12",
  "tob": "06:30",
  "place": "Pune, India",
  "lat": 18.5204, "lon": 73.8567, "tz": "Asia/Kolkata",
  "ayanamsa": "lahiri",
  "system": "north",
  "rashi_chart":  { /* 12 houses → planets */ },
  "navamsa_chart": { /* d9 */ },
  "d7_chart": { /* … */ },
  "d10_chart": { /* … */ },
  "ascendant": "Aries",
  "moon_sign": "Cancer",
  "nakshatra": "Pushya",
  "dasha": { /* Vimshottari */ },
  "created_at": "..."
}
```

---

## Indexes (recommended for production)

```js
// admin_users
db.admin_users.createIndex({ email: 1 }, { unique: true });

// app_users
db.app_users.createIndex({ email: 1 }, { unique: true });
db.app_users.createIndex({ phone: 1 }, { sparse: true });

// content_items / bhakti_items
db.content_items.createIndex({ category: 1, status: 1, sort_order: 1 });
db.content_items.createIndex({ slug: 1 });
db.content_items.createIndex({ "supported_languages": 1 });
db.bhakti_items.createIndex({ category: 1, status: 1, sort_order: 1 });
db.bhakti_items.createIndex({ slug: 1 });

// content_verses
db.content_verses.createIndex({ item_id: 1, verse_num: 1 });

// verse_meanings
db.verse_meanings.createIndex({ verse_id: 1, language: 1 }, { unique: true });

// verse_translation_drafts
db.verse_translation_drafts.createIndex({ verse_id: 1, language: 1, is_draft: 1 }, { unique: true });

// vedachat_conversations
db.vedachat_conversations.createIndex({ user_id: 1, updated_at: -1 });

// audit_trail / login_attempts
db.audit_trail.createIndex({ created_at: -1 });
db.login_attempts.createIndex({ ip: 1, created_at: -1 });

// token_blacklist (TTL — auto-expire)
db.token_blacklist.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
```

> The current `server.py` does not auto-create these indexes — adding them at deploy time is recommended.

---

## Static media layout (filesystem)

The backend mounts these directories under `/api/*-static/*`:

```
backend/static/
├── audio/items/<item_id>.mp3                  → /api/audio-static/items/<id>.mp3
├── audio/items/<item_id>_v2.mp3               (variant slot 2)
├── aarti/<item_id>/<lang>/audio/v1.mp3        → /api/aarti-static/<id>/<lang>/audio/v1.mp3
├── aarti/<item_id>/<lang>/video/main.mp4      → /api/aarti-static/<id>/<lang>/video/main.mp4
└── aarti/<item_id>/<lang>/thumbnail/main.png  → /api/aarti-static/<id>/<lang>/thumbnail/main.png
```

For production: replace this disk-backed setup with S3/GCS in front of CloudFront/CloudFlare.
The DB stores **relative URLs** under `/api/...`, so swap the static mount for a CDN-pointing `RedirectResponse` and you keep DB compatibility.
