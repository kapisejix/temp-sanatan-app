# Sanatan Saathi — PRD (Product Requirements Document)

## Original Problem Statement
Build admin panel + backend APIs for "Sanatan Saathi" — a spiritual companion for Sanatan Dharma. Key requirements from user:
1. Multilingual Data Architecture with dynamic language tabs in Bhakti Category Manager
2. Content Integrity — no truncation, enhanced DOCX parser, Live Preview
3. New hierarchical Granth/Katha/Vedas modules (Book → Volume → Chapter → Verse)
4. Import Wizard for bulk CSV/JSON/DOCX upload with language mapping
5. Mobile App integration (Expo - future)

## Architecture
- **Frontend (Admin Panel)**: React.js + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (designed for Supabase migration)
- **AI Services**: Claude via Emergent LLM Key (VedaChat, DOCX/PDF parsing)

## What's Been Implemented (April 2026)
- [x] Existing codebase from user's GitHub imported
- [x] **Import Wizard** — 4-step bulk upload wizard (CSV/JSON/DOCX) with language selection & AI parsing
- [x] **Live Preview Modal** — Shows how content appears in the mobile app (Beginner/Expert modes, multi-language, mobile/tablet/desktop simulation)
- [x] **Dynamic Multilingual Language Tabs** — In BhaktiCategoryManager edit modal, selecting a language initializes dedicated text areas
- [x] **Enhanced Granth Manager** — Hierarchical Book → Chapter → Verse view with multilingual meaning support and verse editing
- [x] **Enhanced DOCX Parser** — Better detection of Devanagari script, line breaks, special chars, no truncation
- [x] **Language-based Content APIs** — /api/content/items-by-lang, /api/content/verses-by-lang for mobile app
- [x] **Granth Hierarchy APIs** — /api/granth/hierarchy, /api/granth/chapter-verses with language filter
- [x] **Languages API** — /api/languages returning 12 supported Indian languages
- [x] **Verse Meaning CRUD** — Add/update meanings per language per verse
- [x] Sample data: 18 Gita chapters, 7 Ramcharitmanas chapters, 9 sample verses

## Testing Results
- Backend: 87.5% pass rate
- Frontend: 75% pass rate
- Core features all working

## Prioritized Backlog

### P0 (Remaining — Next Sessions)
- [ ] Add more sample content (full Gita verses, Chalisa verses)
- [ ] PDF upload + parsing for Vedas/Puranas
- [ ] VedaChat AI with scripture context
- [ ] OpenAI TTS integration for verse audio

### P1 
- [ ] Audio Manager enhancement
- [ ] Panchang bulk import
- [ ] User management features
- [ ] App Settings management

### P2
- [ ] Analytics dashboard
- [ ] Expo mobile integration guide with working code examples
- [ ] Content export functionality
- [ ] Media Studio (image/video generation)

## Next Tasks
1. User to upload real content via Import Wizard
2. Add VedaChat AI integration with Claude
3. Add TTS audio generation for verses
4. Expand Granth section with actual verse data
