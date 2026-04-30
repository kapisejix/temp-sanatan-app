# Sanatan Saathi — Audio & Audio-Sync Author's Guide

A complete walkthrough of the Audio + Audio-Sync pipeline used by the Bhakti
Unified Editor (Chalisa, Aarti, Namavali, Sahasranama, Vedic Mantras, Stotrams,
Suktams, Ashtakam, Shatkam, Kavacham, Nam Ramayanam) and how mobile users
hear & see it.

---

## 1. Big picture in one paragraph

For every bhakti item the editor stores **one primary MP3** (the canonical
recording) plus an optional **sync map** that says *"verse 1 starts at 0ms,
verse 2 starts at 5800ms…"*. Optionally, you can upload up to **4 Expert-mode
variants** (Male / Female / Slow / Fast voices) that all share the same sync
map. Mobile users either listen straight through (audio + verse-level
highlighting) or switch on **Beginner Mode** which uses Google TTS to play
*Guru → Student → Student* with a 2× repeat per verse.

---

## 2. The 5 tabs of the Bhakti Editor

```
Content   →  metadata: title, deity, supported languages, description
Full Text →  one big multilingual textarea per language (the entire item)
Verses    →  verse-by-verse rows (sanskrit_text + transliteration + meaning per language)
Audio     →  upload primary MP3 + Expert variants
Audio Sync→  the JSON that maps timestamps to verses & lines
Publish   →  pre-publish checklist + publish/unpublish action
```

For **Aarti**, the *Verses* tab is intentionally hidden — you author the entire
aarti in the **Full Text** tab as one block per language.

---

## 3. Audio file requirements

| Property        | Allowed                                                     |
|-----------------|-------------------------------------------------------------|
| Container       | `.mp3`, `.m4a`, `.wav`, `.ogg`, `.aac`                      |
| Max size        | **25 MB** (enforced server-side)                            |
| Bitrate         | 128 kbps – 256 kbps (CBR) recommended for chalisas/aartis   |
| Channels        | Mono is fine; stereo if music has clear left/right elements |
| Sample rate     | 44 100 Hz (default) or 48 000 Hz                            |
| Loudness        | -16 LUFS integrated (mobile-podcast standard)               |
| Trim            | Trim silence at head & tail, but keep musical breaths       |

**Naming inside the editor** — you don't need to name the file; the backend
stores it as `/api/audio-static/items/{item_id}.{ext}` (primary) or
`/api/audio-static/items/{item_id}_v{slot}.{ext}` (Expert variant).

---

## 4. Expert variants (1–4 voices)

The Audio tab has two upload modes:

- **Primary** — the default voice + (optional) sync-map upload.
- **Expert Variant** — 4 numbered slots (1–4), each with a free-form label
  (e.g. *"Male"*, *"Female"*, *"Slow"*, *"Fast"*, *"Acapella"*).

Mobile shows a chip bar above the player when ≥ 1 variant exists. Tapping a
chip restarts playback with that file but keeps the same sync map (so verses
still highlight at the right times — assuming the variants were re-recorded
to the same tempo as the primary).

```
[ डिफ़ॉल्ट ] [ Male ] [ Female ] [ Slow ]   ← variant chip bar
─────────────────────
  ▷ ────────────────  3:42 / 6:18
```

If a variant differs from the primary in tempo, you should record a separate
sync map for it. Today the schema shares one sync map across variants — let
the team know if you need per-variant maps.

---

## 5. The Sync map — strict nested format

The Audio Sync tab edits this JSON. It is the **canonical** format, designed
to support **karaoke-style line-by-line highlighting** on mobile:

```jsonc
{
  "audio_file": "/api/audio-static/items/69f053c8053b601fc045a5ca.mp3",
  "duration_ms": 246000,
  "verses": [
    {
      "verse_id": 1,
      "start_ms": 0,
      "end_ms": 5800,
      "lines": [
        { "text": "जय हनुमान ज्ञान गुण सागर ।",            "start_ms":    0, "end_ms": 2900 },
        { "text": "जय कपीस तिहुँ लोक उजागर ॥",            "start_ms": 2900, "end_ms": 5800 }
      ]
    },
    {
      "verse_id": 2,
      "start_ms": 5800,
      "end_ms": 11400,
      "lines": [
        { "text": "राम दूत अतुलित बल धामा ।",              "start_ms": 5800, "end_ms": 8650 },
        { "text": "अंजनि पुत्र पवनसुत नामा ॥",              "start_ms": 8650, "end_ms": 11400 }
      ]
    }
  ]
}
```

### Rules

1. **`audio_file`** is informational only — the backend resolves the actual MP3
   via the item id. Leave it as the URL the editor pre-fills.
2. **`duration_ms`** is the total length of the MP3 in milliseconds. Used to
   backfill the last verse's `end_ms` if you forget it.
3. **`verses[]`** must be sorted by `start_ms` (the parser will sort, but it's
   easier to author in order).
4. Each verse has a unique **`verse_id`** (1-indexed) matching what you put in
   the Verses tab.
5. **`lines[]`** is *required* for karaoke highlighting. If you only know
   verse-level boundaries, put the whole verse text in one line.
6. **Times are integers in milliseconds** (not seconds, not strings).
7. The parser will **auto-fill missing `end_ms`** from the next entry's
   `start_ms` (or from `duration_ms` for the last item).

### Backwards-compatible flat formats

Two legacy shapes are still accepted on the Audio tab "Upload sync file"
field — useful if you have existing assets:

#### LRC (.lrc)

```
[00:00.000]जय हनुमान ज्ञान गुण सागर
[00:02.900]जय कपीस तिहुँ लोक उजागर
[00:05.800]राम दूत अतुलित बल धामा
```

Verse numbers are inferred (each non-empty line = one verse).

#### Flat JSON (.json)

```json
[
  { "verse_num": 1, "start_ms":    0, "end_ms": 5800, "text": "जय हनुमान…" },
  { "verse_num": 2, "start_ms": 5800, "end_ms":11400, "text": "राम दूत…" }
]
```

Both legacy formats are **upgraded automatically** into the nested format
(each verse gets a single line equal to `text`). For full karaoke fidelity,
use the strict nested format above.

---

## 6. Recommended authoring workflow

1. **Verses tab** — type or paste each verse in `sanskrit_text` and (optional)
   `transliteration`. Add at least one Hindi `meaning` per verse using the
   language chips shown when editing a verse.
2. **Audio tab** — upload the primary MP3. If you already have a sync map
   file, upload it now — the system will auto-parse it and you can stop
   here.
3. **Audio Sync tab** — open the JSON editor. The skeleton is pre-filled
   from your verses + audio metadata. For each verse:
   - Play the MP3 (the live player above the JSON shows the timestamp).
   - Type the verse's `start_ms` and `end_ms`.
   - Split the verse into `lines[]` if you want per-line karaoke (*highly
     recommended for chalisas — 2 lines per chaupai, 1 line per doha*).
4. **Publish tab** — fix any red ✗ (title / supported_languages / verses)
   then click **Publish Item**. Sync map is *optional* for publish (mobile
   plays without highlighting if absent).

---

## 7. How it renders on mobile

```
┌─────────────────────────────────────────┐
│ हनुमान चालीसा                            │  ← title from Content tab
│ Hanuman • 40 verses                     │
├─────────────────────────────────────────┤
│ [ डिफ़ॉल्ट ] [ Male ] [ Female ]          │  ← variant chip bar (Expert)
│  ▷ ─────────────  1:45 / 4:06          │  ← native audio player
├─────────────────────────────────────────┤
│ ┌─ #1 ──────────────────────────────┐   │  ← active verse: orange border
│ │ ✦ जय हनुमान ज्ञान गुण सागर ।         │   │  ← active line: amber bg + bold
│ │   जय कपीस तिहुँ लोक उजागर ॥           │   │
│ └─────────────────────────────────────┘   │
│                                         │
│   #2  राम दूत अतुलित बल धामा ।          │  ← inactive verse (muted)
│       अंजनि पुत्र पवनसुत नामा ॥           │
│                                         │
└─────────────────────────────────────────┘
```

**Highlighting algorithm** (in `expo-app/src/screens/v2/ContentDetailScreen.js`):

```
on every audio progress update (~5 Hz):
   pos = current playback position in ms
   activeVerse = first verse where pos ∈ [start_ms, end_ms)
   activeLine  = first line   where pos ∈ [start_ms, end_ms) inside activeVerse
   re-render only if (activeVerse, activeLine) changed
```

If `lines[]` is missing for the active verse, mobile falls back to highlighting
the whole verse block.

---

## 8. Beginner Mode (TTS, no MP3 needed)

A toggle on the mobile player switches into **Beginner Mode**. Instead of
playing the MP3, mobile speaks each verse with Google TTS in this loop:

```
for each verse:
    [Guru voice — speak verse]      ← 1× pronunciation
    pause 1.2s
    [Student voice — repeat]        ← 2× practice
    pause 0.9s
    [Student voice — repeat again]
    pause 0.9s
```

This mirrors a classroom setting and is most useful for new learners. The
**Learner Mode** preview tab inside the editor (Beginner mode only,
non-Aarti) lets you QA pronunciation before publishing.

---

## 9. Upload API reference (for power users / scripts)

All endpoints require a `Bearer` admin token from `POST /api/auth/admin/login`.

### Upload primary audio + (optional) sync file

```bash
curl -X POST  "$API/api/content/items/{ITEM_ID}/audio" \
     -H "Authorization: Bearer $TOKEN" \
     -F "audio=@chalisa.mp3" \
     -F "sync_file=@chalisa.json" \
     -F "duration_ms=246000"
```

### Upload an Expert variant

```bash
curl -X POST  "$API/api/content/items/{ITEM_ID}/audio" \
     -H "Authorization: Bearer $TOKEN" \
     -F "audio=@chalisa-female.mp3" \
     -F "variant_slot=2" \
     -F "variant_label=Female" \
     -F "duration_ms=246000"
```

### Update only the sync map (strict nested format)

```bash
curl -X POST  "$API/api/content/items/{ITEM_ID}/audio/sync" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d @chalisa-sync.json
```

### Read what mobile sees

```bash
curl -s "$API/api/content/items/{ITEM_ID}/audio"
```

Returns:

```json
{
  "audio_url": "/api/audio-static/items/.../chalisa.mp3",
  "format": "mp3",
  "duration_ms": 246000,
  "sync_map": [ {"verse_num":1,"start_ms":0,"end_ms":5800,"text":"…","lines":[…]} , … ],
  "variants": [ {"slot":2,"label":"Female","url":"…","duration_ms":246000}, … ]
}
```

---

## 10. Common pitfalls

| Symptom                                          | Cause                                                           | Fix                                                                                                              |
|--------------------------------------------------|-----------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| Verses don't highlight on mobile                 | sync_map is empty                                               | Upload a sync file or fill the Audio Sync tab JSON                                                               |
| Whole verse highlights but lines don't           | `lines[]` array is missing or empty                             | Split each verse into `lines[]` with line-level start/end                                                        |
| Highlight lags ~300ms behind                     | `start_ms` values were estimated by ear                         | Use the editor's live preview player to scrub & timestamp; verify on mobile                                      |
| Variant chip switches but audio re-starts        | Variant uses a different recording tempo than primary           | Either re-record at the primary's tempo OR ask the team to enable per-variant sync maps                          |
| Publish button stays disabled                    | A required check is red                                         | Add at least 1 verse + 1 supported language + a title                                                            |
| Mobile shows "(पूर्ण पाठ admin database से जल्द ही)" | The legacy `text_hi` field is empty                             | Open the Full Text tab and paste the entire item; save. (Auto-mirrors to `text_hi` for back-compat.)             |
| Sync upload fails with "Invalid JSON"            | `start_ms` was a string instead of integer, or trailing comma   | Use a JSON linter; ensure every `start_ms`/`end_ms` is an integer like `5800` (no quotes)                        |

---

## 11. Sample asset bundle for testing

A complete tiny example (≈ 6 seconds long, 2 verses, 4 lines):

`/app/backend/static/audio/items/SAMPLE.mp3` *(record one yourself)*

`SAMPLE-sync.json`:

```json
{
  "audio_file": "/api/audio-static/items/SAMPLE.mp3",
  "duration_ms": 6000,
  "verses": [
    {
      "verse_id": 1, "start_ms": 0, "end_ms": 3000,
      "lines": [
        { "text": "Line one of verse one",  "start_ms":    0, "end_ms": 1500 },
        { "text": "Line two of verse one",  "start_ms": 1500, "end_ms": 3000 }
      ]
    },
    {
      "verse_id": 2, "start_ms": 3000, "end_ms": 6000,
      "lines": [
        { "text": "Line one of verse two",  "start_ms": 3000, "end_ms": 4500 },
        { "text": "Line two of verse two",  "start_ms": 4500, "end_ms": 6000 }
      ]
    }
  ]
}
```

Upload via the Audio tab (Primary mode) with the JSON in the *Sync file* field
or via curl as shown in §9.

---

*Last updated: Feb 2026. For schema questions ping the engineering channel — the
canonical parser lives in `/app/backend/audio_sync_service.py`.*

---

## 12. Aarti Multilingual Workflow (Aarti-only, Session 18)

Aarti items get a **6-tab drawer** (`Content · Full Text · Audio · Video · Audio Sync · Publish`)
and a **shared Language bar** at the top. The bar lists every language in
`content_items.supported_languages`. Changing the active chip flips **Full Text,
Audio, Video, and Audio Sync** tabs to that language's bucket simultaneously
(Content + Publish stay global).

### Per-language buckets

Each language stores its own media under:

```
content_items.languages.{lang}:
  audio_versions: [ {slot: 1..4, label, url, format} ]    # 1-4 MP3s
  video:          { url, format }                         # MP4/WebM
  thumbnail:      { url, format }                         # JPG/PNG/WebP, file-only
  sync:           { sync_map: [...], duration_ms }        # strict nested format
  full_text:      "…"                                     # single-textarea authoring
```

### Storage paths

```
/aarti/{aarti_id}/{lang}/audio/v{slot}.{ext}
/aarti/{aarti_id}/{lang}/video/main.{ext}
/aarti/{aarti_id}/{lang}/thumbnail/main.{ext}
```

Served statically from `/api/aarti-static/...` — no signed-URL cache
expiry, no external CDN. Uploads replace existing files of the same slot
so disk usage is bounded.

### Publish validation for Aarti

Instead of "at least 1 verse" (which Aarti doesn't use), the checklist
requires **video OR thumbnail** for every supported language:

```
✓ Title (Hi/En/Sa)
✓ At least one supported language
✗ Each language has a video OR thumbnail   — missing: mr, gu    ← blocks publish
✓ Audio-text sync per language (optional)  — all synced         ← warning only
```

### API reference

```bash
# Audio (append or replace slot)
curl -X POST "$API/api/content/items/{ID}/lang/{LANG}/audio" \
     -H "Authorization: Bearer $TOKEN" \
     -F "audio=@hi_normal.mp3" -F "label=Normal" [-F "slot=2"]

# Video (replaces existing if any)
curl -X POST "$API/api/content/items/{ID}/lang/{LANG}/video" \
     -H "Authorization: Bearer $TOKEN" -F "video=@hi.mp4"

# Thumbnail (file upload only — external URLs are rejected by design)
curl -X POST "$API/api/content/items/{ID}/lang/{LANG}/thumbnail" \
     -H "Authorization: Bearer $TOKEN" -F "thumbnail=@hi_cover.jpg"

# Sync (strict nested JSON — overlaps rejected with 400)
curl -X POST "$API/api/content/items/{ID}/lang/{LANG}/sync" \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d @hi-sync.json

# Public bundle (mobile reads this one endpoint to render the aarti)
curl    "$API/api/content/items/{ID}/lang/{LANG}/media"
# → {lang, audio_versions:[…], video, thumbnail, sync, full_text}

# Mobile user preferred language (persists across sessions)
curl -X PUT "$API/api/auth/mobile/settings" \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"preferred_language":"hi"}'
```

### Fallback resolution on mobile

When the mobile app opens an aarti, it resolves media in this order:

```
1. user.preferred_language  (from User Settings)
2. 'hi'                     (Hindi, the default canonical bhasha)
3. first lang with media    (whichever language has any bucket populated)
```

If none are available the player falls back to the item's `thumbnail_url`
and disables audio controls.

### Non-Aarti categories are unaffected

Chalisa, Namavali, Sahasranama, Vedic Mantras, Stotrams, Suktams, Ashtakam,
Shatkam, Kavacham, and Nam Ramayanam keep the original **5-tab drawer** with
Verses, the primary audio upload, and the global Audio Sync. No Video tab, no
language bar for those categories.

