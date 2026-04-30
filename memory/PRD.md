# Sanatan Saathi — PRD

## Vision
Multilingual spiritual platform: React Admin Panel + FastAPI Backend + Expo Mobile App with AI + Rule-Based Astrology Intelligence.

## Sessions

### Session 1: Foundation (existing GitHub import + Multilingual + Import Wizard + Granth Manager)
### Session 2: Vedas & VedaChat AI
### Session 3: Smart Search + Expo skeleton
### Session 4: Graha-based Mantra + Multilingual TTS (Google/OpenAI/ElevenLabs switchable)
### Session 5: AI + Rule-Based Astrology Intelligence (Vimshottari Dasha, Doshas, D9, AI Hybrid Layer, Charts)
### Session 6: Voice + Mobile App scaffold (browser STT + speaker, Expo 5-tab + AI chat modal)
### Session 7: Mobile Live Backend + APScheduler + VS Code/TTS guides

### Session 8: Mobile Navigation Overhaul + Intent-Based Bhakti (Feb 2026)

### Session 9: Multilingual Editor + Gemini AI Translation (Feb 2026)
- **New backend service** `/app/backend/translation_service.py` wrapping Gemini 2.5 Flash via `emergentintegrations.LlmChat` (uses Emergent Universal Key)
- **8 new admin endpoints** under `/api/admin/translate/*`:
  - `POST /text` — single text → multi-lang translation
  - `POST /verse` — translate text/transliteration/meaning of a verse, optionally save drafts
  - `GET /drafts/{verse_id}` — list drafts
  - `PUT /drafts/{verse_id}/{language}` — admin manual edit
  - `POST /drafts/{verse_id}/{language}/publish` — move into live `verse_meanings` + `content_verses.text_translations.{lang}` + `content_verses.transliteration_translations.{lang}`
  - `DELETE /drafts/{verse_id}/{language}`
  - `GET /languages` — supported language list
- **Drafts collection** `verse_translation_drafts` keyed by `(verse_id, language, is_draft)` with `is_ai_generated` flag — AI never auto-publishes
- **New admin page** `/admin/multilingual-editor` (`MultilingualEditorPage.js`):
  - Item picker → verses list → editor pane
  - Source language toggle (sa/hi/en) + 6 target language tabs (mr/gu/ta/te/bn/en)
  - Per-language draft status dots (green=published, purple=AI draft, amber=manual draft)
  - "AI Translate (current)" + "Translate All Languages" buttons
  - Save Draft / Publish / Delete actions
  - Frontend retry-on-budget-error UX
- **TipTap-powered Unicode-safe editor** (`UnicodeRichEditor.js`) with proper Noto fonts for Devanagari/Gujarati/Tamil/Telugu/Bengali/Kannada/Malayalam/Gurmukhi/Oriya scripts
- **iteration_10.json**: 11/11 backend pytest pass, frontend e2e pass on all flows

### Session 10: One-click Whole-Item Translate + D7/D10 Charts + Chart Redesign (Feb 2026)
- **One-click "AI Translate Whole Item"** button in Multilingual Editor — loops every verse of an item across all 6 target languages with a live progress bar, retry-on-budget, and 250ms pacing. All output stays as drafts.
- **D7 (Saptamsa) + D10 (Dasamsa) divisional charts** — new `/app/backend/d7_engine.py` and `/app/backend/d10_engine.py` (Parashara classical rules: odd signs = same, even signs = +6 / +8 offset). Stored on `kundli_data.{d7_chart, d10_chart}` and returned by `POST /api/kundli/generate` + `GET /api/charts/d1-d9` (now also returns d7 and d10).
- **NorthIndianChart redesign** — rashi numbers (1-12) at the inner vertex of each of 12 house cells (matches classic North Indian convention from user's reference image), graha abbreviations with degree-in-sign superscripts (e.g. शु¹⁵, के⁰², गु⁰³), distinct color per graha, retrograde marker.
- GrahaKundliPage backfills d7/d10 from `/charts/d1-d9` for legacy kundli docs that pre-date this session.
- **iteration_11.json**: 14/14 backend pytest pass, frontend e2e on 4-chart render + bulk translate + progress bar + button-disable regression.

### Session 11: Mobile-first Kundli refactor + Chart no-overlap engine (Feb 2026)
- **Removed Grah & Kundli from Admin Panel** (route + sidebar entry). Backend kundli APIs remain intact for mobile consumption.
- **New shared layout module** `/app/frontend/src/lib/kundliLayout.js` (also copied to `/app/expo-app/src/lib/`): pure-JS BBox-based layout engine with no-overlap guarantees:
  - 1-2 planets → centered row; 3-4 → vertical stack; 5+ → 2-col grid
  - Font auto-scales 8..14px based on planet count
  - >7 planets → first 7 + "+N" overflow indicator
  - Hindi planet abbreviations (सू/चं/मं/बु/गु/शु/श/रा/के)
- **Web NorthIndianChart** rewritten to use the shared module
- **Mobile NorthIndianChart** built with `react-native-svg`
- **Mobile KundliScreen** rewritten — Form (Name/DOB/TOB/POB) + 4-tab layout: Charts (D1↔D9↔D7↔D10 chip switcher + planet table), Overview, Analysis, Remedies
- **Deferred to Phase 2** (per user request): zoom/pan/tap-bottomsheet, animated planet transitions
- **iteration_12.json**: 5/5 backend regression + 48/48 layout-engine unit tests + admin route removal verified.

### Session 12: Phase 2 — Audio-Text Sync + Mobile Beginner Mode (Feb 2026)
- **Backend `/app/backend/audio_sync_service.py`** — LRC + JSON sync-map parser with sort + end_ms backfill from next start_ms.
- **3 new endpoints** under `/api/content/items/{item_id}/audio`:
  - `POST` — multipart (audio + sync_file + duration_ms), saves to `/app/backend/static/audio/items/{id}.{ext}`, persists `audio_sync` doc with sync_map + audio_url. Includes 25 MB safety guard, audio extension whitelist (mp3/m4a/wav/ogg/aac).
  - `GET` (PUBLIC) — returns audio_url + sync_map for mobile consumption.
  - `DELETE` — admin-only, clears file + db field.
- **Static mount** `/api/audio-static` serves uploaded audio files.
- **Admin page** `/admin/audio-sync` (`AudioSyncManagerPage.js`) — item picker → current audio panel (audio preview + sync table) + replace/upload form with LRC/JSON examples and remove button.
- **Mobile `ContentDetailScreen.js` rewrite** — fetches `/content/items/{id}/audio`; if synced audio exists plays real MP3 with verse-by-verse highlighting on `positionMillis`; falls back to TTS for items without sync. Verses rendered as numbered cards that scale + highlight when active.
- **Mobile Beginner Mode** (🎓 शिक्षण मोड) — for synced items, plays each verse via Google Cloud TTS 3 times with 1.2s pauses, then advances. Banner shows current verse + Stop button.
- **iteration_13.json**: 24/24 backend pytest pass + frontend admin flow green.

### Session 13: Mobile Auth + Pratyantardasha + Yoga Engine (Feb 2026)
- **Mobile JWT Auth** (followed integration_playbook_expert_v2 playbook):
  - New collection `app_users` (separate from `admin_users`). Bcrypt hashing, PyJWT HS256, 24h access + 7d refresh tokens.
  - 4 endpoints: `POST /api/auth/mobile/signup`, `POST /api/auth/mobile/login`, `GET /api/auth/mobile/me`, `POST /api/auth/mobile/logout` (token blacklisted).
  - Brute-force protection: 5 failed attempts in 15 min on `ip:email:mobile` → 429.
  - `get_current_admin` extended to also accept user-role tokens, so kundli/dasha/yoga/tts endpoints work for mobile users while admin-role-gated endpoints reject them.
- **Mobile UI**:
  - `AuthProvider` + `RootGate` in `App.js` switches between `AuthStack` (Login + Signup) and `MainTabs` based on bootstrap state.
  - `LoginScreen.js`, `SignupScreen.js` (Hindi labels, validations, error handling).
  - `ProfileScreen.js` reads user from context, has logout button.
  - **Security fix**: axios 401-interceptor no longer auto-retries with admin creds (would silently downgrade user → admin sessions). Now just clears local token.
- **Pratyantardasha (3rd-level)**: `compute_pratyantardashas(ad_planet, ad_years, ad_start)` returns 9 PDs with PD-years = (AD-years × SubPlanet-years)/120; PD sequence starts from the AD planet. `get_current_dasha` now returns `mahadasha + antardasha + pratyantardasha + pratyantardashas[]`.
- **Yoga Detection Engine `/app/backend/yoga_engine.py`** — rule-based, deterministic detection of:
  - **Raj Yoga** — Kendra lord (1/4/7/10) + Trikona lord (1/5/9) connection (conjunction or mutual aspect).
  - **Dhan Yoga** — 2nd lord + 11th lord connection.
  - **Gaj Kesari Yoga** — Jupiter in 1/4/7/10 from Moon.
  - **Chandra-Mangal Yoga** — Moon + Mars conjunction.
  - **Neech Bhang Raj Yoga** — debilitated planet + cancellation conditions (sign-lord in Kendra OR exalter in Kendra).
  - Strength bucketing (low/medium/high) factors exaltation, own sign, debilitation, retrograde, combustion.
  - Always returns all 5 canonical yogas (status=false for absent ones) so UI can show full state.
- **New endpoint** `GET /api/yogas` returns `{yogas:[5], summary:{total_present, total_checked, high_strength}}`.
- **Special aspects** correctly modeled: Mars 4/8, Jupiter 5/9, Saturn 3/10, Rahu/Ketu 5/9.
- **iteration_14.json**: 39/39 backend pytest pass — mobile auth (signup/login/me/logout + 429 lockout), cross-token isolation, Pratyantardasha math, all 5 yoga rules + strength bucketing, admin regression.

### Session 16: Edit-in-Drawer Refactor + Unified Collection Resolver (Feb 2026 — current)
- **Full-screen right-drawer** `/app/frontend/src/pages/BhaktiEditorDrawer.js` — the 5-tab Unified Editor is now mounted **inside each Bhakti Category manager page** (Chalisa, Aarti, Namavali, Sahasranama, Vedic Mantras, Stotrams, Suktams, Ashtakam, Shatkam, Kavacham, Nam Ramayanam). No more standalone "Bhakti Editor" sidebar entry.
- **Beginner / Expert mode toggle** in the drawer header:
  - *Expert* → shows full 5 tabs including the raw Audio-Sync JSON editor + Expert audio variants (up to 4 MP3s).
  - *Beginner* → hides Audio-Sync JSON and the Expert variants upload UI; surfaces a new **Learner Mode preview tab** that plays **Guru → Student → Student (2x repeat)** using Google TTS — mirrors the mobile Beginner Mode experience so admins can QA pronunciation before publishing.
  - For **Aarti** the toggle is hidden entirely (aarti is consumption-only, no Guru/Shishya learning loop).
- **Per-language Verse Meanings inside verse edit** — language chips (hi/en/sa/mr/gu/ta/te/bn) render inside the verse-edit block; switching a chip loads that language's meaning from `GET /content/verses/:id/meanings` and the Save button upserts dirty edits via `POST /content/verses/:id/meanings`.
- **Unified Collection Resolver** (backend) — added `_resolve_item_collections(item_id)` + `_resolve_verse_collection(verse_id)` helpers in `server.py`. Every `/content/items/:id…` and `/content/verses/:id…` endpoint now transparently serves items from either `content_items` + `content_verses` (legacy Chalisa seeds) or `bhakti_items` + `bhakti_verses` (newer Bhakti Category seeds). Fixes the iter17 critical bug where editing Aarti / Namavali / Sahasranama etc. items threw 404.
- **Sidebar cleanup** — removed the "Bhakti Editor" top-level entry; kept Bhakti Categories dropdown intact.
- **Import Wizard auto-redirect** — after `POST /admin/import-wizard/publish/:upload_id`, the frontend now navigates to the correct category-manager page `/admin/{category}-manager?edit=:first_item_id` (instead of `/admin/bhakti/editor/:id`), which auto-opens the drawer on the newly imported item.
- **Mobile Beginner Mode loop** refined from uniform 3-iteration repeat to distinct Guru pause (1200ms) vs Student pauses (900ms) so the "teacher says then students repeat" cadence feels natural.
- **Testability** — every Edit action button now carries `data-testid="edit-item-{id}"`; drawer tabs carry `drawer-tab-{content,verses,audio,sync,learner,publish}`; meaning chips carry `meaning-lang-{code}`.
- **iteration_18.json**: 20/20 backend pytest pass (8 new resolver tests in `test_iter18_bhakti_collection_resolver.py` + 12 iter16 regression tests) in 3.4s; Aarti drawer opens successfully end-to-end; 0 critical / 0 minor backend issues.

### Session 15: Unified Bhakti Editor + Strict Sync Schema + Expert Audio (Feb 2026)
- **Unified Bhakti Editor** `/app/frontend/src/pages/BhaktiUnifiedEditor.js` with 5 tabs:
  - **Content** — title (hi/en/sa), deity, thumbnail, supported languages, per-language description tabs (hybrid multilingual: `content_items.languages.{lang}.title/description` added alongside legacy flat fields)
  - **Verses** — auto-opens FIRST verse in edit mode on load (reduces clicks); inline add/edit forms reuse existing `/content/verses/*` APIs
  - **Audio** — Primary audio upload + up to 4 Expert-Mode variants with labels (Male/Female/Slow/Fast etc). Delete per variant.
  - **Audio Sync** — JSON editor pre-filled with strict nested format `{audio_file, duration_ms, verses:[{verse_id,start_ms,end_ms,lines:[{text,start_ms,end_ms}]}]}`. Live preview table of parsed sync map with lines[].
  - **Publish** — 6-check checklist (title/language/verses required; deity/audio/sync optional) with publish/unpublish actions.
- **Picker page** `/app/frontend/src/pages/BhaktiEditorPicker.js` at `/admin/bhakti/editor` — searchable list of all content items → click Edit → routes to editor.
- **Legacy routes redirect** — `/admin/verse-manager` and `/admin/audio-sync` now `<Navigate>` to the picker automatically. Sidebar consolidated: "Bhakti Editor" entry replaces old "Verse Manager" + "Audio Sync".
- **Import Wizard** auto-redirect — after `POST /admin/import-wizard/publish/{upload_id}` succeeds, frontend navigates to `/admin/bhakti/editor/{first_item_id}?tab=content`. Backend returns `item_ids[]` on publish.
- **Backend extensions**:
  - `POST /api/content/items/{id}/audio` now accepts `variant_slot=1..4` + `variant_label` → stored at `items/{id}_v{slot}.{ext}`, merged into `audio_sync.variants[]`.
  - `DELETE /api/content/items/{id}/audio/variants/{slot}` — removes file + metadata, preserves others.
  - `POST /api/content/items/{id}/audio/sync` — strict nested JSON endpoint (auto-detects nested vs flat shape via `verses[0].lines` key).
  - `audio_sync_service.parse_nested_json_sync` — sort + dedup + backfill end_ms + auto-derive verse text from joined line texts.
  - `GET /api/content/items/{id}/publish-check` — returns `can_publish` + per-check details for UI.
  - `PATCH /api/content/items/{id}/status` with `published` now 422s if title/supported_languages/≥1 verse is missing.
  - `ContentItemCreate` extended with optional `languages: Dict[str, Dict[str,str]]` for hybrid multilingual.
- **Mobile line-level karaoke** in `ContentDetailScreen.js`:
  - Parses nested `verse.lines[]` from `/content/items/{id}/audio`, highlights the active LINE inside the active verse (new `lineActive` style: amber background, bold).
  - Variant picker chip bar (डिफ़ॉल्ट + each variant label) — switching variant unloads+restarts playback.
- **iteration_16.json**: 12/12 backend pytest pass (primary + variant upload, delete-variant, nested sync round-trip, publish-check, 422 on bare-item publish, import-wizard item_ids[]) + Playwright: 5 tabs, 2 redirects, auto-edit-first-verse, sidebar cleanup — 0 console errors.
- **Known minor**: cached `total_verses` field on `content_items` (set once at create) can drift from live `count_documents`. Does NOT affect publish validation (uses live count). To reconcile: recompute on verse CRUD — tracked in backlog.

### Session 14: Personalized Dharma Engine + Panchang v2 + Festivals + DOCX Bug Fix (Feb 2026)
- **Panchang v2 engine** `/app/backend/panchang_engine.py`:
  - Precise tithi/nakshatra/yoga start+end timestamps (Newton-style bisection)
  - Abhijit Muhurta (skipped on Wednesdays), Amrit Kalam (per-nakshatra window), Gulika Kaal, Yamagandam
  - Bhadra (Vishti karana) and Panchak (nakshatras 22-26) flags
  - North (Purnimanta) vs South (Amanta) toggle
  - Hindu month name correctly derived (`(sun_sidereal_sign + 1) % 12` rule)
  - Cached per (date, lat, lon, tz, system) with TTL index for 12h auto-cleanup
- **Festival Detection Engine** `/app/backend/festival_engine.py` — 25 rules covering Ekadashi/Pradosh/Sankashti/Purnima/Amavasya/Shivratri Masik + 18 major festivals (Diwali, Holi, Janmashtami, Navratri, Dussehra, Karva Chauth, Raksha Bandhan, Guru Purnima, Ram Navami, Hanuman Jayanti, Dhanteras, Bhai Dooj, Chhath, Makar Sankranti, Basant Panchami, Maha Shivratri, Ganesh Chaturthi).
- **Dharma Engine** `/app/backend/dharma_engine.py` + `/app/backend/dharma_rules.json`:
  - 70 rules across weekday × dasha × tithi × nakshatra × yoga × festival × Bhadra/Panchak categories
  - Planet→Deity→Mantra DB for all 9 grahas (mantra, count, day, color, offering, action list)
  - Rule runner: condition matcher + priority-sort + de-dup-by-focus-planet → Top 5 personalized cards
  - Works anonymously (panchang-only rules) AND personalized (uses kundli's weak_planets + current MD/AD/PD)
- **New endpoints**:
  - `GET /api/panchang/day?lat&lon&tz&date&system` (public, cached) — comprehensive Panchang
  - `GET /api/dharma/today?lat&lon&tz&system` (auth-optional) — Top-5 personalized guidance cards
- **Mobile UI**:
  - `HomeScreen.js` — new "🧠 आज का व्यक्तिगत मार्गदर्शन" section with up-to-5 dharma cards (priority-sorted, deity+mantra+actions+festival banner+Bhadra/Panchak warnings)
  - `PanchangScreen.js` — Today tab rewrite: hero (date+sunrise/sunset+main_line_hi), pancha-anga grid with end-times, Shubh Muhurat (Abhijit + Amrit Kalam), Ashubh Kaal (Rahu+Gulika+Yamagandam), today's festivals list, Bhadra/Panchak flag banner, expandable advanced section
- **🐛 BUG FIX — DOCX Import was failing** with "Parsing failed. Check file format." on real-world Chalisa.docx (621 paragraphs, 6 MB). Root cause: Claude AI was timing out (>120s). Fix: built **deterministic `/app/backend/docx_parser.py`** that tags paragraphs by style+formatting (H1=collection, H2=item, H3=section, bold+devanagari=Sanskrit, italic=transliteration, plain=meaning) and walks tokens to build the items+verses tree. **3-second parse, no LLM dependency, handles any size.** Used as primary parser; Claude is now an optional fallback only when heuristic returns 0 items.
- **iteration_15.json**: 18/18 backend pytest pass + Import Wizard end-to-end green (3 chalisas / 129 verses parsed in 2.75s on Chalisa.docx).

### Session 8: Mobile Navigation Overhaul + Intent-Based Bhakti (Feb 2026)
- **Per-tab Stack architecture** in App.js — fixes "inner links don't work":
  - HomeStack, BhaktiStack (11 inner screens), KundliStack, PanchangStack, ProfileStack
  - AIChat as RootStack modal (accessible from any tab)
- **SafeAreaProvider + `SafeScreen` wrapper** — every screen now respects status bar + home indicator (no UI overlap on any phone)
- **Intent-based Bhakti navigation**:
  - By Deity → DeityDetailScreen → ContentDetailScreen (full text + Expo AV audio)
  - Daily Bhakti → ContentDetailScreen
  - Explore → Kathas / Granth / Vedas & Puranas
- **Kathas flow**: Satyanarayan & Bhagwat with Read 📖 / Listen 🎧 toggle
- **Granth flow** (live admin DB):
  - GranthListScreen → fetches `/api/granth/books`
  - GranthChaptersScreen → `/api/granth/hierarchy/{book_id}`
  - GranthVersesScreen → `/api/granth/chapter-verses/{chapter_id}` with Sanskrit + Hindi meaning + per-verse ▶ TTS
- **Vedas flow** (live admin DB):
  - VedasPuranasScreen → 4 Vedas list + Puranas grid (3 available + 3 Coming Soon)
  - VedaSuktasScreen → `/api/vedas/hierarchy/{id}`
  - PuranaDetailScreen → intro + chapter placeholder
- **DEITY_CONTENT** with full Hindi text:
  - Hanuman: Chalisa (full 40 chaupais), Aarti, Bajrang Baan
  - Shiva: Mahamrityunjaya, Aarti, Tandav Stotram (excerpt)
  - Krishna: Aarti, Moola Mantra
  - Durga: Aarti (Jay Ambe Gauri), Beej Mantra
  - Ganesha: Aarti, Moola Mantra
  - Rama: Tarak Mantra, Aarti
- **Audio playback** via Expo AV calling `/api/tts/synthesize` (graceful degradation when TTS not configured)
- **Quick Actions** on Home now correctly switch between tabs via `getParent()?.navigate(tab)`
- README.md fully rewritten with test flow checklist

## Architecture
- Backend: FastAPI + MongoDB + APScheduler + Swiss Ephemeris + emergentintegrations (Claude)
- Admin Panel: React.js
- Mobile App: Expo / React Native — per-tab Stack + SafeAreaProvider, axios client → live backend
- AI: Claude via Emergent LLM Key
- TTS: Switchable (Google / OpenAI / ElevenLabs)
- Voice STT: Browser Web Speech API (Web)

## Tested Flows (iteration_8 — 20/20 backend + structural)
- Bhakti → Hanuman → Hanuman Chalisa → ▶ Play
- Bhakti → Explore → Kathas → Satyanarayan → 📖 Read / 🎧 Listen
- Bhakti → Explore → Granth → Bhagavad Gita → Chapter 1 (अर्जुन विषाद योग) → Verses (Sanskrit + Hindi)
- Bhakti → Explore → Vedas & Puranas → Rig Veda → Sukta list
- Home Quick Action → switches tab properly
- Floating 🤖 → AI Chat modal from any tab

## Backlog
### P1 (next phases of multilingual upgrade)
- [ ] **Mobile Expert Mode** — Consumption + Reel/Video generation flow (deferred from Phase 2 per user request)
- [ ] Zoom/pan + tap-bottomsheet on Mobile Kundli charts (deferred from Phase 1)
- [ ] Animated planet transitions between D1↔D9↔D7↔D10 (deferred from Phase 1)
- [ ] Reconcile cached `content_items.total_verses` with live `count_documents` (minor UI drift noted in iteration_16)

### P2
- [ ] Pratyantardasha (3rd-level dasha) ✓ DONE in Session 13
- [ ] Yoga detection (Raj/Dhana/Gajakesari) ✓ DONE in Session 13 (incl. Chandra-Mangal & Neech Bhang Raj)
- [ ] Email OTP verification on mobile signup (currently auto-login)
- [ ] Mobile push notifications (FCM/APNS)
- [ ] Refactor `server.py` (~5100 lines) → `routes/` modules
- [ ] Push notifications via Expo Notifications + OneSignal
- [ ] EAS build configs for Play Store + App Store
- [ ] Native voice STT on mobile (Expo Speech Recognition)
- [ ] Bulk content import for Puranas (currently placeholder)
- [ ] Search bar functionality on Bhakti screen (currently UI-only)

## Key API Endpoints
### Public (no auth)
- `GET /api/mobile/panchang/today`, `GET /api/mobile/mantra-of-day`
- `GET /api/granth/books`, `GET /api/granth/hierarchy/{book_id}`, `GET /api/granth/chapter-verses/{chapter_id}`
- `GET /api/vedas/books`, `GET /api/vedas/hierarchy/{book_id}`, `GET /api/vedas/chapter-verses/{chapter_id}`

### Authenticated
- `POST /api/kundli/generate`, `GET /api/kundli/my`
- `GET /api/dasha/current`, `POST /api/dasha/interpret`
- `GET /api/dosha/detect`, `POST /api/dosha/interpret`
- `GET /api/charts/d1-d9`, `GET /api/insights/today`, `GET /api/notifications/today`
- `POST /api/tts/synthesize`, `POST /api/vedachat/message`
- `POST /api/admin/translate/text` — Gemini AI text translation
- `POST /api/admin/translate/verse` — Gemini AI verse translation (text+transliteration+meaning), saves drafts
- `GET /api/admin/translate/drafts/{verse_id}` — list drafts for a verse
- `PUT /api/admin/translate/drafts/{verse_id}/{language}` — admin manual edit
- `POST /api/admin/translate/drafts/{verse_id}/{language}/publish` — publish to verse_meanings + content_verses
- `DELETE /api/admin/translate/drafts/{verse_id}/{language}` — delete draft
- `GET /api/admin/translate/languages` — supported language list
