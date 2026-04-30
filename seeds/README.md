# Seeds & MongoDB Backup

This folder contains everything you need to bring up a working local
database in minutes.

## Two ways to seed your local Mongo

### Option 1 — Full mongodump restore (recommended)

The archive is shipped at `/app/backup/sanatan_saathi_dump.tar.gz`.

```bash
# 1. Extract
tar xzf backup/sanatan_saathi_dump.tar.gz   # creates ./dump/sanatan_saathi/*

# 2. Restore (drops the target DB first to ensure a clean state)
mongorestore --uri="mongodb://localhost:27017/sanatan_saathi" --drop ./dump/sanatan_saathi
```

Folder layout inside the archive:
```
dump/sanatan_saathi/
├── admin_users.bson           + admin_users.metadata.json
├── app_users.bson             + …
├── content_items.bson
├── content_verses.bson
├── verse_meanings.bson
├── bhakti_items.bson
├── bhakti_verses.bson
├── kundli_data.bson
├── panchang.bson / panchang_cache.bson
├── vedachat_conversations.bson
├── verse_translation_drafts.bson
├── arti_items.bson            (legacy, retained read-only)
├── granth_books.bson / granth_chapters.bson / granth_verses.bson
├── veda_books.bson / veda_chapters.bson / veda_verses.bson
├── mantras.bson, vrat_festivals.bson, daily_schedules.bson
├── notifications.bson, audit_trail.bson, blog_posts.bson, cms_pages.bson
├── upload_logs.bson, user_streaks.bson, graha_scores.bson
└── birth_chart_analyses.bson, integration_settings.bson
```

> Sensitive fields (emails, phones, passwords, IPs) were masked **before**
> the dump was created — see *Masking* below.

### Option 2 — JSON seed script (fallback)

If you can't run `mongorestore` (e.g. you only have the JSON files),
use the included Python script:

```bash
# from project root
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="sanatan_saathi"
python seeds/seed.py
```

This drops & re-imports 6 canonical collections from `/seeds/*.json`:
- `admin_users` — 1 super-admin
- `app_users` — 12 mobile users (masked)
- `content_items` — 9 chalisa/sahasranama/mantra
- `content_verses` — 136 verses
- `verse_meanings` — 146 meanings
- `bhakti_items` — 1 Aarti (Shri Ganesh) with per-language sync map

After seeding you have at minimum:
- **1 Aarti with sync** — Shri Ganesh Aarti (`category=aarti`)
- **1 Chalisa** — Hanuman Chalisa (`category=chalisa`) with full verse list
- **1 admin user + 1 mobile test user**

## Default credentials (after seeding)

| Type | Email | Password |
|---|---|---|
| Super admin | `a***@example.com` (was `admin@…`) | `Test@12345` |
| Mobile user | `m***@example.com` etc. | `Test@12345` |

> The `password_hash` field in every seeded user has been replaced with the
> bcrypt hash of `Test@12345`. **Change it on first login** if you expose
> this database to anyone outside your local machine.

## Masking summary

The following fields were sanitized (in both the dump and the JSON seeds) so
nothing personally identifiable leaks into your repository:

| Field | Action |
|---|---|
| `admin_users.email`, `app_users.email` | first letter + `***@example.com` |
| `app_users.phone` | `+91-XXXX-XX{last4}` |
| `*.password_hash` | bcrypt of `Test@12345` |
| `*.last_login_ip` | `0.0.0.0` |

The following collections were **dropped** before dumping (runtime / security
noise that should never be seeded):
- `login_attempts`
- `security_events`
- `token_blacklist`
- `otp_store`
- `public_chat_limits`
- `analytics_events`

## Verify after restore

```bash
mongosh sanatan_saathi --quiet --eval '
  db.getCollectionNames().sort().forEach(c =>
    print(c + ": " + db[c].countDocuments()))
'
```

Expected (approximate) counts:
```
admin_users: 1
app_users: 12
bhakti_items: 1
bhakti_verses: 5
content_items: 9
content_verses: 136
kundli_data: 2
verse_meanings: 146
verse_translation_drafts: 40
... (plus ~24 more collections)
```

## Smoke test the restored DB

```bash
# 1. Boot backend (or `docker compose up backend`)
cd backend && uvicorn server:app --port 8001 --reload

# 2. Login
curl -s -X POST http://localhost:8001/api/auth/admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"a***@example.com","password":"Test@12345"}'

# 3. List Aarti
curl -s "http://localhost:8001/api/bhakti/items?category=aarti" \
     -H "Authorization: Bearer <token>"
```
