# Sanatan Saathi — PRD

## What's Been Implemented

### Session 1 (Prior)
- Existing codebase imported from user GitHub
- Import Wizard, Live Preview, Multilingual Tabs, Enhanced Granth Manager

### Session 2 (Current)
- [x] **Vedas & Puranas Manager** — Full hierarchical view (Book → Chapter/Mandala → Verse) matching Granth Manager. 4 Vedas with 13 chapters, 3 sample Rig Veda verses. Upload PDF button for parsing new content.
- [x] **VedaChat AI** — Claude-powered chatbot with:
  - **Upload Knowledge** feature: Upload PDF/DOCX → AI parses → saves structured data to `vedachat_knowledge` collection
  - **Knowledge Base Stats** panel showing docs, verses, books count
  - **DB-context answers**: Searches across granth_verses, veda_verses, content_verses, vedachat_knowledge for relevant content
  - **Shloka references**: Returns Book name, Chapter number, Verse number + Sanskrit text + Meaning
  - Multi-turn conversation with history
  - Suggested starter questions
- [x] **Vedas Upload & Parse** — Upload PDF/DOCX for any Veda book → Claude extracts chapters + verses → saves to DB
- [x] **Vedas Verse Editing** — Edit Sanskrit text, transliteration, multilingual meanings per verse

### Backend Endpoints Added
- GET /api/vedas/hierarchy/{book_id}
- GET /api/vedas/chapter-verses/{chapter_id}
- PUT /api/vedas/verses/{verse_id}
- POST /api/vedas/upload-parse
- POST /api/vedachat/upload-knowledge
- GET /api/vedachat/knowledge-stats

### Testing
- Backend: 92.3% pass
- Frontend: 85% pass

## Backlog
### P0
- [ ] Upload real scripture PDFs to populate Vedas content
- [ ] OpenAI TTS for verse audio
- [ ] User-facing mobile APIs with language header

### P1
- [ ] Katha Manager enhancement
- [ ] Arti Manager with audio
- [ ] Panchang bulk import
- [ ] Analytics dashboard

### P2
- [ ] Expo mobile app integration
- [ ] Media Studio (image/video gen)
- [ ] Content export
