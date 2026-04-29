"""
Gemini-powered translation service for Sanatan Saathi multilingual content.

Uses emergentintegrations.LlmChat with EMERGENT_LLM_KEY (universal key).
Default model: gemini-2.5-flash (fast, cost-effective for translation).

Returns structured JSON translations. AI output is always treated as DRAFT —
publishing is a separate, explicit admin action.
"""
import json
import logging
import os
import re
import uuid
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Language code -> human-readable name (sent to Gemini for clarity)
LANGUAGE_NAMES = {
    "sa": "Sanskrit (Devanagari script)",
    "hi": "Hindi (Devanagari script)",
    "en": "English",
    "mr": "Marathi (Devanagari script)",
    "gu": "Gujarati (Gujarati script)",
    "ta": "Tamil (Tamil script)",
    "te": "Telugu (Telugu script)",
    "bn": "Bengali (Bengali script)",
    "kn": "Kannada (Kannada script)",
    "ml": "Malayalam (Malayalam script)",
    "pa": "Punjabi (Gurmukhi script)",
    "od": "Odia (Odia script)",
}

DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_PROVIDER = "gemini"


def _get_api_key() -> str:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY is not configured in backend/.env")
    return key


def _strip_code_fences(text: str) -> str:
    """Gemini occasionally wraps JSON in ```json ... ``` fences."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _build_chat(session_id: str, system_message: str, model: str = DEFAULT_MODEL):
    """Lazy import so server boot doesn't fail if package missing in dev."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=_get_api_key(),
        session_id=session_id,
        system_message=system_message,
    ).with_model(DEFAULT_PROVIDER, model)
    return chat, UserMessage


SYSTEM_PROMPT = """You are an expert translator specializing in Hindu spiritual and devotional texts.
You translate Sanskrit, Hindi, and English content (verses, mantras, chalisas, aartis, kathas, meanings)
into other Indian languages while preserving:
- Sacred names of deities (Hanuman, Shri Ram, Krishna, Shiva, Devi, etc.) in their proper local form
- The poetic and devotional tone of the original
- Religious and cultural nuance (do NOT modernize or simplify the meaning)
- Proper script for each target language (Devanagari, Gujarati, Tamil, Telugu, Bengali, etc.)

You ALWAYS respond with strict JSON only — no markdown, no explanations, no prefixes.
The JSON keys must be the exact ISO language codes given to you in the request.
"""


async def translate_text(
    source_text: str,
    source_language: str,
    target_languages: List[str],
    model: str = DEFAULT_MODEL,
    context_label: Optional[str] = None,
) -> Dict[str, str]:
    """Translate a single text into multiple target languages.

    Returns: { lang_code: translated_text }
    Empty/whitespace input returns an empty dict.
    """
    if not source_text or not source_text.strip():
        return {}

    target_languages = [c for c in target_languages if c in LANGUAGE_NAMES and c != source_language]
    if not target_languages:
        return {}

    targets_str = ", ".join(f'"{c}" ({LANGUAGE_NAMES[c]})' for c in target_languages)
    src_name = LANGUAGE_NAMES.get(source_language, source_language)

    label_line = f'\nField context: {context_label}' if context_label else ""
    prompt = (
        f"Translate the following {src_name} text into these languages: {targets_str}.{label_line}\n\n"
        f"Source ({source_language}):\n\"\"\"\n{source_text}\n\"\"\"\n\n"
        f"Respond with strict JSON only, where keys are the exact target language codes "
        f"({', '.join(target_languages)}) and values are the translated strings. "
        f"No code fences, no extra commentary."
    )

    session_id = f"translate-{uuid.uuid4().hex[:12]}"
    chat, UserMessage = _build_chat(session_id, SYSTEM_PROMPT, model)
    raw = await chat.send_message(UserMessage(text=prompt))
    cleaned = _strip_code_fences(raw)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find first JSON object in response
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if not m:
            logger.error(f"Gemini returned non-JSON: {cleaned[:300]}")
            raise RuntimeError("Gemini did not return valid JSON")
        data = json.loads(m.group(0))

    # Ensure all values are strings
    return {k: (v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
            for k, v in data.items() if k in target_languages}


async def translate_verse(
    *,
    source_language: str,
    target_languages: List[str],
    text: Optional[str] = None,
    transliteration: Optional[str] = None,
    meaning: Optional[str] = None,
    model: str = DEFAULT_MODEL,
) -> Dict[str, Dict[str, str]]:
    """Translate a verse's text/transliteration/meaning together for context coherence.

    Returns:
      {
        "<lang_code>": { "text": "...", "transliteration": "...", "meaning": "..." },
        ...
      }
    Only populates fields that were provided as input.
    """
    target_languages = [c for c in target_languages if c in LANGUAGE_NAMES and c != source_language]
    if not target_languages:
        return {}

    fields = {}
    if text and text.strip():
        fields["text"] = text.strip()
    if transliteration and transliteration.strip():
        fields["transliteration"] = transliteration.strip()
    if meaning and meaning.strip():
        fields["meaning"] = meaning.strip()
    if not fields:
        return {}

    targets_str = ", ".join(f'"{c}" ({LANGUAGE_NAMES[c]})' for c in target_languages)
    src_name = LANGUAGE_NAMES.get(source_language, source_language)

    field_descriptions = {
        "text": "the verse/mantra text itself (translate naturally; if source is Sanskrit and target is another Indian language, you may transliterate to that script while preserving sacred terms)",
        "transliteration": "the romanized/Latin-script pronunciation guide (output in Latin script for ALL languages)",
        "meaning": "the prose explanation/meaning of the verse",
    }
    field_lines = "\n".join(f"  - \"{k}\": {field_descriptions[k]}" for k in fields)

    source_block = "\n".join(f'  "{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in fields.items())

    prompt = (
        f"You are translating a Hindu devotional verse from {src_name} into: {targets_str}.\n\n"
        f"Source ({source_language}):\n{{\n{source_block}\n}}\n\n"
        f"Translate each provided field:\n{field_lines}\n\n"
        f"Special rule: the \"transliteration\" field MUST always be in Latin/Roman script "
        f"regardless of the target language (it is a pronunciation guide).\n\n"
        f"Respond with strict JSON only, in this exact shape:\n"
        f"{{\n"
        + ",\n".join(
            f'  "{c}": {{ '
            + ", ".join(f'"{f}": "..."' for f in fields)
            + " }"
            for c in target_languages
        )
        + "\n}\n"
        f"No markdown, no code fences, no commentary."
    )

    session_id = f"translate-verse-{uuid.uuid4().hex[:12]}"
    chat, UserMessage = _build_chat(session_id, SYSTEM_PROMPT, model)
    raw = await chat.send_message(UserMessage(text=prompt))
    cleaned = _strip_code_fences(raw)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if not m:
            logger.error(f"Gemini returned non-JSON for verse: {cleaned[:300]}")
            raise RuntimeError("Gemini did not return valid JSON")
        data = json.loads(m.group(0))

    out: Dict[str, Dict[str, str]] = {}
    for code in target_languages:
        bucket = data.get(code) or {}
        if not isinstance(bucket, dict):
            continue
        out[code] = {f: (bucket.get(f) or "") for f in fields}
    return out
