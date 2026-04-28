import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Star, Loader2, Sparkles, ChevronRight, BookOpen } from 'lucide-react';

export default function NakshatraUpayaPage() {
  const { api } = useAuth();
  const [nakshatras, setNakshatras] = useState([]);
  const [selectedNakshatra, setSelectedNakshatra] = useState(null);
  const [concern, setConcern] = useState('');
  const [upayaResult, setUpayaResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testUserId, setTestUserId] = useState('test-user-001');
  const [profileSet, setProfileSet] = useState(false);
  const [dob, setDob] = useState('');
  const [nakshatraContent, setNakshatraContent] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/nakshatras');
        setNakshatras(data);
      } catch (err) { console.error(err); }
    };
    fetch();
  }, [api]);

  const setProfile = async () => {
    if (!selectedNakshatra) return;
    try {
      await api.post('/user/nakshatra-profile', {
        user_id: testUserId,
        nakshatra_num: selectedNakshatra,
        dob: dob,
      });
      setProfileSet(true);

      // Fetch nakshatra content
      const { data } = await api.get(`/nakshatra/${selectedNakshatra}/content`);
      setNakshatraContent(data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error setting profile');
    }
  };

  const getUpaya = async () => {
    if (!profileSet) { alert('Please set nakshatra profile first'); return; }
    setLoading(true);
    setUpayaResult(null);
    try {
      const { data } = await api.post('/user/upaya', {
        user_id: testUserId,
        concern: concern || 'general spiritual wellbeing and daily routine',
      });
      setUpayaResult(data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error generating upaya');
    } finally {
      setLoading(false);
    }
  };

  const selectedNakshatraData = nakshatras.find(n => n.num === selectedNakshatra);

  const CONCERNS = [
    'General spiritual wellbeing',
    'Health and healing',
    'Career and prosperity',
    'Relationship and marriage',
    'Education and knowledge',
    'Peace of mind and meditation',
    'Protection from negativity',
    'Family harmony',
  ];

  return (
    <div className="space-y-6" data-testid="nakshatra-upaya-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Personalized</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Nakshatra & Upaya</h1>
        <p className="text-sm text-[#7A8690] mt-1">Personalized spiritual guidance based on birth nakshatra</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Setup */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 space-y-4 animate-fade-in">
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Birth Details</h3>

          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="dob-input" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Nakshatra</label>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-[#E8E4E1] rounded-lg p-2 bg-[#F8F3F1]">
              {nakshatras.map(n => (
                <button key={n.num} onClick={() => setSelectedNakshatra(n.num)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedNakshatra === n.num ? 'bg-[#E95A34] text-white' : 'hover:bg-[#FEF0EC] text-[#374652]'}`}
                  data-testid={`nakshatra-${n.num}`}
                >
                  <span className="font-medium">{n.num}. {n.name_en}</span>
                  <span className="text-xs ml-2 opacity-70">{n.name_hi} | {n.graha}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedNakshatraData && (
            <div className="p-3 bg-[#FEF0EC] rounded-lg">
              <p className="text-sm font-medium text-[#D08465]">{selectedNakshatraData.name_en} ({selectedNakshatraData.name_hi})</p>
              <p className="text-xs text-[#7A8690] mt-1">Ruling Planet: {selectedNakshatraData.graha}</p>
              <p className="text-xs text-[#7A8690]">Deity: {selectedNakshatraData.deity}</p>
            </div>
          )}

          <button onClick={setProfile} disabled={!selectedNakshatra} className="w-full px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors" data-testid="set-profile-btn">
            {profileSet ? 'Profile Updated' : 'Set Nakshatra Profile'}
          </button>
        </div>

        {/* Upaya Generator */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 space-y-4 animate-fade-in">
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Get Personalized Upaya</h3>
          <p className="text-xs text-[#7A8690]">AI-powered Vedic remedies based on your nakshatra</p>

          <div>
            <label className="block text-sm font-medium mb-2">What's your concern?</label>
            <div className="space-y-1.5">
              {CONCERNS.map(c => (
                <button key={c} onClick={() => setConcern(c)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${concern === c ? 'bg-[#FEF0EC] text-[#D08465] border border-[#E95A34]' : 'border border-[#E8E4E1] hover:border-[#E95A34]'}`}
                >{c}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Or describe your concern</label>
            <textarea value={concern} onChange={(e) => setConcern(e.target.value)} rows={2} placeholder="Describe..." className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="concern-input" />
          </div>

          <button onClick={getUpaya} disabled={loading || !profileSet} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium disabled:opacity-50" data-testid="get-upaya-btn">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Generating Upaya...</> : <><Sparkles size={18} /> Get My Upaya</>}
          </button>

          {/* Nakshatra Content */}
          {nakshatraContent && nakshatraContent.graha_mantras && (
            <div className="p-3 bg-[#F8F3F1] rounded-lg border border-[#E8E4E1]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#E95A34] mb-1">Your Graha Mantra</p>
              <p className="text-sm text-[#374652]">{nakshatraContent.graha_mantras}</p>
            </div>
          )}
        </div>

        {/* Upaya Result */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in max-h-[80vh] overflow-y-auto">
          {upayaResult ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star size={20} className="text-[#E95A34]" />
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Your Personalized Upaya</h3>
              </div>
              <div className="p-3 bg-[#FEF0EC] rounded-lg mb-4">
                <p className="text-xs text-[#D08465]">
                  Nakshatra: <strong>{upayaResult.nakshatra} ({upayaResult.nakshatra_hi})</strong> | Graha: <strong>{upayaResult.ruling_graha}</strong> | Deity: <strong>{upayaResult.deity}</strong>
                </p>
              </div>
              <div className="prose prose-sm max-w-none text-[#374652] whitespace-pre-wrap text-sm leading-relaxed" data-testid="upaya-result">
                {upayaResult.upaya}
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <Loader2 size={32} className="animate-spin text-[#E95A34] mb-3" />
              <p className="text-sm text-[#7A8690]">Generating personalized Upaya...</p>
              <p className="text-xs text-[#989EA4] mt-1">Based on your nakshatra & birth chart</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <Star size={40} className="text-[#989EA4] mb-3 opacity-40" />
              <p className="text-sm text-[#7A8690]">Set your nakshatra profile and select a concern to get personalized Vedic remedies</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
