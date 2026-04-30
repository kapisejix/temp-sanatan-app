# EMERGENT_DEPENDENCIES.md — How to run off-platform

The project was built on the **Emergent.sh** development platform. To run it on your own infrastructure (laptop, Render, Fly.io, AWS, GCP, …) you need to remove or replace **two and only two** Emergent-specific things:

1. The Python package **`emergentintegrations`** (LLM/TTS universal-key wrapper).
2. The **`EMERGENT_LLM_KEY`** environment variable.

Everything else (FastAPI, MongoDB, React, Expo, Tailwind, shadcn/ui) is fully open-source and portable.

---

## 1. Where the dependency lives

### Python imports
| File | Lines | What it does |
|---|---|---|
| `backend/server.py` | many (`grep "emergentintegrations"`) | LLM chat, OpenAI TTS calls |
| `backend/translation_service.py` | line 57 | Gemini-based verse translation |
| `backend/ai_interpreter.py` | line 14 | Dasha / dosha narrative generation |

### Environment variables
- `EMERGENT_LLM_KEY` in `backend/.env` — single key that works for **OpenAI text + image**, **Anthropic Claude (text only)**, **Gemini text + Nano-Banana**, **Sora 2**, **Whisper**.

### `requirements.txt`
```
emergentintegrations==0.1.0
```
This wheel is **not on public PyPI**. It is hosted at `https://d33sy5i8bnduwe.cloudfront.net/simple/`. You can install it with:
```bash
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```
…but if your team does not want a vendor lock-in, follow the replacement guide below.

---

## 2. What the wrapper does (so you can replace it)

### `LlmChat` — text chat (Gemini / Claude / GPT)

**Current code** (`translation_service.py`):
```python
from emergentintegrations.llm.chat import LlmChat, UserMessage

chat = LlmChat(
    api_key=os.environ["EMERGENT_LLM_KEY"],
    session_id="translate_…",
    system_message="You are a strict translator …",
).with_model("gemini", "gemini-2.5-flash")

reply = await chat.send_message(UserMessage(text=prompt))
```

**Drop-in replacement (Gemini)**:
```python
import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction="You are a strict translator …",
)
reply = (await model.generate_content_async(prompt)).text
```

**Drop-in replacement (OpenAI)**:
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
res = await client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a strict translator …"},
        {"role": "user",   "content": prompt},
    ],
)
reply = res.choices[0].message.content
```

**Drop-in replacement (Anthropic)**:
```python
from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
res = await client.messages.create(
    model="claude-sonnet-4-5",
    system="You are a strict translator …",
    max_tokens=2048,
    messages=[{"role": "user", "content": prompt}],
)
reply = res.content[0].text
```

### `OpenAITextToSpeech` — TTS

**Current code** (`server.py`):
```python
from emergentintegrations.llm.openai import OpenAITextToSpeech

tts = OpenAITextToSpeech(api_key=os.environ["EMERGENT_LLM_KEY"])
audio_bytes = await tts.synthesize(text=text, voice="alloy")
```

**Drop-in replacement**:
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
res = await client.audio.speech.create(model="tts-1", voice="alloy", input=text)
audio_bytes = await res.aread()
```

For **Google Cloud TTS** (already used in `tts_service.py`), no change needed — that path uses the official `google-cloud-texttospeech` SDK.

---

## 3. Step-by-step: cut the dependency

### Option A — keep the package (easiest)
Install from the Emergent index (works on any host):
```bash
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```
Set `EMERGENT_LLM_KEY` in `backend/.env`. Done. The key is a regular API key — it will keep working as long as Emergent keeps the proxy alive and your account has credit.

### Option B — true vendor-free
1. **Pick a provider per feature** (see table below).
2. **Install native SDKs**:
   ```bash
   pip install google-generativeai openai anthropic
   ```
3. **Add new env vars** to `backend/.env`:
   ```
   GEMINI_API_KEY=...
   OPENAI_API_KEY=...
   ANTHROPIC_API_KEY=...   # only if you use Claude
   ```
4. **Search-and-replace** the 11 import sites:
   ```bash
   grep -rn "emergentintegrations" backend/ | grep -v __pycache__
   ```
   Use the snippets in §2 above.
5. **Remove from `requirements.txt`**:
   ```bash
   sed -i.bak '/^emergentintegrations==/d' backend/requirements.txt
   ```
6. **Delete `EMERGENT_LLM_KEY`** from `.env` and `.env.example`.
7. Re-run pytest:
   ```bash
   cd backend && pytest -q
   ```

### Feature → provider matrix
| Feature | Recommended | Lives in |
|---|---|---|
| Verse translation (Hi/Sa → mr/gu/ta/te/bn/en) | **Gemini 2.5 Flash** | `translation_service.py` |
| VedaChat | **Gemini 2.5 Pro** or Claude Sonnet | `server.py` (`/vedachat/message`) |
| Dasha / Dosha narratives | Gemini 2.5 Flash | `ai_interpreter.py` |
| TTS (Beginner Mode) | **Google Cloud TTS** (already wired) | `tts_service.py` |
| TTS fallback / English voices | OpenAI TTS-1 | `server.py` |
| DOCX/PDF parse hints | Gemini 2.5 Flash | `docx_parser.py` (light use) |

---

## 4. Hardcoded URLs to update

Search the repo for `emergentagent.com`:

```bash
grep -rn "emergentagent.com" expo-app/src frontend/src 2>/dev/null
```

Currently:

| File | Line | Value |
|---|---|---|
| `expo-app/src/config/api.js` | 7 | `https://integrated-platform-13.preview.emergentagent.com/api` |
| `frontend/.env` | 1 | `https://integrated-platform-13.preview.emergentagent.com` |

Replace with your own backend URL (`http://localhost:8001` for dev, `https://api.yourdomain.com` for prod). Recommended: read from `.env` instead of hardcoding — see `expo-app/.env.example`.

---

## 5. Anything else "Emergent-specific"?

- **`/cdn-cgi/rum`** beacon errors in the browser console: these come from Cloudflare RUM injected by the **preview deployment** (`*.preview.emergentagent.com`). Once you host the backend yourself, these errors disappear automatically.
- **`emergent` in `package.json` /yarn lockfile**: nothing. Confirmed `grep -r emergent frontend/src expo-app/src` returns zero matches except the API URL above.
- **Supervisor config**: the project uses `supervisorctl` on Emergent but you can run with `uvicorn` + `pm2` / systemd / docker-compose with no code change. Backend listens on `0.0.0.0:8001`.

---

## 6. Quick sanity check after replacement

```bash
# 1. backend imports cleanly
cd backend && python -c "import server; print('ok')"

# 2. translation works
python -c "
import asyncio, os
from translation_service import translate_text
print(asyncio.run(translate_text('Hello', source='en', targets=['hi'])))"

# 3. TTS works (only if you replaced OpenAI TTS; Google TTS is unchanged)
curl -s -X POST http://localhost:8001/api/tts/synthesize \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"text":"नमस्ते","language":"hi"}' | head -c 200
```

If all three return non-error output, you're fully off Emergent.
