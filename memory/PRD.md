# Sanatan Saathi — PRD (Product Requirements Document)

## Original Problem Statement
User wants to build "Sanatan Saathi" — a comprehensive digital spiritual companion for Sanatan Dharma. The project includes:
- Mobile app (Android + iOS via Expo/React Native)
- Web Admin Panel for content management
- Backend APIs for all services
- AI integrations (VedaChat, DOCX/PDF parsing, TTS, Image/Video generation)

## Architecture
- **Frontend (Admin Panel)**: React.js + Tailwind CSS + Radix UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (designed for easy Supabase migration)
- **Mobile App**: Expo/React Native (user's VS Code)
- **AI Services**: Claude (VedaChat + parsing), OpenAI TTS, Nano Banana (images), Sora 2 (video) — all via Emergent LLM Key

## User Personas
1. **Beginner Devotee** — New to scriptures, needs word-by-word breakdown
2. **Expert Practitioner** — Regular practitioner, continuous play mode
3. **Content Admin** — Manages content via admin panel
4. **Scholar/Researcher** — Deep study via VedaChat AI

## Core Requirements (Static)
- 22 MongoDB collections for all content types
- 70+ REST API endpoints
- 15+ Admin Panel screens with 3-tier role access
- DOCX/PDF upload + AI parsing pipeline
- VedaChat AI chatbot with scripture references
- 12+ Indian language support
- Beginner/Expert mode UX
- Daily routine builder
- Shloka card/video generation

## What's Been Implemented (Jan 2026)
- [x] Blueprint review and analysis completed
- [x] Technical Development Blueprint document created (PDF + MD)
- [x] Database schema designed (22 collections)
- [x] API endpoints designed (70+)
- [x] Admin panel screens designed (15+)
- [x] AI integration plan finalized
- [x] Expo mobile integration guide created

## Prioritized Backlog

### P0 (Must Have — Phase 1-4)
- [ ] Database schema implementation + seed data
- [ ] Admin authentication (JWT + 3 roles)
- [ ] Content APIs (items, verses, meanings)
- [ ] Admin Panel UI (Dashboard, Content Manager, Verse Manager)
- [ ] DOCX Upload + Claude parsing pipeline

### P1 (Should Have — Phase 5-8)
- [ ] Katha, Arti, Granth, Vedas APIs
- [ ] VedaChat AI integration
- [ ] User APIs (profile, likes, saved, history)
- [ ] TTS, Image Gen, Video Gen APIs

### P2 (Nice to Have — Phase 9-12)
- [ ] Audio Manager + Panchang Settings
- [ ] Home & Discovery APIs
- [ ] Admin Panel advanced features
- [ ] Polish, testing, documentation

## Next Tasks
1. User reviewing blueprint PDF
2. User sharing GitHub repository with existing code
3. Start Phase 1 development after approval
