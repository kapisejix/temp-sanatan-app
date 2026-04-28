import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Star, Loader2, Sparkles, BookOpen, Calendar, MapPin } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BirthChartPage() {
  const [form, setForm] = useState({ name: '', dob: '', birth_time: '', birth_place: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!form.name || !form.dob) { setError('Name and Date of Birth are required'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await axios.post(`${API}/public/birth-chart`, form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally { setLoading(false); }
  };

  const chart = result?.chart;

  return (
    <div className="min-h-screen bg-[#F8F3F1]" data-testid="birth-chart-page">
      <nav className="bg-white border-b border-[#E8E4E1] px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-[#7A8690] hover:text-[#374652]"><ArrowLeft size={18} /> Home</Link>
            <span className="text-[#E8E4E1]">|</span>
            <span className="font-semibold" style={{ fontFamily: 'Manrope' }}>Nakshatra Birth Chart</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-2">Vedic Astrology</p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Know Your Nakshatra & Remedies</h1>
          <p className="text-sm text-[#7A8690] mt-3 max-w-xl mx-auto">Enter your birth details to discover your Nakshatra, Rashi, Grah Dosh, personalized mantras, puja recommendations, and spiritual remedies.</p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-2xl border border-[#E8E4E1] p-8 max-w-xl mx-auto shadow-sm mb-10">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#374652] mb-1.5">Full Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter your name" className="w-full px-4 py-3 bg-[#F8F3F1] border border-[#E8E4E1] rounded-xl text-sm focus:ring-2 focus:ring-[#E95A34] focus:border-[#E95A34]" data-testid="chart-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#374652] mb-1.5">Date of Birth</label>
                <input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="w-full px-4 py-3 bg-[#F8F3F1] border border-[#E8E4E1] rounded-xl text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="chart-dob" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374652] mb-1.5">Birth Time <span className="text-[#989EA4]">(optional)</span></label>
                <input type="time" value={form.birth_time} onChange={e => setForm({...form, birth_time: e.target.value})} className="w-full px-4 py-3 bg-[#F8F3F1] border border-[#E8E4E1] rounded-xl text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="chart-time" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374652] mb-1.5">Birth Place <span className="text-[#989EA4]">(optional)</span></label>
              <input value={form.birth_place} onChange={e => setForm({...form, birth_place: e.target.value})} placeholder="e.g., Mumbai, India" className="w-full px-4 py-3 bg-[#F8F3F1] border border-[#E8E4E1] rounded-xl text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="chart-place" />
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <button onClick={analyze} disabled={loading} className="w-full py-3.5 bg-[#E95A34] hover:bg-[#D04A28] text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors" data-testid="analyze-btn">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing Birth Chart...</> : <><Sparkles size={18} /> Get My Nakshatra Analysis</>}
            </button>
            <p className="text-xs text-[#989EA4] text-center">Powered by Vedic Astrology AI. 3 free analyses per day.</p>
          </div>
        </div>

        {/* Results */}
        {chart && (
          <div className="space-y-6 animate-fade-in" data-testid="chart-results">
            {/* Nakshatra & Rashi */}
            <div className="bg-gradient-to-r from-[#FEF0EC] to-[#FDDDD4] rounded-2xl border border-[#FDDDD4] p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D08465] mb-1">Nakshatra</p>
                  <p className="text-2xl font-bold text-[#374652]" style={{ fontFamily: 'Manrope' }}>{chart.nakshatra?.name_en}</p>
                  <p className="text-lg text-[#E95A34]">{chart.nakshatra?.name_hi}</p>
                  {chart.nakshatra?.pada && <p className="text-sm text-[#7A8690]">Pada {chart.nakshatra.pada}</p>}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D08465] mb-1">Rashi (Moon Sign)</p>
                  <p className="text-2xl font-bold text-[#374652]" style={{ fontFamily: 'Manrope' }}>{chart.rashi?.name_en}</p>
                  <p className="text-lg text-[#E95A34]">{chart.rashi?.name_hi}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D08465] mb-1">Ruling Planet</p>
                  <p className="text-2xl font-bold text-[#374652]" style={{ fontFamily: 'Manrope' }}>{chart.ruling_graha?.name_en}</p>
                  <p className="text-lg text-[#E95A34]">{chart.ruling_graha?.name_hi}</p>
                  <p className="text-sm text-[#7A8690] capitalize">{chart.ruling_graha?.nature}</p>
                </div>
              </div>
            </div>

            {/* Daily Mantras */}
            {chart.daily_mantras?.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}><BookOpen size={20} className="text-[#E95A34]" /> Daily Mantras</h3>
                <div className="space-y-4">
                  {chart.daily_mantras.map((m, i) => (
                    <div key={i} className="bg-[#FEF0EC] rounded-xl p-5">
                      <p className="text-base font-semibold text-[#374652]">{m.mantra_sa}</p>
                      <p className="text-sm text-[#7A8690] italic mt-1">{m.mantra_transliteration}</p>
                      <p className="text-sm text-[#374652] mt-2">{m.meaning_hi}</p>
                      <div className="flex gap-4 mt-3 text-xs text-[#7A8690]">
                        <span>Chant: {m.count} times</span>
                        <span>When: {m.when_to_chant}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grah Dosh */}
            {chart.grah_dosh?.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Manrope' }}>Grah Dosh & Remedies</h3>
                <div className="space-y-3">
                  {chart.grah_dosh.map((d, i) => (
                    <div key={i} className="border border-[#E8E4E1] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-full font-medium">{d.graha}</span>
                        <span className="text-sm font-semibold">{d.dosh_name}</span>
                      </div>
                      <p className="text-sm text-[#374652]">{d.description_hi}</p>
                      <p className="text-xs text-[#7A8690] mt-1">{d.description_en}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Pujas */}
            {chart.recommended_pujas?.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Manrope' }}>Recommended Pujas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chart.recommended_pujas.map((p, i) => (
                    <div key={i} className="bg-[#F8F3F1] rounded-xl p-4 border border-[#E8E4E1]">
                      <p className="text-sm font-semibold">{p.puja_name_hi}</p>
                      <p className="text-xs text-[#E95A34]">{p.puja_name_en}</p>
                      <p className="text-xs text-[#7A8690] mt-1">{p.description}</p>
                      <div className="flex gap-3 mt-2 text-xs text-[#7A8690]">
                        {p.best_day && <span>Best Day: {p.best_day}</span>}
                        {p.deity && <span>Deity: {p.deity}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remedies + Gemstone + Lucky */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {chart.remedies?.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6">
                  <h3 className="text-lg font-bold mb-3" style={{ fontFamily: 'Manrope' }}>Spiritual Remedies</h3>
                  {chart.remedies.map((r, i) => (
                    <div key={i} className="py-2 border-b border-[#F3EDEA] last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 bg-[#FEF0EC] text-[#E95A34] rounded capitalize">{r.type}</span>
                        <p className="text-sm text-[#374652]">{r.remedy_en}</p>
                      </div>
                      <p className="text-sm text-[#E95A34] mt-0.5">{r.remedy_hi}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-4">
                {chart.gemstone && (
                  <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6">
                    <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'Manrope' }}>Gemstone</h3>
                    <p className="text-lg font-semibold text-[#E95A34]">{chart.gemstone.name_en} ({chart.gemstone.name_hi})</p>
                    <p className="text-xs text-[#7A8690] mt-1">Wear on: {chart.gemstone.wearing_finger} | Day: {chart.gemstone.wearing_day}</p>
                  </div>
                )}
                {chart.lucky && (
                  <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6">
                    <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'Manrope' }}>Lucky Details</h3>
                    <div className="text-sm space-y-1 text-[#7A8690]">
                      {chart.lucky.numbers?.length > 0 && <p>Numbers: <span className="font-medium text-[#374652]">{chart.lucky.numbers.join(', ')}</span></p>}
                      {chart.lucky.colors_en?.length > 0 && <p>Colors: <span className="font-medium text-[#374652]">{chart.lucky.colors_en.join(', ')}</span></p>}
                      {chart.lucky.day_en && <p>Day: <span className="font-medium text-[#374652]">{chart.lucky.day_en} ({chart.lucky.day_hi})</span></p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Guidance */}
            {chart.general_guidance_en && (
              <div className="bg-[#FEF0EC] rounded-2xl p-6 border border-[#FDDDD4]">
                <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'Manrope' }}>General Guidance</h3>
                <p className="text-sm text-[#374652] leading-relaxed">{chart.general_guidance_en}</p>
                {chart.general_guidance_hi && <p className="text-sm text-[#D08465] mt-3 leading-relaxed">{chart.general_guidance_hi}</p>}
              </div>
            )}

            {/* CTA */}
            <div className="text-center py-6">
              <p className="text-sm text-[#7A8690] mb-3">Download the app for daily personalized mantras and detailed Upaya</p>
              <a href="#download" className="inline-block px-8 py-3 bg-[#E95A34] text-white rounded-xl font-semibold hover:bg-[#D04A28]">Download Sanatan Saathi App</a>
            </div>
          </div>
        )}

        {/* Raw analysis fallback */}
        {result && !chart && result.raw_analysis && (
          <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6">
            <h3 className="text-lg font-bold mb-3">Analysis</h3>
            <div className="text-sm whitespace-pre-wrap text-[#374652]">{result.raw_analysis}</div>
          </div>
        )}
      </div>
    </div>
  );
}
