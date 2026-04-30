# SETUP.md — Local Development Setup

> Goal: bring the **full Sanatan Saathi stack** (FastAPI backend + React admin + Expo mobile) up on a fresh laptop in under 30 minutes.

There are **two ways** to run the stack locally:

- **Path A — Docker (recommended for a one-command boot)** → see [§A](#a-docker-one-command-boot).
- **Path B — Native installs** (Python venv, Yarn, MongoDB) → see [§1 onwards](#1-prerequisites).

Pick one. Don't mix.

---

## A. Docker (one-command boot)

### Prerequisites
- **Docker Desktop 4.30+** (macOS / Windows) **or** Docker Engine 24+ with the Compose plugin (Linux).
- 4 GB free RAM, ~3 GB disk for the images.

### Step 1 — copy env templates
```bash
cp backend/.env.example   backend/.env
cp frontend/.env.example  frontend/.env
cp expo-app/.env.example  expo-app/.env
```
Edit `backend/.env` and set at minimum:
- `JWT_SECRET` — `python -c "import secrets;print(secrets.token_hex(32))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your seed admin
- `EMERGENT_LLM_KEY` — only if you use AI features (or follow `EMERGENT_DEPENDENCIES.md` to remove)

> `MONGO_URL` and `DB_NAME` are **automatically overridden** inside the compose stack to point at the `mongo` container (`mongodb://mongo:27017`, db `sanatan_saathi`). You can leave the `.env` values as-is.

### Step 2 — bring it up
```bash
docker compose up
```
On first run this builds the backend (~3 min) and frontend (~2 min) images. Subsequent runs reuse the cache.

### Ports
| Service | Container | Host | Purpose |
|---|---|---|---|
| `mongo` | 27017 | **27017** | MongoDB (use `mongosh mongodb://localhost:27017`) |
| `backend` | 8001 | **8001** | FastAPI — `http://localhost:8001/api/` and `http://localhost:8001/docs` |
| `frontend` | 3000 | **3000** | React admin — `http://localhost:3000` |
| `expo` *(opt-in)* | 8081, 19000–19002 | **8081, 19000–19002** | Expo Metro & DevTools |

### Step 3 — open the apps
- Admin panel → **http://localhost:3000/login** (use the admin creds from `backend/.env`)
- Backend health → **http://localhost:8001/api/**
- Swagger UI → **http://localhost:8001/docs**

### Step 4 (optional) — Expo mobile app

Expo is **opt-in** because Docker Desktop's NAT layer breaks the QR-code LAN handshake on macOS / Windows. On Linux it generally works.

```bash
docker compose --profile expo up
```

Then either:
- **macOS / Windows**: switch the Expo CLI to `--tunnel` mode by editing `docker-compose.yml`'s `expo` service `command:` to `["yarn", "start", "--tunnel"]`. Slower, but the QR works from anywhere.
- **Linux**: works as-is in `--lan` mode if your phone is on the same Wi-Fi.

> Many teams just run Expo natively (`cd expo-app && yarn start`) and let docker-compose handle Mongo + backend + frontend only. That is the fastest combo on macOS.

### Common operations
| Goal | Command |
|---|---|
| Tail logs | `docker compose logs -f backend` |
| Restart one service | `docker compose restart backend` |
| Rebuild after `requirements.txt` change | `docker compose build backend && docker compose up -d backend` |
| Stop everything | `docker compose down` |
| **Wipe the DB** | `docker compose down -v` *(removes the `mongo_data` volume)* |
| Shell into a container | `docker compose exec backend bash` |
| Re-seed admin user | `docker compose exec mongo mongosh sanatan_saathi --eval "db.admin_users.deleteMany({})"` then restart backend |

### Assumptions documented
- **Hot reload works** because `./backend`, `./frontend`, `./expo-app` are bind-mounted. Backend uses `uvicorn --reload`; frontend uses CRA polling (`CHOKIDAR_USEPOLLING=true`).
- **`node_modules` are kept inside the container** via an anonymous volume — your host's empty `node_modules` won't shadow the image's installed one.
- **`MONGO_URL` is forced to `mongodb://mongo:27017`** in the backend container regardless of what `.env` says, so the same `.env` file works for both Docker and native dev.
- **`REACT_APP_BACKEND_URL` is forced to `http://localhost:8001`** (the browser runs on the host, not in the container).
- **`emergentintegrations`** is installed from the Emergent CloudFront index inside the backend image. If you can't reach that index from your network, follow [`EMERGENT_DEPENDENCIES.md`](./EMERGENT_DEPENDENCIES.md) Option B.
- **DB_NAME defaults to `sanatan_saathi`** in the compose override — change in `docker-compose.yml` if you want a different name.

### Troubleshooting (Docker)
| Symptom | Fix |
|---|---|
| `port is already allocated` | Another service uses 3000 / 8001 / 27017 → stop it or change the host port in `docker-compose.yml`. |
| Backend logs `No module named 'emergentintegrations'` | The CloudFront index was unreachable during build. Rebuild on a different network or use `EMERGENT_DEPENDENCIES.md` Option B. |
| Frontend not hot-reloading | Confirm `CHOKIDAR_USEPOLLING=true` is set (compose already does this). On Windows, also enable `vmcompute` integration in Docker Desktop. |
| Mongo won't start with "WiredTiger" errors after a crash | `docker compose down -v` and restart (wipes data — only safe in dev). |
| `docker compose up` builds then exits cleanly | First run after a Dockerfile change can race with the bind mount. Run `docker compose up` again. |

---

## B. Native installs (no Docker)

## 1. Prerequisites

| Tool | Min version | Notes |
|---|---|---|
| **Python** | 3.11+ | The backend uses `from __future__ import annotations`-friendly typing. 3.11/3.12 tested. |
| **Node.js** | 18.x or 20.x | Required by both React (CRA 5) and Expo. |
| **Yarn** | 1.22+ (classic) | `npm install -g yarn`. *Do not use npm — it has produced lockfile drift for this project.* |
| **MongoDB** | 6.x or 7.x | Local install or a Mongo Atlas cluster. |
| **Git** | any | |
| **(optional) Expo Go** app | latest | iOS/Android, for mobile preview. |
| **(optional) Watchman** | latest | macOS file-watching for Expo. |

> All commands below assume the project root is `/app`. Adjust if you cloned elsewhere.

---

## 2. Clone & install dependencies

```bash
git clone <your-repo-url> sanatan-saathi
cd sanatan-saathi

# --- backend ---
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# --- frontend (React admin) ---
cd ../frontend
yarn install

# --- expo (React Native mobile) ---
cd ../expo-app
yarn install
```

> ⚠️ `requirements.txt` lists `emergentintegrations==0.1.0`. This is an Emergent-platform-only PyPI package (Gemini/OpenAI universal-key wrapper). Off-platform you must either install it from the Emergent index or replace the imports — see [`EMERGENT_DEPENDENCIES.md`](./EMERGENT_DEPENDENCIES.md).

---

## 3. Configure environment

Copy the templates:

```bash
cp backend/.env.example   backend/.env
cp frontend/.env.example  frontend/.env
cp expo-app/.env.example  expo-app/.env
```

Edit each `.env`:

### `backend/.env`
- `MONGO_URL` — your Mongo connection string.
- `DB_NAME` — keep distinct per environment (`sanatan_saathi_dev`, `_test`, `_prod`).
- `JWT_SECRET` — generate fresh: `python -c "import secrets;print(secrets.token_hex(32))"`.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — auto-seeded super-admin on first startup.
- `EMERGENT_LLM_KEY` — leave blank if you replace LLM calls with native SDKs.

### `frontend/.env`
- `REACT_APP_BACKEND_URL=http://localhost:8001` for local dev.

### `expo-app/.env` (optional)
- The current code reads `API_BASE_URL` from `src/config/api.js`. To use `.env`:
  edit that file to:
  ```js
  export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
    || 'http://localhost:8001/api';
  ```

---

## 4. Start MongoDB

```bash
# macOS (brew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Or run in foreground
mongod --dbpath ~/data/db
```

Verify: `mongosh --eval "db.runCommand({ping:1})"` → `{ ok: 1 }`.

---

## 5. Run the backend (FastAPI)

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

- Health check: `curl http://localhost:8001/api/` → `{"message":"Sanatan Saathi API"}` (or similar).
- Interactive docs: `http://localhost:8001/docs` (FastAPI auto-Swagger).
- On first start, the server seeds the admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

---

## 6. Run the frontend (React admin panel)

```bash
cd frontend
yarn start
```

- Opens on `http://localhost:3000`.
- Login at `/login` with the seeded admin credentials.
- Aarti editor: **/admin/arti-manager** → click *Edit* on any row → drawer opens.

---

## 7. Run the Expo mobile app

```bash
cd expo-app
yarn start
```

- A QR code appears in the terminal.
- Scan with **Expo Go** (Android Play Store / iOS App Store).
- Make sure your phone and laptop are on the **same Wi-Fi**.
- If the phone cannot reach `localhost:8001`, set `API_BASE_URL` in `src/config/api.js`
  to your laptop's LAN IP, e.g. `http://192.168.1.42:8001/api`.

For an iOS simulator: press `i` in the Metro terminal (Xcode required).
For Android emulator: press `a` (Android Studio + AVD required).

See also `expo-app/EXPO_SETUP_GUIDE.md`, `expo-app/VS_CODE_EXPO_GO_SETUP.md`.

---

## 8. Optional services

### Google Cloud TTS (Beginner Mode)
1. Create a Google Cloud project, enable **Text-to-Speech API**.
2. Create a service account JSON key.
3. Set `GOOGLE_APPLICATION_CREDENTIALS=/abs/path/sa.json` in `backend/.env`.
4. See `expo-app/GOOGLE_CLOUD_TTS_SETUP.md` for screenshots.

### Self-hosted Gemini (Translation, VedaChat)
1. Create a Google AI Studio API key.
2. Replace the `emergentintegrations.LlmChat` calls with `google.generativeai` —
   pattern shown in [`EMERGENT_DEPENDENCIES.md`](./EMERGENT_DEPENDENCIES.md).

---

## 9. Smoke test the full stack

```bash
# Login as admin
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"ChangeMeStrong@2026"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Fetch panchang (public)
curl -s http://localhost:8001/api/mobile/panchang/today | head -c 200

# Fetch authenticated content list
curl -s "http://localhost:8001/api/content/items?limit=3" \
     -H "Authorization: Bearer $TOKEN" | head -c 400
```

If both calls return JSON, you're good.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ModuleNotFoundError: emergentintegrations` | Off-platform install | Either install from Emergent index OR replace imports (see EMERGENT_DEPENDENCIES.md). |
| Frontend hot-reload fails | `WDS_SOCKET_PORT=443` in dev | Clear that line in `frontend/.env`. |
| Expo cannot reach backend | `localhost` not visible to phone | Use LAN IP (e.g. `http://192.168.x.x:8001/api`). |
| Mongo connection refused | mongod not running | `brew services start mongodb-community` / `systemctl start mongod`. |
| Login returns 401 | seed mismatch | Delete `admin_users` collection and restart backend; or `mongosh` and `db.admin_users.deleteMany({})`. |
| 5000 port conflict | macOS AirPlay | Backend uses 8001 — frontend uses 3000. Should not collide. |

---

## 11. Project layout (high level)

```
/app
├── backend/                FastAPI service (one big monolith — server.py)
│   ├── server.py           ~3000 lines, all routes
│   ├── routes/             empty placeholder for future split
│   ├── services/           cross-cutting helpers (audio, parsing)
│   ├── *_engine.py         astrology engines (kundli, dasha, dosha, panchang…)
│   ├── translation_service.py   Gemini wrapper
│   ├── tts_service.py      multi-provider TTS facade
│   ├── static/             served at /api/*-static/* for media
│   ├── uploads/            DOCX/PDF intake before parse
│   └── tests/              pytest suite
│
├── frontend/               React 19 + CRA + Tailwind + shadcn/ui
│   └── src/pages/          one page per route (BhaktiEditorDrawer.js is the unified editor)
│
├── expo-app/               React Native (Expo SDK 50+)
│   └── src/screens/v2/     mobile screens (ContentDetailScreen has Aarti player)
│
├── docs/                   ← you are here
│   ├── BLUEPRINT.md        product spec
│   ├── API.md              endpoint catalog
│   ├── DATA_SCHEMA.md      MongoDB collections
│   ├── SETUP.md            this file
│   ├── ONBOARDING.md       day-1 developer guide
│   ├── EMERGENT_DEPENDENCIES.md   how to remove the Emergent runtime
│   └── current_status.md   what's done / next
│
├── memory/                 PRD.md, test_credentials.md (single source of truth)
└── test_reports/           per-iteration QA artifacts
```
