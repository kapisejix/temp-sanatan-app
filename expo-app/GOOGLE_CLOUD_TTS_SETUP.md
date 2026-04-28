# Google Cloud Text-to-Speech — Setup Guide

To enable **mantra audio playback** in the Sanatan Saathi app (web + mobile), you need to provide Google Cloud TTS credentials. The app supports switchable providers (Google / OpenAI / ElevenLabs) — Google is recommended for accurate Hindi/Sanskrit pronunciation.

---

## 🎯 What this enables

- ▶ **Play button** on every mantra plays real audio
- 🤖 **VedaChat "उत्तर सुनें"** speaks AI responses in Hindi
- 📱 **Mobile app** plays mantras through Expo AV
- 🌐 **12 languages**: Hindi, English, Sanskrit, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia

---

## 🔑 Step 1 — Create Google Cloud project

1. Go to https://console.cloud.google.com/
2. Click **Select a project** → **New Project**
3. Name: `sanatan-saathi-tts` (or anything)
4. Click **Create**

---

## 🔌 Step 2 — Enable Text-to-Speech API

1. In the left menu, search for **APIs & Services → Library**
2. Search for **Cloud Text-to-Speech API**
3. Click it → **Enable**

---

## 💳 Step 3 — Set up billing (required, but mostly free)

Google gives **1 million characters/month free** for standard voices and **4 million for WaveNet** voices — more than enough for personal use.

1. Console → **Billing** → **Link a billing account** → set up a free trial ($300 credit) or add your card
2. **No charges** unless you exceed the free tier (which you won't for normal app use)

---

## 🔐 Step 4 — Get credentials (Service Account JSON — recommended)

1. Console → **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Name: `tts-service` → **Create and Continue**
4. Role: select **Cloud Text-to-Speech API User**
5. Click **Done**
6. Find your new service account in the list → click on it
7. Go to **Keys** tab → **Add Key → Create new key → JSON → Create**
8. A JSON file downloads — open it in any text editor

The JSON looks like this:

```json
{
  "type": "service_account",
  "project_id": "sanatan-saathi-tts",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "tts-service@sanatan-saathi-tts.iam.gserviceaccount.com",
  ...
}
```

---

## 🚀 Step 5 — Paste into Sanatan Saathi

1. Login to admin panel: https://YOUR-APP-URL/login
   - Email: `admin@sanatansaathi.com`
   - Password: `SanatanAdmin@2026`
2. In the sidebar, open **Integration Hub**
3. Find the **Text-to-Speech** card
4. Configure:
   - **TTS Provider**: `google`
   - **Google Cloud Service Account JSON**: paste the **entire JSON content** (yes, the whole file as a single string)
   - Other fields can stay empty
5. Click **Save**

That's it ✅

---

## ✅ Step 6 — Verify

1. Go to **Dashboard** → आज का उपाय → click ▶ Play button
2. You should hear the mantra spoken in Hindi

If you hear audio: 🎉 done.

If you see "TTS कॉन्फ़िगर नहीं":
- Re-check JSON — must be the **full file content** including `{` and `}`
- Make sure **Cloud Text-to-Speech API** is enabled in Google Console
- Make sure **billing** is set up (free tier requires it)
- Open browser DevTools (F12) → Network → click Play → look at `/api/tts/synthesize` response for the actual error

---

## 💡 Alternative — API Key (simpler but less secure)

If service account is too complex:

1. Console → **APIs & Services → Credentials → Create Credentials → API key**
2. Copy the API key
3. In Integration Hub → paste into **Google Cloud API Key (alt)** field
4. Save

⚠️ API keys are easier to leak — restrict the key to your IP / app referrer in Google Console.

---

## 🔄 Switching to OpenAI TTS or ElevenLabs

In **Integration Hub → Text-to-Speech**:

| Provider | What to provide |
|----------|-----------------|
| `openai` | (uses Emergent LLM Key automatically — no setup needed) |
| `elevenlabs` | `elevenlabs_api_key` from https://elevenlabs.io/, optional `elevenlabs_voice_id` |

Just change the **TTS Provider** dropdown and save. Code stays unchanged.

---

## 💰 Cost estimate (Google)

| Voice tier | Free / month | $ per million chars (after) |
|------------|--------------|------------------------------|
| Standard   | 4M chars     | $4 |
| WaveNet    | 1M chars     | $16 |
| Neural2    | 1M chars     | $16 |

**Practical estimate**: an average user listening to ~50 mantras/day = ~50,000 chars/month → **~1.5% of free tier**. You'll never pay anything for personal use.

---

## 🛡️ Security best practices

- ✅ Service account is restricted to **TTS API only** (not full project access)
- ✅ JSON is stored encrypted in MongoDB (`integration_settings` collection)
- ✅ Audio is cached by content hash (`tts_cache` collection) — repeat plays are free
- ❌ Never commit the JSON to git
- ❌ Never share the JSON publicly
- 🔄 Rotate the key every 6 months: Console → IAM → Service Accounts → Keys → Add new → delete old

---

## 📞 Need help?

- Google official docs: https://cloud.google.com/text-to-speech/docs/quickstart-protocol
- Test API directly: `curl https://texttospeech.googleapis.com/v1/voices?key=YOUR_KEY`
- App logs: in Emergent platform → check backend logs
