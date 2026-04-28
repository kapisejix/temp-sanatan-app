import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles, MapPin, Calendar, Clock, User, Loader2, Play, Pause,
  AlertCircle, TrendingUp, ChevronRight, Volume2, RefreshCw, Globe2
} from 'lucide-react';

const T = {
  hi: {
    pageTitle: 'ग्रह आधारित मंत्र अनुशंसा',
    subtitle: 'सटीक कुंडली गणना (Swiss Ephemeris) के आधार पर व्यक्तिगत मंत्र',
    name: 'नाम', gender: 'लिंग', male: 'पुरुष', female: 'स्त्री', other: 'अन्य',
    dob: 'जन्म तिथि', tob: 'जन्म समय', place: 'जन्म स्थान',
    placeholder_place: 'दिल्ली, भारत',
    generate: 'कुंडली बनाएं', regenerate: 'पुनः गणना करें',
    generating: 'गणना हो रही है...',
    ascendant: 'लग्न (Ascendant)',
    planetsTitle: 'ग्रह स्थिति',
    grahaScores: 'ग्रह स्कोर',
    recommendations: 'आज का उपाय',
    priority: { HIGH: 'उच्च', MEDIUM: 'मध्यम', LOW: 'सामान्य' },
    score: 'स्कोर', mantra: 'मंत्र', count: 'जप संख्या', day: 'अनुकूल दिन',
    color: 'रंग', remedy: 'उपाय', devta: 'देवता',
    reasons: 'कारण', play: 'मंत्र सुनें', pause: 'रोकें',
    rashi: 'राशि', house: 'भाव', degree: 'अंश', nakshatra: 'नक्षत्र',
    retrograde: 'वक्री', combust: 'अस्त',
    noRec: 'कोई विशेष उपाय आवश्यक नहीं — आपकी कुंडली शुभ है।',
    error: 'त्रुटि', langLabel: 'भाषा',
    fillAll: 'कृपया सभी फ़ील्ड भरें',
    audioErr: 'ऑडियो उत्पन्न नहीं हो सका। Integration Hub में Google Cloud TTS कॉन्फ़िगर करें।',
  },
  en: {
    pageTitle: 'Graha-based Mantra Recommendation',
    subtitle: 'Personalised mantras driven by accurate Kundli (Swiss Ephemeris)',
    name: 'Name', gender: 'Gender', male: 'Male', female: 'Female', other: 'Other',
    dob: 'Date of Birth', tob: 'Time of Birth', place: 'Birth Place',
    placeholder_place: 'Delhi, India',
    generate: 'Generate Kundli', regenerate: 'Recalculate',
    generating: 'Computing…',
    ascendant: 'Ascendant',
    planetsTitle: 'Planetary Positions',
    grahaScores: 'Graha Scores',
    recommendations: "Today's Upaya",
    priority: { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Normal' },
    score: 'Score', mantra: 'Mantra', count: 'Chant Count', day: 'Preferred Day',
    color: 'Colour', remedy: 'Remedy', devta: 'Deity',
    reasons: 'Reasons', play: 'Play Mantra', pause: 'Pause',
    rashi: 'Sign', house: 'House', degree: 'Degree', nakshatra: 'Nakshatra',
    retrograde: 'Retrograde', combust: 'Combust',
    noRec: 'No special remedy required — your Kundli is auspicious.',
    error: 'Error', langLabel: 'Language',
    fillAll: 'Please fill all fields',
    audioErr: 'Could not generate audio. Configure Google Cloud TTS in Integration Hub.',
  },
};

const PRIORITY_COLOURS = {
  HIGH: { bg: '#FEE2E2', text: '#991B1B', accent: '#DC2626' },
  MEDIUM: { bg: '#FEF3C7', text: '#92400E', accent: '#D97706' },
  LOW: { bg: '#DCFCE7', text: '#166534', accent: '#16A34A' },
};

function MantraAudioButton({ mantra, language, t }) {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  const handlePlay = async () => {
    setError('');
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
      const { data } = await api.post('/tts/synthesize', { text: mantra, language });
      const audio = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.play();
      setPlaying(true);
    } catch (e) {
      setError(t.audioErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handlePlay}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-2 bg-[#E95A34] hover:bg-[#D04E2C] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        data-testid="mantra-play-btn"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : (playing ? <Pause size={14} /> : <Play size={14} />)}
        {playing ? t.pause : t.play}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

export default function GrahaKundliPage() {
  const { api } = useAuth();
  const [lang, setLang] = useState('hi');
  const t = T[lang];

  const [form, setForm] = useState({ name: '', gender: 'Male', dob: '', tob: '', birth_place: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Auto-load saved kundli on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/kundli/my');
        if (data && data.planets) {
          setResult({
            ascendant: data.ascendant,
            planets: data.planets,
            graha_scores: data.graha_scores,
            recommendations: data.top_recommendations,
          });
          setForm({
            name: data.name || '',
            gender: data.gender || 'Male',
            dob: data.dob || '',
            tob: data.tob || '',
            birth_place: data.birth_place || '',
          });
        }
      } catch (e) { /* no kundli yet */ }
    })();
  }, [api]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.dob || !form.tob || !form.birth_place) {
      setError(t.fillAll);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/kundli/generate', form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="graha-kundli-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Astrology Engine</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{t.pageTitle}</h1>
          <p className="text-sm text-[#7A8690] mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E8E4E1] rounded-lg px-2 py-1">
          <Globe2 size={14} className="text-[#7A8690]" />
          <button
            onClick={() => setLang('hi')}
            className={`px-2 py-1 text-xs font-medium rounded ${lang === 'hi' ? 'bg-[#FEF0EC] text-[#E95A34]' : 'text-[#7A8690]'}`}
            data-testid="lang-hi"
          >हिन्दी</button>
          <button
            onClick={() => setLang('en')}
            className={`px-2 py-1 text-xs font-medium rounded ${lang === 'en' ? 'bg-[#FEF0EC] text-[#E95A34]' : 'text-[#7A8690]'}`}
            data-testid="lang-en"
          >English</button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-[#7A8690] flex items-center gap-1 mb-1"><User size={12} /> {t.name}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
              data-testid="kundli-name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#7A8690] mb-1 block">{t.gender}</label>
            <select
              value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
              data-testid="kundli-gender"
            >
              <option value="Male">{t.male}</option>
              <option value="Female">{t.female}</option>
              <option value="Other">{t.other}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[#7A8690] flex items-center gap-1 mb-1"><Calendar size={12} /> {t.dob}</label>
            <input
              type="date"
              value={form.dob}
              onChange={e => setForm({ ...form, dob: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
              data-testid="kundli-dob"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#7A8690] flex items-center gap-1 mb-1"><Clock size={12} /> {t.tob}</label>
            <input
              type="time"
              value={form.tob}
              onChange={e => setForm({ ...form, tob: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
              data-testid="kundli-tob"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <label className="text-xs font-medium text-[#7A8690] flex items-center gap-1 mb-1"><MapPin size={12} /> {t.place}</label>
            <input
              type="text"
              value={form.birth_place}
              placeholder={t.placeholder_place}
              onChange={e => setForm({ ...form, birth_place: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4E1] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
              data-testid="kundli-place"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E95A34] hover:bg-[#D04E2C] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            data-testid="kundli-submit"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? t.generating : (result ? t.regenerate : t.generate)}
          </button>
        </div>
      </form>

      {/* Results */}
      {result && (
        <>
          {/* Recommendations */}
          <div className="bg-gradient-to-br from-[#FEF0EC] to-white rounded-xl border border-[#FDDDD4] p-6 animate-fade-in" data-testid="kundli-recommendations">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
                <Sparkles size={20} className="text-[#E95A34]" />
                {t.recommendations}
              </h2>
            </div>
            {(!result.recommendations || result.recommendations.length === 0) ? (
              <p className="text-sm text-[#7A8690]">{t.noRec}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.recommendations.map((rec, idx) => {
                  const c = PRIORITY_COLOURS[rec.priority] || PRIORITY_COLOURS.LOW;
                  const r = rec.recommendation;
                  return (
                    <div key={idx} className="bg-white rounded-lg border border-[#FDDDD4] p-5" data-testid={`recommendation-${rec.graha.toLowerCase()}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>{lang === 'hi' ? rec.graha_hi : rec.graha}</p>
                          <p className="text-xs text-[#7A8690] mt-0.5">{lang === 'hi' ? r.devta_hi : r.devta}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
                          {t.priority[rec.priority]} · {Math.round(rec.score)}
                        </span>
                      </div>
                      <div className="bg-[#FEF8F5] rounded-lg p-3 mb-3 border-l-2" style={{ borderColor: c.accent }}>
                        <p className="text-sm font-medium leading-relaxed" style={{ fontFamily: 'Tiro Devanagari Hindi, serif' }}>
                          {r.mantra}
                        </p>
                        <p className="text-xs text-[#7A8690] mt-1 italic">{r.mantra_en}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <span className="text-[#7A8690]">{t.count}: </span>
                          <span className="font-semibold">{r.count}</span>
                        </div>
                        <div>
                          <span className="text-[#7A8690]">{t.day}: </span>
                          <span className="font-semibold">{lang === 'hi' ? r.day_hi : r.day}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#7A8690]">{t.color}: </span>
                          <span className="font-semibold">{lang === 'hi' ? r.color_hi : r.color}</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#374652] mb-3">{lang === 'hi' ? r.remedy_hi : r.remedy_en}</p>
                      {rec.reasons && rec.reasons.length > 0 && (
                        <div className="text-xs mb-3">
                          <p className="text-[#7A8690] font-medium mb-1">{t.reasons}:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-[#374652]">
                            {rec.reasons.slice(0, 3).map((rs, i) => <li key={i}>{rs}</li>)}
                          </ul>
                        </div>
                      )}
                      <MantraAudioButton mantra={r.mantra} language={lang === 'en' ? 'en' : 'hi'} t={t} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ascendant */}
          {result.ascendant && (
            <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 animate-fade-in">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#E95A34] mb-2">{t.ascendant}</h3>
              <div className="flex items-baseline gap-3 flex-wrap">
                <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>
                  {lang === 'hi' ? result.ascendant.rashi_hi : result.ascendant.rashi}
                </p>
                <span className="text-sm text-[#7A8690]">
                  {result.ascendant.degree?.toFixed(2)}° · {t.nakshatra}: {lang === 'hi' ? result.ascendant.nakshatra_hi : result.ascendant.nakshatra}
                </span>
              </div>
            </div>
          )}

          {/* Planets Table */}
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
            <h3 className="text-lg font-semibold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }}>{t.planetsTitle}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#7A8690] border-b border-[#E8E4E1]">
                    <th className="text-left py-2 px-2">{t.name}</th>
                    <th className="text-left py-2 px-2">{t.rashi}</th>
                    <th className="text-left py-2 px-2">{t.house}</th>
                    <th className="text-left py-2 px-2">{t.degree}</th>
                    <th className="text-left py-2 px-2">{t.nakshatra}</th>
                    <th className="text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.planets || []).map((p) => (
                    <tr key={p.graha} className="border-b border-[#F3EDEA] last:border-0">
                      <td className="py-2 px-2 font-semibold">{lang === 'hi' ? p.graha_hi : p.graha}</td>
                      <td className="py-2 px-2">{lang === 'hi' ? p.rashi_hi : p.rashi}</td>
                      <td className="py-2 px-2">{p.house}</td>
                      <td className="py-2 px-2 text-[#7A8690]">{p.degree_in_sign?.toFixed(2)}°</td>
                      <td className="py-2 px-2">{lang === 'hi' ? p.nakshatra_hi : p.nakshatra}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          {p.is_retrograde && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">{t.retrograde}</span>}
                          {p.is_combust && <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded">{t.combust}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Graha Scores */}
          {result.graha_scores && result.graha_scores.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
              <h3 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
                <TrendingUp size={18} className="text-[#E95A34]" /> {t.grahaScores}
              </h3>
              <div className="space-y-2">
                {result.graha_scores.map((s) => {
                  const c = PRIORITY_COLOURS[s.priority] || PRIORITY_COLOURS.LOW;
                  const pct = Math.min(100, s.score);
                  return (
                    <div key={s.graha} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium">{lang === 'hi' ? s.graha_hi : s.graha}</span>
                      <div className="flex-1 h-2 bg-[#F3EDEA] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: c.accent }} />
                      </div>
                      <span className="text-xs font-bold w-10 text-right">{Math.round(s.score)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-16 text-center" style={{ backgroundColor: c.bg, color: c.text }}>
                        {t.priority[s.priority]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
