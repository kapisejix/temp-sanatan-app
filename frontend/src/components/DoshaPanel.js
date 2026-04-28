import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, ShieldCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';

const T = {
  hi: {
    title: 'दोष विश्लेषण',
    subtitle: 'मंगल / काल सर्प / साढ़े साती',
    mangal: 'मंगल दोष', kaalSarp: 'काल सर्प दोष', sadeSati: 'साढ़े साती',
    severity: { NONE: 'नहीं', LOW: 'हल्का', MEDIUM: 'मध्यम', HIGH: 'उच्च' },
    present: 'उपस्थित', absent: 'अनुपस्थित',
    aiInsight: 'AI व्याख्या',
    aiLoading: 'व्याख्या तैयार हो रही है…',
    fetchAi: 'AI व्याख्या देखें',
  },
  en: {
    title: 'Dosha Analysis',
    subtitle: 'Mangal / Kaal Sarp / Sade Sati',
    mangal: 'Mangal Dosha', kaalSarp: 'Kaal Sarp Dosha', sadeSati: 'Sade Sati',
    severity: { NONE: 'None', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' },
    present: 'Present', absent: 'Absent',
    aiInsight: 'AI Interpretation',
    aiLoading: 'Generating interpretation…',
    fetchAi: 'Get AI Interpretation',
  },
};

const SEV_COLORS = {
  NONE: { bg: '#DCFCE7', text: '#166534', accent: '#16A34A' },
  LOW: { bg: '#FEF3C7', text: '#92400E', accent: '#D97706' },
  MEDIUM: { bg: '#FED7AA', text: '#9A3412', accent: '#EA580C' },
  HIGH: { bg: '#FEE2E2', text: '#991B1B', accent: '#DC2626' },
};

function DoshaItem({ dosha, type, label, language, t }) {
  const { api } = useAuth();
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);
  const sev = dosha.severity || 'NONE';
  const c = SEV_COLORS[sev] || SEV_COLORS.NONE;

  const fetchAi = async () => {
    if (aiText) return;
    setLoading(true);
    try {
      const res = await api.post('/dosha/interpret', { dosha_type: type, language });
      setAiText(res.data.ai_explanation || '');
    } catch (e) { /* skip */ }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E8E4E1] p-4" data-testid={`dosha-${type}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-base font-bold" style={{ fontFamily: 'Manrope' }}>{label}</p>
          <p className="text-xs text-[#7A8690] mt-0.5">
            {dosha.present ? t.present : t.absent}
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
          {language === 'hi' ? (dosha.severity_hi || t.severity[sev]) : t.severity[sev]}
        </span>
      </div>
      <p className="text-xs text-[#374652] leading-relaxed mb-3">
        {language === 'hi' ? dosha.explanation_hi : dosha.explanation_en}
      </p>
      {dosha.present && (
        <div>
          {!aiText && !loading && (
            <button
              onClick={fetchAi}
              className="text-xs text-[#E95A34] hover:underline flex items-center gap-1"
              data-testid={`dosha-ai-btn-${type}`}
            >
              <Sparkles size={11} /> {t.fetchAi}
            </button>
          )}
          {loading && (
            <p className="text-xs text-[#7A8690] flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> {t.aiLoading}
            </p>
          )}
          {aiText && (
            <div className="bg-[#FEF0EC] border border-[#FDDDD4] rounded p-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#E95A34] mb-1 flex items-center gap-1">
                <Sparkles size={9} /> {t.aiInsight}
              </p>
              <p className="text-xs leading-relaxed text-[#374652]">{aiText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DoshaPanel({ language = 'hi' }) {
  const { api } = useAuth();
  const t = T[language];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/dosha/detect');
        if (mounted) setData(res.data.doshas);
      } catch (e) {
        if (mounted) setErr(e.response?.data?.detail || 'Error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-pulse">
        <div className="h-6 w-48 bg-[#F3EDEA] rounded mb-3" />
        <div className="h-32 bg-[#F8F3F1] rounded" />
      </div>
    );
  }

  if (err || !data) return null;

  const anyPresent = data.mangal_dosha?.present || data.kaal_sarp_dosha?.present || data.sade_sati?.present;
  const Icon = anyPresent ? ShieldAlert : ShieldCheck;

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in" data-testid="dosha-panel">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className={anyPresent ? "text-[#DC2626]" : "text-[#16A34A]"} />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34]">{t.subtitle}</p>
          <h3 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{t.title}</h3>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DoshaItem dosha={data.mangal_dosha} type="mangal_dosha" label={t.mangal} language={language} t={t} />
        <DoshaItem dosha={data.kaal_sarp_dosha} type="kaal_sarp_dosha" label={t.kaalSarp} language={language} t={t} />
        <DoshaItem dosha={data.sade_sati} type="sade_sati" label={t.sadeSati} language={language} t={t} />
      </div>
    </div>
  );
}
