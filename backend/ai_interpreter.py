"""
AI Hybrid Interpretation Layer — Claude (via native Anthropic SDK).
Strict prompt: ONLY explains structured rule output. Hindi primary. 2-4 lines. No hallucination.
"""
import os
import logging
import json

logger = logging.getLogger(__name__)


SYSTEM_PROMPT_HI = """आप एक वैदिक ज्योतिष व्याख्याकार हैं। आपका कार्य केवल structured rule output को व्याख्या करना है।

कठोर नियम:
1. केवल दिए गए structured data को सरल हिंदी में 2-4 lines में समझाएँ
2. कोई नई जानकारी, भविष्यवाणी, या काल्पनिक कथन न जोड़ें
3. यदि data में कुछ नहीं है तो उसका उल्लेख न करें
4. tone: सहायक, संक्षिप्त, और सकारात्मक उपायपरक
5. विशिष्ट ग्रह/राशि/नक्षत्र नाम केवल data में दिए होने पर ही उपयोग करें
6. तकनीकी शब्दावली से बचें — आम भक्त के लिए सरल भाषा

आउटपुट: केवल 2-4 lines हिंदी में, कोई heading नहीं, कोई bullet नहीं।"""


SYSTEM_PROMPT_EN = """You are a Vedic astrology interpreter. Your job is ONLY to explain structured rule output.

Strict rules:
1. Translate the given structured data into 2-4 plain lines (English)
2. Add NO new facts, predictions, or speculation
3. Skip data points absent from input
4. Tone: helpful, concise, remedy-oriented
5. Mention planet/sign names only when present in data
6. No headings, no bullets, no jargon — just 2-4 lines."""


async def interpret_with_ai(
    structured_data: dict,
    language: str = "hi",
    domain: str = "general",
    api_key: str = "",
) -> str:
    """
    Convert structured rule output → natural 2-4 line interpretation.
    domain: "dasha" | "dosha" | "graha" | "general"
    """
    _key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
    if not _key:
        return ""

    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=_key)
        system = SYSTEM_PROMPT_HI if language == "hi" else SYSTEM_PROMPT_EN

        data_str = json.dumps(structured_data, ensure_ascii=False, indent=None)
        if len(data_str) > 3000:
            data_str = data_str[:3000] + "..."

        prompt_hi = f"निम्नलिखित structured rule output को 2-4 lines में सरल हिंदी में समझाएँ:\n\n{data_str}"
        prompt_en = f"Explain this structured rule output in 2-4 lines of plain English:\n\n{data_str}"
        prompt = prompt_hi if language == "hi" else prompt_en

        res = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            system=system,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        text = (res.content[0].text or "").strip()
        if len(text) > 800:
            text = text[:800].rsplit(".", 1)[0] + "।"
        return text
    except Exception as e:
        logger.warning(f"AI interpretation skipped: {e}")
        return ""


async def interpret_dasha(
    dasha_interpretation: dict,
    current_dasha: dict,
    language: str = "hi",
    api_key: str = "",
) -> str:
    """Generate AI insight for Dasha (3 short insights)."""
    payload = {
        "current_period": {
            "mahadasha": current_dasha["mahadasha"]["planet"],
            "antardasha": current_dasha.get("antardasha", {}).get("planet"),
        },
        "overall_severity": dasha_interpretation["overall_severity"],
        "domain_impacts": {k: v["severity"] for k, v in dasha_interpretation["domain_impacts"].items()},
        "themes": dasha_interpretation["themes_hi" if language == "hi" else "themes_en"],
    }
    return await interpret_with_ai(payload, language=language, domain="dasha", api_key=api_key)


async def interpret_dosha(
    dosha: dict,
    dosha_type: str,
    language: str = "hi",
    api_key: str = "",
) -> str:
    """Generate AI explanation for a single dosha."""
    payload = {
        "dosha_type": dosha_type,
        "present": dosha.get("present"),
        "severity": dosha.get("severity"),
        "rule_explanation": dosha.get("explanation_hi" if language == "hi" else "explanation_en"),
    }
    return await interpret_with_ai(payload, language=language, domain="dosha", api_key=api_key)
