"""
Switchable TTS Service — Google Cloud (primary), OpenAI, ElevenLabs.
Provider is selected via integration_settings (key: tts_provider).
Returns MP3 audio as bytes.
"""
import os
import json
import base64
import logging
from typing import Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


# Multilingual voice mapping for Indian languages
GOOGLE_VOICE_MAP = {
    "hi": {"language_code": "hi-IN", "name": "hi-IN-Wavenet-A"},     # Hindi
    "en": {"language_code": "en-IN", "name": "en-IN-Wavenet-A"},     # English (India)
    "sa": {"language_code": "hi-IN", "name": "hi-IN-Wavenet-B"},     # Sanskrit → fallback Hindi voice
    "ta": {"language_code": "ta-IN", "name": "ta-IN-Wavenet-A"},     # Tamil
    "te": {"language_code": "te-IN", "name": "te-IN-Standard-A"},    # Telugu
    "bn": {"language_code": "bn-IN", "name": "bn-IN-Wavenet-A"},     # Bengali
    "mr": {"language_code": "mr-IN", "name": "mr-IN-Wavenet-A"},     # Marathi
    "gu": {"language_code": "gu-IN", "name": "gu-IN-Wavenet-A"},     # Gujarati
    "kn": {"language_code": "kn-IN", "name": "kn-IN-Wavenet-A"},     # Kannada
    "ml": {"language_code": "ml-IN", "name": "ml-IN-Wavenet-A"},     # Malayalam
    "pa": {"language_code": "pa-IN", "name": "pa-IN-Wavenet-A"},     # Punjabi
    "od": {"language_code": "or-IN", "name": "or-IN-Standard-A"},    # Odia
}

OPENAI_VOICE_MAP = {
    "hi": "echo", "en": "alloy", "sa": "echo", "ta": "echo",
    "te": "echo", "bn": "echo", "mr": "echo", "gu": "echo",
    "kn": "echo", "ml": "echo", "pa": "echo", "od": "echo",
}


# ===================== BASE PROVIDER =====================

class TTSProvider(ABC):
    @abstractmethod
    def synthesize(self, text: str, language: str = "hi", voice: Optional[str] = None) -> bytes:
        """Return MP3 bytes."""
        pass


# ===================== GOOGLE CLOUD TTS =====================

class GoogleCloudTTSProvider(TTSProvider):
    def __init__(self, credentials_json: Optional[str] = None, api_key: Optional[str] = None):
        from google.cloud import texttospeech
        from google.oauth2 import service_account

        self.texttospeech = texttospeech

        if credentials_json:
            try:
                creds_info = json.loads(credentials_json)
                creds = service_account.Credentials.from_service_account_info(creds_info)
                self.client = texttospeech.TextToSpeechClient(credentials=creds)
            except Exception as e:
                logger.error(f"Failed to parse Google credentials JSON: {e}")
                raise ValueError(f"Invalid Google service account JSON: {e}")
        elif api_key:
            from google.api_core.client_options import ClientOptions
            self.client = texttospeech.TextToSpeechClient(client_options=ClientOptions(api_key=api_key))
        elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            self.client = texttospeech.TextToSpeechClient()
        else:
            raise ValueError("Google Cloud TTS requires either service account JSON or API key.")

    def synthesize(self, text: str, language: str = "hi", voice: Optional[str] = None) -> bytes:
        cfg = GOOGLE_VOICE_MAP.get(language, GOOGLE_VOICE_MAP["hi"])
        voice_name = voice or cfg["name"]

        synthesis_input = self.texttospeech.SynthesisInput(text=text)
        voice_params = self.texttospeech.VoiceSelectionParams(
            language_code=cfg["language_code"],
            name=voice_name,
        )
        audio_config = self.texttospeech.AudioConfig(
            audio_encoding=self.texttospeech.AudioEncoding.MP3,
            speaking_rate=0.95,
            pitch=0.0,
        )
        response = self.client.synthesize_speech(
            input=synthesis_input, voice=voice_params, audio_config=audio_config
        )
        return response.audio_content


# ===================== OPENAI TTS =====================

class OpenAITTSProvider(TTSProvider):
    def __init__(self, api_key: str, model: str = "tts-1"):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def synthesize(self, text: str, language: str = "hi", voice: Optional[str] = None) -> bytes:
        v = voice or OPENAI_VOICE_MAP.get(language, "alloy")
        response = self.client.audio.speech.create(
            model=self.model, voice=v, input=text, response_format="mp3"
        )
        return response.content


# ===================== ELEVENLABS TTS =====================

class ElevenLabsTTSProvider(TTSProvider):
    def __init__(self, api_key: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM"):
        import requests
        self.requests = requests
        self.api_key = api_key
        self.voice_id = voice_id

    def synthesize(self, text: str, language: str = "hi", voice: Optional[str] = None) -> bytes:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice or self.voice_id}"
        headers = {"xi-api-key": self.api_key, "Content-Type": "application/json"}
        data = {"text": text, "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}
        r = self.requests.post(url, json=data, headers=headers, timeout=30)
        r.raise_for_status()
        return r.content


# ===================== FACTORY =====================

async def get_tts_provider(get_setting_fn):
    """
    Get TTS provider based on integration_settings.
    get_setting_fn: async function (key, default) -> str
    """
    provider_name = (await get_setting_fn("tts_provider", "google")).lower()

    if provider_name == "google":
        creds_json = await get_setting_fn("google_cloud_credentials_json", "")
        api_key = await get_setting_fn("google_cloud_api_key", "")
        if not creds_json and not api_key:
            raise ValueError("Google Cloud TTS not configured. Set google_cloud_credentials_json or google_cloud_api_key in Integration Hub.")
        return GoogleCloudTTSProvider(credentials_json=creds_json or None, api_key=api_key or None)

    if provider_name == "openai":
        api_key = await get_setting_fn("openai_api_key", "") or os.environ.get("EMERGENT_LLM_KEY", "")
        if not api_key:
            raise ValueError("OpenAI TTS not configured. Set openai_api_key in Integration Hub.")
        model = await get_setting_fn("tts_default_model", "tts-1")
        return OpenAITTSProvider(api_key=api_key, model=model)

    if provider_name == "elevenlabs":
        api_key = await get_setting_fn("elevenlabs_api_key", "")
        if not api_key:
            raise ValueError("ElevenLabs TTS not configured. Set elevenlabs_api_key in Integration Hub.")
        voice_id = await get_setting_fn("elevenlabs_voice_id", "21m00Tcm4TlvDq8ikWAM")
        return ElevenLabsTTSProvider(api_key=api_key, voice_id=voice_id)

    raise ValueError(f"Unknown TTS provider: {provider_name}")


def encode_mp3_base64(audio_bytes: bytes) -> str:
    return base64.b64encode(audio_bytes).decode("utf-8")
