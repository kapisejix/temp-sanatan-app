# 🧠 BLUEPRINT — Sanatan Dharma App

## 0. Global Rule

**DO NOT RE-ARCHITECT. EXTEND EXISTING SYSTEM ONLY.**
Prefer reuse over rebuild. Keep dependencies minimal. Optimize for mobile performance.

---

## 1. Product Vision

A mobile-first platform for **learning, chanting, and practicing Sanatan Dharma** with:

* Guided learning (Beginner Mode)
* Immersive chanting (Expert Mode)
* Accurate Panchang + Kundli-driven suggestions
* Multilingual access across Indian languages

**Primary audience**: 40+ users and families teaching children
**Core promise**: Simple, accurate, devotional experience

---

## 2. Core Modules (Scope)

### A. Bhakti Content

* Aarti (priority)
* Chalisa
* Namavali
* Sahasranama
* Vedic Mantra
* Stotram
* Kavacham
* Nam Ramayanam

### B. Learning Modes

* **Beginner Mode**: TTS (Guru once → Student twice), slower speed, per-verse loop
* **Expert Mode**: MP3 playback + synchronized lyrics (karaoke)

### C. Panchang

* Daily Panchang (Tithi, Nakshatra, Yoga, Karan)
* Rahukalam, Yamagandam, Gulika, Abhijit
* Smart suggestions (rituals/fasting)

### D. Kundli (Mobile-only user feature)

* User inputs birth details
* Displays charts, Grah, Dasha
* Feeds personalized suggestions

---

## 3. Tech Stack

* **Mobile**: React Native (Expo)
* **Backend**: Node.js (current monolith; refactor later)
* **Storage**: Cloud (audio/video/images)
* **DB**: Flexible (NoSQL/SQL—current implementation kept)
* **AI (optional)**: Google Gemini (translation, future tools)
* **TTS**: Google TTS (Beginner Mode)

---

## 4. Data Model (Canonical)

### 4.1 content_items (core)

```json
{
  "id": "",
  "type": "aarti | chalisa | ...",
  "title": "",
  "deity": "",
  "languages": {
    "hi": {
      "full_text": "",
      "verses": [
        {
          "verse_id": 1,
          "lines": ["", ""]
        }
      ],
      "audio_versions": [
        { "label": "Normal", "file": "..." }
      ],
      "video": {
        "file": "optional.mp4",
        "thumbnail": "optional.jpg"
      },
      "sync": {}
    }
  }
}
```

---

### 4.2 Sync JSON (line-level, required for Expert Mode)

```json
{
  "audio_file": "",
  "duration_ms": 0,
  "verses": [
    {
      "verse_id": 1,
      "start_ms": 0,
      "end_ms": 0,
      "lines": [
        { "text": "", "start_ms": 0, "end_ms": 0 }
      ]
    }
  ]
}
```

**Rules**

* No overlaps
* End time = next line start (if not provided)
* Text must match DB exactly

---

## 5. API Contracts (Stable)

* `GET /api/content/items/:id/lang/:lang/media`
  → Returns audio, video/thumbnail, sync, text

* `PUT /api/auth/mobile/settings`
  → Saves user preferences (language, etc.)

**Constraint**: Do not change existing endpoints unless breaking issue.

---

## 6. Business Logic (Non-negotiable)

### Media Selection

```
If video exists → show video
Else → show thumbnail
```

### Audio

* 1–4 variants per language
* Switch without resetting playback time (where feasible)

### Language Fallback

```
Selected → Hindi → First Available
```

### Sync Engine

```ts
currentLine = lines.find(
  l => t >= l.start_ms && t <= l.end_ms
)
```

### UI Behavior

* Tap line → seek to timestamp
* Auto-scroll per verse (avoid jitter)

---

## 7. Admin System (Principles)

* **Unified Editor** (single entry for Content, Verses, Audio, Sync, Publish)
* DOCX import → parse → auto-save draft → open in editor
* Media upload per language:

  * MP3 (1–4)
  * Video OR Thumbnail (file only)
  * Sync JSON/LRC
* Validation on publish:

  * title + verses required
  * warn if audio without sync

**Do NOT create separate managers** (no duplication).

---

## 8. Content Pipeline

```
DOCX → Parse → Verses
MP3 → Upload
LRC → Convert → JSON
→ Attach to language
→ Preview
→ Publish
```

**Decision**: Manual LRC workflow (no AI auto-sync for now)

---

## 9. UX Principles

* Fast start (<300 ms audio after tap)
* Large, readable lyrics (22–26 active)
* Minimal controls
* Smooth scroll (no jitter)
* Calm visuals (light, devotional)

---

## 10. Performance Constraints

* Avoid heavy libs (ffmpeg, librosa) for now
* Preload sync JSON before playback
* Cache media per language
* Keep animations subtle

---

## 11. Non-Goals (for now)

* Auto-sync AI generation (deferred)
* Backend refactor (deferred)
* Complex auth (OTP, etc.)
* Bulk import systems
* Heavy analytics

---

## 12. Security & Data Integrity

* Validate sync JSON (no overlaps, valid ms)
* Sanitize uploaded text (no junk lines)
* Restrict thumbnail to file uploads (no external URLs)

---

## 13. Roadmap (High-Level)

### Phase 1 (Now)

* Aarti mobile playback (video/thumbnail + sync)
* Language preference
* Expert Mode consumption

### Phase 2

* Panchang + smart suggestions
* Kundli integration (mobile)

### Phase 3

* Notifications
* Offline downloads
* Content expansion

---

## 14. Collaboration Rules (for any AI)

* Read `BLUEPRINT.md` + `current_status.md` first
* Do not assume missing data
* Do not introduce new architecture
* Propose minimal, incremental changes
* Prefer configuration over code where possible

---

## 15. Definition of Done

A feature is complete when:

* Works on mobile (real device)
* No sync glitches (no overlap/gaps)
* UI smooth (no lag/jitter)
* Fits existing architecture
* No duplicate systems created
