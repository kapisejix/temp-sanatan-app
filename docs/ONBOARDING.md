# ONBOARDING.md — Developer Onboarding Guide

> Welcome to **Sanatan Saathi**. This guide gets a new engineer from "I just cloned the repo" to "I just shipped my first PR" in **a single working day**.

---

## Day 0 — read these, in this order (~45 min)

1. [`docs/BLUEPRINT.md`](./BLUEPRINT.md) — product vision, scope, non-goals. Treat as canonical.
2. [`docs/current_status.md`](./current_status.md) — what's done, what's in flight, what's deferred.
3. [`docs/SETUP.md`](./SETUP.md) — install + run.
4. [`docs/API.md`](./API.md) — endpoint catalog. Skim the section headings; deep-dive only the modules you'll touch.
5. [`docs/DATA_SCHEMA.md`](./DATA_SCHEMA.md) — MongoDB collections; you'll come back here a lot.
6. [`docs/EMERGENT_DEPENDENCIES.md`](./EMERGENT_DEPENDENCIES.md) — only if you're running off the Emergent platform.

---

## Day 1 — set up your machine (~2 hours)

Follow [`SETUP.md`](./SETUP.md) end-to-end. Stop at the **Smoke test** step.

### Hard gates (must work before you touch any code)
- [ ] `mongosh --eval "db.runCommand({ping:1})"` → `{ ok: 1 }`
- [ ] `curl http://localhost:8001/api/` → 200
- [ ] `http://localhost:3000/login` → admin login screen
- [ ] Expo Metro bundler starts cleanly with `yarn start`
- [ ] Login as admin → /admin/dashboard renders

> If any gate fails, **don't continue** — fix it. The rest of the project will be confusing if these aren't green.

---

## Day 1.5 — repo tour (~1 hour)

```
/app
├── backend/                    ← FastAPI monolith
│   ├── server.py               ★ start here. ~3000 lines, all routes
│   ├── translation_service.py  ★ Gemini wrapper
│   ├── ai_interpreter.py       ★ Dasha/Dosha narratives
│   ├── kundli_engine.py        astrology core
│   ├── dasha_engine.py         Vimshottari Dasha
│   ├── dosha_engine.py         Mangal/Kaal-Sarp/Pitri
│   ├── d7_engine.py / d9_engine.py / d10_engine.py
│   ├── panchang_engine.py      Tithi/Nakshatra/Yoga/Karan + Rahukalam
│   ├── dharma_engine.py        rule-based daily dharma
│   ├── docx_parser.py          import wizard
│   ├── audio_sync_service.py   sync map I/O
│   ├── tts_service.py          provider switching
│   ├── tests/                  pytest
│   └── static/, uploads/       file storage
│
├── frontend/                   ← React 19 + CRA + Tailwind + shadcn/ui
│   └── src/
│       ├── App.js              ★ routes table — read this first
│       ├── pages/
│       │   ├── BhaktiEditorDrawer.js   ★ ~1800 lines, the unified Bhakti editor
│       │   ├── ChalisaManagerPage.js, AartiManagerPageNew.js, …
│       │   ├── MultilingualEditorPage.js
│       │   ├── DashboardPage.js, UsersPage.js, AdminUsersPage.js
│       │   └── …
│       ├── components/ui/      shadcn primitives — DO NOT modify
│       └── lib/                shared helpers (kundliLayout.js, api client)
│
├── expo-app/                   ← React Native (Expo SDK 50+)
│   └── src/
│       ├── api/client.js       ★ axios instance + AsyncStorage token
│       ├── config/api.js       ★ API_BASE_URL (replace if self-hosted)
│       ├── screens/v2/
│       │   ├── ContentDetailScreen.js   ★ AartiHero player + sync engine
│       │   ├── LanguageSettingsScreen.js
│       │   └── …
│       ├── contexts/AuthContext.js
│       └── store/authStore.js
│
├── memory/                     ← single source of truth
│   ├── PRD.md                  product requirements + per-session changelog
│   └── test_credentials.md     test accounts (NEVER hardcode in code)
│
├── test_reports/               per-iteration QA artifacts (iter1, iter2, …)
└── docs/                       ← this folder
```

### Where to put what
| Type of change | Location | Pattern |
|---|---|---|
| New backend route | `server.py` | `@api_router.get("/your/route")` |
| New backend engine / pure logic | `*_engine.py` (root of `backend/`) | one file per concern |
| New admin page | `frontend/src/pages/YourPage.js` | add route in `App.js` under `/admin/` |
| New mobile screen | `expo-app/src/screens/v2/YourScreen.js` | register in stack navigator in `App.js` |
| New shared UI component | `frontend/src/components/` | reuse shadcn primitives from `components/ui/*` |
| New mobile API call | `expo-app/src/api/client.js` | add to the `api` export object |

---

## Day 1.75 — coding conventions (read once, internalize)

### Architecture rules (from `BLUEPRINT.md` §0)
- **DO NOT re-architect.** Extend, don't rewrite.
- **No duplicate managers.** The Bhakti editor is one drawer; do not create per-category editors.
- **No new heavy deps** (ffmpeg, librosa, etc.). Optimize for mobile.
- **Mobile-first.** Every UI change must work on a phone before it ships.

### Backend
- All API routes prefixed with `/api/`. The Kubernetes ingress strips nothing — your route literally must include `/api/`.
- `MONGO_URL` and `DB_NAME` come from env. Never hardcode.
- Excludes `_id` from API responses (BSON ObjectId is not JSON-serializable). Use Pydantic response models when in doubt.
- Use `datetime.now(timezone.utc)`, never `datetime.utcnow()`.
- All admin mutations write a row to `audit_trail`.
- New JWTs must respect `token_blacklist` (TTL-indexed).

### Frontend (React)
- **Always** use `process.env.REACT_APP_BACKEND_URL` for the API root. Never hardcode.
- Tailwind + shadcn/ui only. No CSS-in-JS, no Material UI, no Bootstrap.
- Every interactive element gets a `data-testid` (e.g. `data-testid="aarti-sync-save-hi"`). Used by the testing agent.
- New components: `<50 lines` ideally. Larger pages should compose from smaller pieces.
- Tab-based pages keep state in the parent — child tabs lift state up via callbacks.

### Frontend (Expo)
- Use `expo-av` for audio/video. Don't introduce a second media library.
- All network calls go through `src/api/client.js`. Don't `axios.create()` ad-hoc.
- Persist long-lived state via `AsyncStorage` (token, preferred_language).

### Multilingual rules
- Source of truth: `languages.{code}` map on the document.
- Fallback: **selected → Hindi (`hi`) → first available**. Never crash on missing data.
- Every text element with non-Latin script must set `lang={code}` and prefer the Noto family for that script (handled by `style={{ fontFamily }}`).

### Testing
- Backend: `pytest` in `backend/tests/`. Write a test for every new route.
- Frontend: rely on the testing agent (`testing_agent_v3_fork`) for E2E. Don't bring in Jest/Cypress.
- After touching a feature, **always** end with a smoke check: one curl + one screenshot, OR one testing-agent run.

---

## Day 2 — your first PR

Pick one of these starter tickets (all small, isolated):

1. **Add an "Export verses to .docx" button** in the Verses tab of `BhaktiEditorDrawer.js`. Mirror the new "Download Sync" pattern (client-side blob, no backend).
2. **Wire the unsaved-changes badge** in the **Audio** tab too — same pattern as the Full Text tab (lines 326-446 of BhaktiEditorDrawer.js).
3. **Add P1 Cloudflare-RUM error suppression** — a small axios interceptor that swallows `/cdn-cgi/rum` failures so the React red-screen doesn't fire. (See `current_status.md` "Backlog".)

### Workflow
```bash
# 1. Branch
git checkout -b feature/your-thing

# 2. Code
#    — only touch files you need to.
#    — match existing style. Prefer `search_replace` over rewrites.

# 3. Lint
cd backend && ruff check .
cd ../frontend && yarn lint

# 4. Tests
cd ../backend && pytest -q
cd ../frontend && yarn test --watchAll=false  # if/when wired

# 5. Smoke
curl -s "$API/api/your/new/route" -H "Authorization: Bearer $TOKEN"

# 6. PR
git push origin feature/your-thing
```

PR description checklist:
- [ ] What changed (1-2 lines)
- [ ] Screenshot for any UI change
- [ ] How you tested (curl / test report path / Expo Go device)
- [ ] Any new env vars or migration steps
- [ ] No hardcoded URLs, secrets, or `console.log`s

---

## Common pitfalls (learn from previous sessions)

| Symptom | Root cause | Fix |
|---|---|---|
| `ObjectId is not JSON serializable` | Returning a Mongo doc directly | `.find({}, {"_id": 0})` or use Pydantic response model |
| Date in DB is naive UTC | Used `datetime.utcnow()` | Switch to `datetime.now(timezone.utc)` |
| Mobile shows "Failed to fetch" but backend logs nothing | Cloudflare RUM beacon blocked by ad-blocker | Cosmetic — see `EMERGENT_DEPENDENCIES.md` §5 |
| Aarti Audio Sync editor blank | Item is in `bhakti_items`, not `content_items` | The endpoint resolves both via `resolve_item_collection` — don't query `content_items` directly |
| `emergentintegrations` import error | Off-platform install | See `EMERGENT_DEPENDENCIES.md` Option A or B |
| Save spinner stuck forever | Missing `setDirty(false)` after PUT | Mirror the `FullTextTab.save()` pattern (line 367 of BhaktiEditorDrawer.js) |
| Verse text disappears after switching language | Per-language state collision | Read from `languages.{lang}.full_text`, fall back to legacy `text_{lang}`, then `''` |

---

## Glossary

| Term | Meaning |
|---|---|
| **Aarti** | Devotional song. Stored in `bhakti_items`. Has video/thumbnail per language. No verses tab. |
| **Chalisa** | 40-verse hymn. Stored in `content_items`. Has Verses tab + Audio Sync. |
| **Beginner Mode** | TTS-driven Guru→Student loop. Slow speed. |
| **Expert Mode** | MP3 + line-level karaoke sync. |
| **Sync Map** | `[{verse_num, start_ms, end_ms, text, lines:[{text,start_ms,end_ms}]}]`. Loaded by the player to highlight the current line. |
| **Bucket / Language Bucket** | `languages.{code}` sub-document. Self-contained per-language media + text. |
| **Drawer** | The right-hand slide-in panel that hosts the unified Bhakti editor (`BhaktiEditorDrawer.js`). |
| **Universal Key / Emergent LLM Key** | Single API key on Emergent that works for OpenAI / Gemini / Claude / OpenAI-image / Sora / Whisper. Off-platform: replace with native SDKs. |
| **Universal item** | Any document where `category ∈ {chalisa, aarti, namavali, …}`. |
| **Publish-check** | Server validation that runs before `status: published`. Catches missing audio, missing thumbnail-or-video for aarti, missing translations. |

---

## Where to ask for help

1. Search `memory/PRD.md` (per-session changelog).
2. Search `test_reports/iteration_*.json` (the testing-agent's findings often pinpoint the issue).
3. Reach out on Slack/Discord (channel name lives outside the repo for security).

---

## Reading list (after Day 2, when you want depth)

- `backend/server.py` lines `@api_router` blocks — pick any module you'll touch and read its handlers end-to-end.
- `backend/kundli_engine.py` — the core astrology math. Pure functions, well isolated.
- `frontend/src/pages/BhaktiEditorDrawer.js` — example of a multi-tab editor done right.
- `expo-app/src/screens/v2/ContentDetailScreen.js` — the player + sync engine reference.
- `docs/SanatanSaathi_Technical_Blueprint.md` — long-form historical doc (predates BLUEPRINT.md; use only for context).
