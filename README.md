# Sanatan Saathi

> Multilingual spiritual platform — guided learning, immersive chanting, accurate Panchang & Kundli — across React Admin, FastAPI backend, and Expo mobile app.

**Primary audience:** 40+ users and families teaching children.
**Core promise:** simple, accurate, devotional experience.

---

## Repository layout

```
.
├── backend/        FastAPI + MongoDB (one monolith — server.py)
├── frontend/       React 19 admin panel (CRA + Tailwind + shadcn/ui)
├── expo-app/       React Native mobile app (Expo SDK 50+)
├── docs/           ★ all developer documentation
├── memory/         single-source-of-truth (PRD.md, test_credentials.md)
└── test_reports/   per-iteration QA artifacts
```

---

## Get started

1. **Read the docs** in this order:
   1. [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) — product spec
   2. [`docs/ONBOARDING.md`](docs/ONBOARDING.md) — Day-1 developer guide
   3. [`docs/SETUP.md`](docs/SETUP.md) — local install + run
   4. [`docs/API.md`](docs/API.md) — endpoint catalog (~190 routes)
   5. [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md) — MongoDB collections
   6. [`docs/EMERGENT_DEPENDENCIES.md`](docs/EMERGENT_DEPENDENCIES.md) — running off the Emergent platform
   7. [`docs/current_status.md`](docs/current_status.md) — what's in flight

2. **Copy the env templates**:
   ```bash
   cp backend/.env.example   backend/.env
   cp frontend/.env.example  frontend/.env
   cp expo-app/.env.example  expo-app/.env
   ```

3. **Run the stack** (see `docs/SETUP.md` for full instructions):
   ```bash
   # Terminal 1 — backend
   cd backend && uvicorn server:app --port 8001 --reload

   # Terminal 2 — admin panel
   cd frontend && yarn start

   # Terminal 3 — mobile app
   cd expo-app && yarn start
   ```

---

## Tech stack

| Layer | Tech |
|---|---|
| **Backend** | Python 3.11, FastAPI, Motor (async MongoDB), bcrypt, JWT |
| **Database** | MongoDB 6/7 |
| **Admin panel** | React 19, Create React App, Tailwind CSS, shadcn/ui, Radix primitives, axios |
| **Mobile** | React Native + Expo SDK 50+, expo-av (audio/video), AsyncStorage |
| **AI / LLM** | Google Gemini 2.5 (translation, VedaChat), OpenAI (TTS) — wrapped via `emergentintegrations` |
| **TTS** | Google Cloud Text-to-Speech (default), OpenAI TTS (optional) |

---

## Commands cheat-sheet

```bash
# Backend
cd backend && pytest -q                          # tests
cd backend && ruff check .                       # lint
cd backend && uvicorn server:app --port 8001 --reload

# Frontend
cd frontend && yarn lint
cd frontend && yarn start
cd frontend && yarn build                        # production build → frontend/build

# Expo
cd expo-app && yarn start                        # Metro bundler + QR
cd expo-app && yarn android                      # adb install + run
cd expo-app && yarn ios                          # iOS simulator (macOS only)
```

---

## Status

See [`docs/current_status.md`](docs/current_status.md) for the current sprint and backlog.

## License

Internal / proprietary unless explicitly stated otherwise.
