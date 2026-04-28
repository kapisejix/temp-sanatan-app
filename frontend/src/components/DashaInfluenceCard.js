import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Sparkles, AlertCircle, Zap } from 'lucide-react';

const T = {
  hi: {
    title: 'वर्तमान दशा प्रभाव',
    subtitle: 'महादशा + अंतर्दशा का विश्लेषण',
    md: 'महादशा', ad: 'अंतर्दशा',
    severity: 'समग्र', insights: 'मुख्य संकेत', aiInsight: 'AI व्याख्या',
    domains: 'क्षेत्रीय प्रभाव',
    loading: 'गणना हो रही है…',
    noKundli: 'कोई कुंडली नहीं — पहले कुंडली बनाएँ।',
    aiLoading: 'AI व्याख्या तैयार हो रही है…',
  },
  en: {
    title: 'Current Dasha Influence',
    subtitle: 'Mahadasha + Antardasha analysis',
    md: 'Mahadasha', ad: 'Antardasha',
    severity: 'Overall', insights: 'Key Themes', aiInsight: 'AI Interpretation',
    domains: 'Domain Impact',
    loading: 'Computing…',
    noKundli: 'No Kundli — generate one first.',
    aiLoading: 'Generating AI interpretation…',
  },
};

const SEVERITY_COLORS = {
  POSITIVE: { bg: '#DCFCE7', text: '#166534' },
  MILD_POSITIVE: { bg: '#D1FAE5', text: '#047857' },
  NEUTRAL: { bg: '#F3F4F6', text: '#374151' },
  MILD_NEGATIVE: { bg: '#FEF3C7', text: '#92400E' },
  NEGATIVE: { bg: '#FEE2E2', text: '#991B1B' },
};
const OVERALL_COLORS = {
  FAVOURABLE: { bg: '#DCFCE7', text: '#166534', accent: '#16A34A' },
  MIXED: { bg: '#FEF3C7', text: '#92400E', accent: '#D97706' },
  CHALLENGING: { bg: '#FED7AA', text: '#9A3412', accent: '#EA580C' },
  DIFFICULT: { bg: '#FEE2E2', text: '#991B1B', accent: '#DC2626' },
};

export default function DashaInfluenceCard({ language = 'hi' }) {
  const { api } = useAuth();
  const t = T[language];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/dasha/current');
        if (mounted) setData(res.data);
      } catch (e) {
        if (mounted) setErr(e.response?.status === 404 ? t.noKundli : 'Error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api, t.noKundli]);

  // Fetch AI interpretation in background
  useEffect(() => {
    if (!data || aiText) return;
    let mounted = true;
    setAiLoading(true);
    (async () => {
      try {
        const res = await api.post('/dasha/interpret', { language });
        if (mounted) setAiText(res.data.ai_explanation || '');
      } catch (e) { /* AI optional */ }
      finally { if (mounted) setAiLoading(false); }
    })();
    return () => { mounted = false; };
  }, [api, data, language, aiText]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-pulse">
        <div className="h-6 w-48 bg-[#F3EDEA] rounded mb-3" />
        <div className="h-32 bg-[#F8F3F1] rounded" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-6">
        <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Manrope' }}>{t.title}</h3>
        <p className="text-sm text-[#7A8690] flex items-center gap-2"><AlertCircle size={14} /> {err}</p>
      </div>
    );
  }

  if (!data || !data.current_dasha) return null;

  const cd = data.current_dasha;
  const interp = data.interpretation;
  const overall = OVERALL_COLORS[interp.overall_severity] || OVERALL_COLORS.MIXED;
  const themes = language === 'hi' ? interp.themes_hi : interp.themes_en;

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in" data-testid="dasha-influence-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1 flex items-center gap-1.5">
            <Zap size={12} /> {t.subtitle}
          </p>
          <h3 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{t.title}</h3>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: overall.bg, color: overall.text }}>
          {t.severity}: {language === 'hi' ? interp.overall_severity_hi : interp.overall_severity}
        </span>
      </div>

      {/* MD + AD pills */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#FEF8F5] border border-[#FDDDD4] rounded-lg p-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#7A8690]">{t.md}</p>
          <p className="text-2xl font-bold mt-0.5" style={{ fontFamily: 'Manrope' }}>
            {language === 'hi' ? cd.mahadasha.planet_hi : cd.mahadasha.planet}
          </p>
          <p className="text-[10px] text-[#7A8690] mt-0.5">
            {cd.mahadasha.start?.slice(0, 10)} → {cd.mahadasha.end?.slice(0, 10)}
          </p>
        </div>
        <div className="bg-[#FEF8F5] border border-[#FDDDD4] rounded-lg p-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#7A8690]">{t.ad}</p>
          <p className="text-2xl font-bold mt-0.5" style={{ fontFamily: 'Manrope' }}>
            {cd.antardasha ? (language === 'hi' ? cd.antardasha.planet_hi : cd.antardasha.planet) : '—'}
          </p>
          <p className="text-[10px] text-[#7A8690] mt-0.5">
            {cd.antardasha ? `${cd.antardasha.start?.slice(0, 10)} → ${cd.antardasha.end?.slice(0, 10)}` : ''}
          </p>
        </div>
      </div>

      {/* Themes (3 lines from rule output) */}
      <div className="mb-4">
        <p className="text-[10px] uppercase font-bold tracking-wider text-[#7A8690] mb-1">{t.insights}</p>
        <ul className="space-y-1">
          {themes.slice(0, 3).map((th, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-[#E95A34] mt-2 flex-shrink-0" />
              <span>{th}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Interpretation */}
      <div className="bg-gradient-to-br from-[#FEF0EC] to-white border border-[#FDDDD4] rounded-lg p-3 mb-4" data-testid="dasha-ai-insight">
        <p className="text-[10px] uppercase font-bold tracking-wider text-[#E95A34] mb-1 flex items-center gap-1">
          <Sparkles size={10} /> {t.aiInsight}
        </p>
        {aiLoading ? (
          <p className="text-sm text-[#7A8690] flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" /> {t.aiLoading}
          </p>
        ) : aiText ? (
          <p className="text-sm leading-relaxed text-[#374652]">{aiText}</p>
        ) : (
          <p className="text-xs text-[#7A8690]">—</p>
        )}
      </div>

      {/* Domain impacts */}
      <div>
        <p className="text-[10px] uppercase font-bold tracking-wider text-[#7A8690] mb-2">{t.domains}</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(interp.domain_impacts).map(([dom, di]) => {
            const c = SEVERITY_COLORS[di.severity] || SEVERITY_COLORS.NEUTRAL;
            return (
              <div key={dom} className="rounded-md px-2 py-2 text-center" style={{ backgroundColor: c.bg, color: c.text }} data-testid={`domain-${dom}`}>
                <p className="text-[10px] font-medium">{di.domain_hi}</p>
                <p className="text-[10px] font-bold mt-0.5">{language === 'hi' ? di.severity_hi : di.severity}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
