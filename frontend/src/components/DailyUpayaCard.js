import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Sparkles, Play, Pause, Loader2, ChevronRight, AlertCircle, Globe2 } from 'lucide-react';

const T = {
  hi: {
    title: 'आज का उपाय',
    subtitle: 'व्यक्तिगत मंत्र अनुशंसा',
    dayBased: 'दिन के अनुसार',
    personalised: 'आपकी कुंडली के अनुसार',
    count: 'जप',
    play: 'सुनें', pause: 'रोकें',
    setupHint: 'व्यक्तिगत उपाय पाने के लिए कुंडली बनाएं',
    setup: 'कुंडली बनाएं',
    seeAll: 'सभी देखें',
    audioErr: 'TTS कॉन्फ़िगर नहीं — Integration Hub देखें',
  },
  en: {
    title: "Today's Upaya",
    subtitle: 'Personalised mantra recommendation',
    dayBased: 'Based on weekday',
    personalised: 'Based on your Kundli',
    count: 'Chant',
    play: 'Play', pause: 'Pause',
    setupHint: 'Generate your Kundli for personalised remedy',
    setup: 'Generate Kundli',
    seeAll: 'View all',
    audioErr: 'TTS not configured — see Integration Hub',
  },
};

function PlayBtn({ text, language, label }) {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState('');
  const audioRef = useRef(null);

  const onClick = async () => {
    setErr('');
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
      const { data } = await api.post('/tts/synthesize', { text, language });
      const audio = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.play();
      setPlaying(true);
    } catch (e) {
      setErr(label.audioErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#FDDDD4] hover:bg-[#FEF0EC] text-[#E95A34] rounded-md text-xs font-medium disabled:opacity-50"
        data-testid="upaya-play-btn"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : (playing ? <Pause size={11} /> : <Play size={11} />)}
        {playing ? label.pause : label.play}
      </button>
      {err && <p className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1"><AlertCircle size={10} /> {err}</p>}
    </div>
  );
}

export default function DailyUpayaCard() {
  const { api } = useAuth();
  const [lang, setLang] = useState('hi');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/notifications/today');
        setData(res.data);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [api]);

  const t = T[lang];
  const items = data?.notifications || [];

  return (
    <div className="bg-gradient-to-br from-[#FEF0EC] via-white to-white rounded-xl border border-[#FDDDD4] p-6 animate-fade-in" data-testid="daily-upaya-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1 flex items-center gap-1.5">
            <Sparkles size={12} /> {t.subtitle}
          </p>
          <h3 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{t.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-[#E8E4E1] rounded-md px-1.5 py-0.5">
            <Globe2 size={10} className="text-[#7A8690]" />
            <button onClick={() => setLang('hi')} className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${lang==='hi' ? 'bg-[#FEF0EC] text-[#E95A34]' : 'text-[#7A8690]'}`} data-testid="upaya-lang-hi">हि</button>
            <button onClick={() => setLang('en')} className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${lang==='en' ? 'bg-[#FEF0EC] text-[#E95A34]' : 'text-[#7A8690]'}`} data-testid="upaya-lang-en">EN</button>
          </div>
          <Link to="/admin/graha-kundli" className="text-xs text-[#E95A34] hover:underline flex items-center gap-0.5" data-testid="upaya-view-all">
            {t.seeAll} <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-white rounded-lg animate-pulse" />
          <div className="h-40 bg-white rounded-lg animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((n, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-[#FDDDD4] p-4" data-testid={`upaya-card-${n.type}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#E95A34]">
                      {n.type === 'day_based' ? t.dayBased : t.personalised}
                    </p>
                    <p className="text-base font-bold mt-0.5" style={{ fontFamily: 'Manrope' }}>
                      {lang === 'hi' ? n.title_hi : n.title_en}
                    </p>
                  </div>
                  {n.score != null && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#FEE2E2] text-[#991B1B] rounded">
                      {Math.round(n.score)}
                    </span>
                  )}
                </div>
                <div className="bg-[#FEF8F5] rounded p-2 mb-2 border-l-2 border-[#E95A34]">
                  <p className="text-sm font-medium leading-relaxed" style={{ fontFamily: 'Tiro Devanagari Hindi, serif' }}>
                    {n.mantra}
                  </p>
                  {n.mantra_en && lang === 'en' && (
                    <p className="text-xs text-[#7A8690] italic mt-0.5">{n.mantra_en}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#7A8690]">
                    {t.count}: <span className="font-semibold text-[#374652]">{n.count}</span>
                    {n.devta_hi && lang === 'hi' && <span className="ml-2">· {n.devta_hi}</span>}
                  </p>
                  <PlayBtn text={n.mantra} language="hi" label={t} />
                </div>
              </div>
            ))}
          </div>
          {items.length < 2 && (
            <div className="mt-3 text-xs text-[#7A8690] flex items-center gap-2 bg-white/60 rounded-md px-3 py-2">
              <AlertCircle size={12} className="text-[#E95A34]" />
              <span>{t.setupHint}</span>
              <Link to="/admin/graha-kundli" className="ml-auto text-[#E95A34] font-medium hover:underline" data-testid="upaya-setup-link">
                {t.setup} <ChevronRight size={10} className="inline" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
