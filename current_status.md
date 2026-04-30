# Sanatan Saathi — Current Status

_Last updated: 2026-04-30 (Session: P0 verification)_

## Active Work
- **P0 — Stabilize Aarti editor (verify-only, no new features)** → ✅ DONE & VERIFIED (iter22)
- **Safety additions (Phase: Stabilized Core → Add Safety)** → ✅ DONE & VERIFIED (iter23)
  - Download Current Sync button — `data-testid=aarti-sync-download-<lang>`
  - Confirm Overwrite Sync modal — `data-testid=aarti-sync-confirm-modal-<lang>`
- **External-development packaging** → ✅ DONE (this session, no functional changes)
  - `/docs/` folder populated: BLUEPRINT, ONBOARDING, SETUP, API, DATA_SCHEMA, EMERGENT_DEPENDENCIES, current_status
  - `.env.example` templates created for backend / frontend / expo-app
  - `.gitignore` updated to allow `.env.example` files
  - Root `README.md` rewritten as a project landing page
- **Docker compose stack** → ✅ DONE (no code changes)
  - `docker-compose.yml` (mongo, backend, frontend, expo opt-in profile)
  - `backend/Dockerfile` (WORKDIR `/app/backend` to honor hardcoded absolute paths in server.py)
  - `frontend/Dockerfile`, `expo-app/Dockerfile`
  - `.dockerignore` per service
  - SETUP.md updated with **Path A — Docker (one command)** section

## P0 Verification Results (iteration_22.json)
| Item | Result |
|---|---|
| Admin login `/login` → `/admin/dashboard` | ✅ |
| `/admin/arti-manager` lists Aarti, Edit opens drawer | ✅ |
| Drawer tabs render: Content / Full Text / Audio / Video / Sync / Publish (Verses correctly hidden for Aarti) | ✅ |
| Full Text — `setDirty(true)` on edit, badge `fulltext-unsaved-badge` appears, button text becomes `Save Full Text *` | ✅ |
| Full Text — badge & asterisk clear after successful PUT | ✅ |
| Aarti Sync — `.lrc` file upload parses to nested verses | ✅ (4 lines → 2 verses) |
| Aarti Sync — `.json` file upload parses & populates editor | ✅ |
| Save Sync POST `/api/content/items/{id}/lang/{lang}/sync` returns 200 with success banner | ✅ |
| Smoke: Content / Audio / Video / Publish tabs open without crash | ✅ |

**Frontend success rate: 5/5 verifications + 4/4 smoke tabs = 100%**

## ⚠️ Side-effect from testing
The testing agent's Save Sync run **overwrote the Hindi sync_map** on `aarti_id=69f1e1a77488457efddb02b7` with a 1-verse `"Test"` fixture. The 5-verse Hindi sync from iter20 fixtures must be re-uploaded before publishing this Aarti to mobile.

## Files touched this session
- `/app/frontend/src/pages/BhaktiEditorDrawer.js` — `FullTextTab` `dirty` state fully wired:
  - `setDirty(true)` in textarea `onChange` (line 429)
  - `setDirty(false)` after successful PUT (line 369)
  - Badge in tab header (line 393–400, `data-testid=fulltext-unsaved-badge`)
  - Save button text shows `Save Full Text *` when dirty / `Saving…` when in-flight (line 446–453)
- `/app/BLUEPRINT.md` — saved canonical product blueprint (no code change)

## What is intentionally NOT done (per user directive)
- ❌ P1 (Cloudflare RUM error suppression) — explicitly deferred
- ❌ P2 (per-tab Save indicators) — explicitly deferred
- ❌ Auto Sync LLM button — user-deferred indefinitely

## Backlog (next safe steps when user approves)
- Restore the overwritten Hindi sync for the single Aarti (re-upload via Sync tab)
- P1 — global axios interceptor to swallow `/cdn-cgi/rum` failures
- P2 — uniform per-tab save status badges (dot/asterisk)
- Mobile STT, Offline downloads, Dark mode (P3)
- **DB backup + seeds + GitHub push prep** → ✅ DONE (this session, no code changes)
  - `/backup/sanatan_saathi_dump.tar.gz` (184 KB, 30 collections, PII masked)
  - `/seeds/seed.py` + 6 JSON files (305 docs, fallback path)
  - `/docs/BACKUP.md` + `/backend/.env.local`
  - Round-trip verified for both restore paths
  - GitHub push: use the platform's **Save to GitHub** button
