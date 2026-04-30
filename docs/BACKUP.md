# BACKUP.md — Database backup, restore & seed

Two equivalent ways to populate a fresh local Mongo:

| Path | When to use | Speed |
|---|---|---|
| **`mongorestore`** (`/backup/sanatan_saathi_dump.tar.gz`) | You have the `mongo-tools` CLI installed. Restores **all 30 collections**. | ~3 sec |
| **JSON seed script** (`/seeds/seed.py`) | You only have the JSON files, or you want a minimal demo dataset. Restores **6 canonical collections** (~305 docs). | ~5 sec |

---

## 1. mongorestore (full backup)

```bash
# 1. Extract
tar xzf backup/sanatan_saathi_dump.tar.gz       # → ./dump/sanatan_saathi/

# 2. Restore
mongorestore --uri="mongodb://localhost:27017/sanatan_saathi" --drop ./dump/sanatan_saathi
```

The `--drop` flag wipes target collections before re-inserting, so this is
**idempotent** — re-run safely whenever you want a clean state.

### Archive contents (30 collections, ~280 KB compressed)

```
dump/sanatan_saathi/
├── admin_users.bson           (+ .metadata.json)
├── app_users.bson
├── content_items.bson
├── content_verses.bson
├── verse_meanings.bson
├── verse_translation_drafts.bson
├── bhakti_items.bson
├── bhakti_verses.bson
├── arti_items.bson            (legacy collection — read-only)
├── kundli_data.bson
├── panchang.bson / panchang_cache.bson
├── vedachat_conversations.bson
├── granth_books.bson / granth_chapters.bson / granth_verses.bson
├── veda_books.bson / veda_chapters.bson / veda_verses.bson
├── mantras.bson, vrat_festivals.bson, daily_schedules.bson
├── notifications.bson, audit_trail.bson, blog_posts.bson, cms_pages.bson
├── upload_logs.bson, integration_settings.bson
└── birth_chart_analyses.bson, graha_scores.bson
```

Round-trip verified (Apr 30 2026):
- 30 BSON files in archive
- 30 collections after restore
- All canonical document counts match (1 admin, 12 mobile, 9 content_items, 136 verses, 146 meanings, 1 aarti with `languages.hi.sync.sync_map`).

---

## 2. JSON seed script (fallback)

If you only have the JSON files (e.g. via `git clone`, no `mongo-tools`):

```bash
# Default DB name = sanatan_saathi, default URL = localhost:27017
python seeds/seed.py

# Or with overrides
MONGO_URL="mongodb://my-host:27017" DB_NAME="custom_db" python seeds/seed.py
```

Imports 6 collections (305 docs total) from `seeds/*.json`:

| Collection | Count | Notes |
|---|---|---|
| `admin_users` | 1 | super-admin |
| `app_users` | 12 | mobile users (masked) |
| `content_items` | 9 | Hanuman Chalisa + 5 other chalisas + 2 mantras + 1 sahasranama |
| `content_verses` | 136 | All chalisa verses with multilingual translations |
| `verse_meanings` | 146 | Per-verse meanings |
| `bhakti_items` | 1 | **Shri Ganesh Aarti** with per-language sync map (the canonical Aarti for testing the editor + mobile player) |

After seeding you have at minimum the data the user requested:
- ✅ **1 Aarti with working sync** → Shri Ganesh Aarti (`category=aarti`, full `languages.hi.sync.sync_map` array)
- ✅ **1 Chalisa** → Hanuman Chalisa (`category=chalisa`, 42 verses)
- ✅ **1 admin user + 1 mobile test user**

---

## 3. Default credentials (after seeding)

| Type | Email (masked) | Password |
|---|---|---|
| Super admin | `a***@example.com` | `Test@12345` |
| Mobile users (×12) | `m***@example.com`, `t***@example.com`, … | `Test@12345` |

> Every seeded `password_hash` is the bcrypt of **`Test@12345`**. Change it on
> first login if anyone else can reach this database.

---

## 4. Sanitization summary

The dump and seed JSON are **safe to commit to a public repo**. Specifically:

| Field | Value in original DB | Value in seeds/dump |
|---|---|---|
| `email` | real address | `<first-letter>***@example.com` |
| `phone` | real number | `+91-XXXX-XX{last4}` |
| `password_hash` | per-user bcrypt | bcrypt of `Test@12345` |
| `last_login_ip` | real IP | `0.0.0.0` |

Collections **dropped** before dumping (security/runtime noise):
`login_attempts`, `security_events`, `token_blacklist`, `otp_store`,
`public_chat_limits`, `analytics_events`.

---

## 5. Connection details

The **canonical local DB name** is **`sanatan_saathi`**. Same value in:
- `/backend/.env.local` (`DB_NAME=sanatan_saathi`)
- `/backend/.env.example` (template default)
- `/docker-compose.yml` (`environment: DB_NAME: sanatan_saathi`)
- `/seeds/seed.py` (default fallback)

> The Emergent preview pod uses `DB_NAME=test_database`. That is **only**
> the dev-platform default — the dump was renamed to `sanatan_saathi`
> before archival so your local matches the canonical name.

To use any other name, just override:
```bash
DB_NAME="my_custom" mongorestore --uri="mongodb://localhost:27017/my_custom" --drop ./dump/sanatan_saathi
DB_NAME="my_custom" python seeds/seed.py
```

---

## 6. Verifying the restore

```bash
mongosh sanatan_saathi --quiet --eval '
  db.getCollectionNames().sort().forEach(c =>
    print(c.padEnd(30) + ": " + db[c].countDocuments()))
'
```

Expected:
```
admin_users                  : 1
app_users                    : 12
arti_items                   : 3
audit_trail                  : 175
bhakti_items                 : 1
bhakti_verses                : 5
... (30 collections total)
```

---

## 7. Re-creating the backup yourself

If you need to refresh the dump from a live database:

```bash
# 1. Clone DB into a temp + mask sensitive fields (script in repo)
mongosh --eval "$(cat backup/clone_and_mask.js)"   # if you keep that helper

# 2. Dump the masked clone, renamed
mongodump --uri="mongodb://localhost:27017/sanatan_saathi_export" --out=./dump_tmp
mv ./dump_tmp/sanatan_saathi_export ./dump_tmp/sanatan_saathi
mv ./dump_tmp ./backup/dump

# 3. Archive
tar czf backup/sanatan_saathi_dump.tar.gz -C backup dump

# 4. Drop the clone
mongosh --eval 'db.getSiblingDB("sanatan_saathi_export").dropDatabase()'
```

> The masking logic used to produce the current archive is preserved in
> session 25 of `/memory/PRD.md` for reference.
