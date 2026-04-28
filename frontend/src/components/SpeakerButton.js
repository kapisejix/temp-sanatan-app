import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Volume2, Pause, Loader2, AlertCircle } from 'lucide-react';

/**
 * SpeakerButton — fetches audio from /api/tts/synthesize and plays.
 * Auto-detects Hindi/English from text content (Devanagari → hi).
 */
function detectLang(text = '') {
  return /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
}

export default function SpeakerButton({ text, language, size = 14, label = '' }) {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState('');
  const audioRef = useRef(null);

  const handleClick = async () => {
    setErr('');
    if (!text || !text.trim()) return;
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play();
      setPlaying(true);
      return;
    }
    setLoading(true);
    try {
      const lang = language || detectLang(text);
      const { data } = await api.post('/tts/synthesize', { text: text.slice(0, 4000), language: lang });
      const audio = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.play();
      setPlaying(true);
    } catch (e) {
      setErr('TTS नहीं — Integration Hub में Google Cloud TTS कॉन्फ़िगर करें');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={handleClick}
        disabled={loading || !text}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#E95A34] hover:text-[#D04E2C] disabled:opacity-50"
        title={err || (playing ? 'Pause' : 'Play')}
        data-testid="speaker-btn"
      >
        {loading ? <Loader2 size={size} className="animate-spin" /> : (playing ? <Pause size={size} /> : <Volume2 size={size} />)}
        {label && <span>{label}</span>}
      </button>
      {err && (
        <span className="text-[10px] text-red-600 mt-0.5 flex items-center gap-0.5">
          <AlertCircle size={9} /> {err}
        </span>
      )}
    </div>
  );
}
