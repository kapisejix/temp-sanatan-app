import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Headphones, Play, Loader2, Volume2 } from 'lucide-react';

const VOICES = [
  { value: 'echo', label: 'Echo (Smooth, Calm)' },
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'onyx', label: 'Onyx (Deep, Authoritative)' },
  { value: 'nova', label: 'Nova (Energetic)' },
  { value: 'shimmer', label: 'Shimmer (Bright)' },
  { value: 'fable', label: 'Fable (Expressive)' },
  { value: 'sage', label: 'Sage (Wise, Measured)' },
  { value: 'coral', label: 'Coral (Warm)' },
  { value: 'ash', label: 'Ash (Clear)' },
];

export default function AudioManagerPage() {
  const { api } = useAuth();
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('echo');
  const [model, setModel] = useState('tts-1');
  const [generating, setGenerating] = useState(false);
  const [audioSrc, setAudioSrc] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [verses, setVerses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/content/items?limit=100');
        setItems(data.items || []);
      } catch (err) { console.error(err); }
    };
    fetch();
  }, [api]);

  const loadVerses = async (itemId) => {
    setSelectedItem(itemId);
    try {
      const { data } = await api.get(`/content/items/${itemId}/verses`);
      setVerses(data);
    } catch (err) { console.error(err); }
  };

  const generateTTS = async (verseText, verseId) => {
    setError('');
    setGenerating(true);
    setAudioSrc('');
    try {
      const { data } = await api.post('/media/generate-tts', {
        text: verseText || text,
        voice,
        model,
        verse_id: verseId,
      });
      if (data.audio_base64) {
        setAudioSrc(`data:audio/mp3;base64,${data.audio_base64}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'TTS generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="audio-manager-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Media</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Audio Manager</h1>
        <p className="text-sm text-[#7A8690] mt-1">Generate TTS audio for verses using OpenAI</p>
      </div>

      {/* TTS Generator */}
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Text-to-Speech Generator</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Content (Optional)</label>
              <select value={selectedItem || ''} onChange={(e) => e.target.value && loadVerses(e.target.value)} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]">
                <option value="">-- Select item to load verses --</option>
                {items.map(i => <option key={i._id} value={i._id}>{i.title_en} ({i.title_hi})</option>)}
              </select>
            </div>

            {verses.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {verses.map(v => (
                  <button key={v._id} onClick={() => setText(v.sanskrit_text)} className="w-full text-left p-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-xs hover:border-[#E95A34] transition-colors">
                    <span className="font-medium text-[#E95A34]">V{v.verse_num}:</span> {v.sanskrit_text?.substring(0, 60)}...
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Text to Convert</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Enter Sanskrit/Hindi text here..." className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="tts-text-input" />
              <p className="text-xs text-[#989EA4] mt-1">{text.length}/4096 characters</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Voice</label>
                <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="tts-voice-select">
                  {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]">
                  <option value="tts-1">TTS-1 (Standard)</option>
                  <option value="tts-1-hd">TTS-1-HD (High Quality)</option>
                </select>
              </div>
            </div>

            <button onClick={() => generateTTS(text)} disabled={generating || !text.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium transition-colors disabled:opacity-50" data-testid="generate-tts-btn">
              {generating ? (
                <><Loader2 size={18} className="animate-spin" /> Generating Audio...</>
              ) : (
                <><Volume2 size={18} /> Generate Audio</>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            {audioSrc && (
              <div className="p-4 bg-[#FEF0EC] border border-[#FDDDD4] rounded-xl" data-testid="tts-audio-player">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#E95A34] rounded-lg flex items-center justify-center">
                    <Headphones size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Audio Generated</p>
                    <p className="text-xs text-[#7A8690]">Voice: {voice} | Model: {model}</p>
                  </div>
                </div>
                <audio controls src={audioSrc} className="w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
