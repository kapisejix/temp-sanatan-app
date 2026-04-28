import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Smartphone, Tablet, Monitor, Globe, Eye, X, BookOpen, Volume2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृत' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
];

export default function LivePreviewModal({ itemId, onClose, rawData }) {
  const { api } = useAuth();
  const [previewData, setPreviewData] = useState(null);
  const [lang, setLang] = useState('hi');
  const [mode, setMode] = useState('beginner');
  const [device, setDevice] = useState('mobile');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itemId) fetchPreview();
    else if (rawData) renderRawPreview();
  }, [itemId, lang, mode, rawData]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/preview/item/${itemId}?lang=${lang}&mode=${mode}`);
      setPreviewData(data);
    } catch (err) {
      console.error('Preview fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderRawPreview = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/admin/preview/render', {
        title: rawData.title_hi || rawData.title_en || 'Preview',
        verses: rawData.verses || [],
        language: lang,
        mode: mode,
      });
      setPreviewData({
        item: { title_hi: rawData.title_hi, title_en: rawData.title_en },
        verses: data.verses,
        preview_mode: mode,
        preview_language: lang,
      });
    } catch (err) {
      console.error('Raw preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deviceWidths = { mobile: 'max-w-[375px]', tablet: 'max-w-[768px]', desktop: 'max-w-full' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" data-testid="live-preview-modal">
      <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#E8E4E1] bg-[#F8F3F1]">
          <div className="flex items-center gap-4">
            <Eye size={18} className="text-[#E95A34]" />
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Live Preview</h3>

            {/* Mode Toggle */}
            <div className="flex bg-white rounded-lg p-0.5 border border-[#E8E4E1]">
              <button onClick={() => setMode('beginner')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'beginner' ? 'bg-[#E95A34] text-white' : 'text-[#7A8690]'}`}>
                <BookOpen size={12} className="inline mr-1" /> Beginner
              </button>
              <button onClick={() => setMode('expert')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'expert' ? 'bg-[#E95A34] text-white' : 'text-[#7A8690]'}`}>
                Expert
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex gap-1">
              {LANGUAGES.slice(0, 5).map(l => (
                <button key={l.code} onClick={() => setLang(l.code)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${lang === l.code ? 'bg-[#E95A34] text-white' : 'bg-white border border-[#E8E4E1] text-[#7A8690] hover:border-[#E95A34]'}`}>
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Device Toggle */}
            <div className="flex gap-1 ml-2">
              <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded ${device === 'mobile' ? 'bg-[#E95A34] text-white' : 'text-[#7A8690] hover:bg-[#F3EDEA]'}`}><Smartphone size={14} /></button>
              <button onClick={() => setDevice('tablet')} className={`p-1.5 rounded ${device === 'tablet' ? 'bg-[#E95A34] text-white' : 'text-[#7A8690] hover:bg-[#F3EDEA]'}`}><Tablet size={14} /></button>
              <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded ${device === 'desktop' ? 'bg-[#E95A34] text-white' : 'text-[#7A8690] hover:bg-[#F3EDEA]'}`}><Monitor size={14} /></button>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white rounded-md text-[#7A8690]"><X size={18} /></button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto bg-[#F3EDEA] p-6 flex justify-center">
          <div className={`${deviceWidths[device]} w-full transition-all`}>
            <div className={`bg-white rounded-2xl overflow-hidden ${device === 'mobile' ? 'shadow-xl border-4 border-gray-800 rounded-3xl' : 'shadow-lg border border-[#E8E4E1]'}`}>
              {/* Simulated App Header */}
              {device === 'mobile' && (
                <div className="bg-gradient-to-r from-[#E95A34] to-[#D08465] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-1 bg-white/30 rounded-full" />
                    </div>
                    <p className="text-white text-xs font-medium">Sanatan Saathi</p>
                    <Globe size={14} className="text-white/60" />
                  </div>
                </div>
              )}

              {/* Title Section */}
              {previewData?.item && (
                <div className="bg-gradient-to-b from-[#FEF0EC] to-white px-5 py-4 border-b border-[#E8E4E1]">
                  <h2 className="text-xl font-bold text-[#374652]" style={{ fontFamily: 'Manrope' }}>
                    {previewData.item.title_hi || previewData.item.title_en}
                  </h2>
                  {previewData.item.title_en && previewData.item.title_hi && (
                    <p className="text-sm text-[#7A8690] mt-0.5">{previewData.item.title_en}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-[#E95A34] text-white rounded-full">{mode}</span>
                    <span className="text-xs text-[#7A8690]">{previewData.verses?.length || 0} verses</span>
                    <span className="text-xs text-[#7A8690]">{LANGUAGES.find(l => l.code === lang)?.native}</span>
                  </div>
                </div>
              )}

              {/* Verses */}
              <div className="p-4 space-y-3">
                {loading ? (
                  <div className="text-center py-12 text-[#989EA4]">Loading preview...</div>
                ) : previewData?.verses?.length > 0 ? (
                  previewData.verses.map((verse, idx) => (
                    <div key={idx} className="bg-[#FDFBFA] rounded-xl p-4 border border-[#F3EDEA]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#E95A34]">
                          {verse.verse_type === 'doha' ? 'दोहा' : verse.verse_type === 'chaupai' ? 'चौपाई' : 'श्लोक'} {verse.verse_num}
                        </span>
                        {verse.has_audio && <Volume2 size={14} className="text-[#E95A34]" />}
                      </div>

                      {/* Sanskrit Text - ALWAYS shown, NEVER truncated */}
                      <p className="text-base font-medium text-[#374652] leading-relaxed whitespace-pre-wrap mb-2">
                        {verse.sanskrit_text}
                      </p>

                      {/* Transliteration - Beginner mode only */}
                      {(verse.show_transliteration || mode === 'beginner') && verse.transliteration && (
                        <p className="text-sm text-[#7A8690] italic mb-2 leading-relaxed whitespace-pre-wrap">
                          {verse.transliteration}
                        </p>
                      )}

                      {/* Meaning */}
                      {verse.meaning && (
                        <div className="border-t border-[#F3EDEA] pt-2 mt-2">
                          <p className="text-xs font-bold text-[#D08465] mb-1">
                            {lang === 'hi' ? 'अर्थ' : lang === 'sa' ? 'अर्थः' : 'Meaning'}:
                          </p>
                          <p className="text-sm text-[#374652] leading-relaxed whitespace-pre-wrap">
                            {verse.meaning}
                          </p>
                        </div>
                      )}

                      {/* Word Breakdown - Beginner mode */}
                      {(verse.show_word_breakdown || mode === 'beginner') && verse.word_breakdown?.length > 0 && (
                        <div className="border-t border-[#F3EDEA] pt-2 mt-2">
                          <p className="text-xs font-bold text-[#D08465] mb-1">Word Meanings:</p>
                          <div className="flex flex-wrap gap-1">
                            {verse.word_breakdown.map((wb, wi) => (
                              <span key={wi} className="text-xs px-2 py-0.5 bg-[#FEF0EC] rounded">
                                <strong>{wb.word}</strong> = {wb.meaning}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#989EA4]">
                    <Eye size={32} className="mx-auto mb-2 opacity-40" />
                    <p>No verses to preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
