# SanatanSaathi - Complete PRD

## Overview
SanatanSaathi is a comprehensive digital spiritual companion for Sanatan Dharma, featuring 130+ API endpoints, 40+ MongoDB collections, admin panel, public website, and Expo mobile app.

## User Personas
1. **Super Admin** - Full access to all features, content management, user management, integrations
2. **Content Admin** - Content creation and management, verse editing, media upload
3. **Moderator** - Content review, limited editing capabilities
4. **App Users** - Mobile app users consuming spiritual content

## Core Requirements (Static)
- FastAPI backend with MongoDB
- React + Tailwind frontend
- JWT authentication with 3 admin roles
- Expo React Native mobile app
- AI integrations: Claude, OpenAI TTS, Gemini image gen, Sora 2 video gen
- Security hardening: rate limiting, encryption, audit trail

## What's Been Implemented

### Session: April 5, 2026
**10 Bhakti Category Managers Built:**

1. **Aarti Manager** (`/admin/arti-manager`)
   - 11 sub-categories: Ganesha, Hanuman, Krishna, Ram, Shiv, Narayan, Devta, Devi, Sant, Saptavar, Anya
   - NO Beginner/Expert mode (full text only)
   - Audio/video upload support

2. **Chalisa Manager** (`/admin/chalisa-manager`)
   - 4 sub-categories: Devta (22), Devi (21), Sant (9), Anya (2)
   - Doha+Chaupai format
   - Beginner Mode: Verse-by-verse with Sanskrit, Transliteration, Word breakdown, Multi-language meanings
   - Expert Mode: Full text + Audio/Video upload + Timestamps

3. **Namavali Manager** (`/admin/namavali-manager`)
   - 22 deity groups - 108 names format

4. **Sahasranama Manager** (`/admin/sahasranama-manager`)
   - 7 groups - 1000 names format

5. **Vedic Mantra Manager** (`/admin/vedic-mantra-manager`)
   - 15 deity groups + special mantras

6. **Stotram Manager** (`/admin/stotram-manager`)
   - 22+ groups - Shloka format

7. **Suktam Manager** (`/admin/suktam-manager`)
   - 9 suktams - Vedic shloka format

8. **Ashtakam Manager** (`/admin/ashtakam-manager`)
   - 7 deity groups - 8-verse format

9. **Shatkam Manager** (`/admin/shatkam-manager`)
   - 6-verse format compositions

10. **Kavacham Manager** (`/admin/kavacham-manager`)
    - 2 groups (Devta+Devi) - Protection verses

11. **Nam Ramayanam Manager** (`/admin/nam-ramayanam-manager`)
    - 108 names + Ek Shloki Ramayanam

### Features Implemented per Category Manager:
- Sub-category tabs/filter
- Grid view with Title (Hi/En), Deity, Verse count, Languages, Status
- Edit, Delete, View buttons + Checkbox for bulk actions
- Bulk actions: Delete, Export, Generate TTS
- Beginner Mode (except Aarti): Verse-by-verse cards with Sanskrit, Transliteration, Word breakdown, Multi-language meaning tabs
- Expert Mode: Full text + Audio upload + Video upload + Audio-text sync timestamps
- Language options per verse: Hi, En, Sa, Mr, Gu, Ta, Te, Bn

### Backend API Endpoints Added:
- `GET /api/bhakti/items` - List items with category/subcategory/status filters
- `GET /api/bhakti/items/{id}` - Get item with verses
- `POST /api/bhakti/items` - Create new bhakti item
- `PUT /api/bhakti/items/{id}` - Update item
- `PATCH /api/bhakti/items/{id}/status` - Update status
- `DELETE /api/bhakti/items/{id}` - Delete item
- `POST /api/bhakti/bulk-delete` - Bulk delete
- `POST /api/bhakti/bulk-export` - Export items as JSON
- `POST /api/bhakti/bulk-tts` - Queue TTS generation

### UI Components:
- Expandable "Bhakti Categories" section in sidebar
- Responsive grid layout for all managers
- Modal forms with Beginner/Expert toggle
- Multi-language tab system for meanings

## Color Scheme
- Primary: #E95A34
- Background: #F8F3F1
- Text: #374652
- Secondary: #989EA4
- Accent: #D08465
- Highlight: #EB9C8C

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- ✅ Content import from DOCX files (structure provided)
- ✅ Seed all 10 categories with actual Hindi/Sanskrit content
- ✅ 35 items imported with 25 verses across all categories

### P1 (High)
- TTS generation integration with OpenAI
- Audio-text sync player UI
- Content versioning

### P2 (Medium)
- Bulk content import CSV/JSON
- Content approval workflow
- Analytics per category

## Next Tasks
1. Import content from provided DOCX files into MongoDB
2. Implement TTS generation worker
3. Add audio player with text highlighting
4. Create mobile app content sync
