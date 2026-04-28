import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Music, Play } from 'lucide-react';

export default function ArtiManagerPage() {
  const { api } = useAuth();
  const [artis, setArtis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/arti/items');
        setArtis(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [api]);

  return (
    <div className="space-y-6" data-testid="arti-manager-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Devotional Songs</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Arti Sangrah</h1>
        <p className="text-sm text-[#7A8690] mt-1">Manage artis and devotional songs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-36 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)
        ) : artis.map(arti => (
          <div key={arti._id} className="bg-white rounded-xl border border-[#E8E4E1] p-5 hover:shadow-sm hover:-translate-y-[1px] transition-all group" data-testid={`arti-${arti._id}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#E95A34] transition-colors">
                <Music size={20} className="text-[#E95A34] group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>{arti.title_en}</h3>
                <p className="text-sm text-[#E95A34]">{arti.title_hi}</p>
                <p className="text-xs text-[#7A8690] mt-0.5">Deity: {arti.deity_hi || arti.deity}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F3EDEA]">
              <span className="text-xs text-[#7A8690]">{arti.audio_duration_seconds ? `${Math.floor(arti.audio_duration_seconds / 60)}:${String(arti.audio_duration_seconds % 60).padStart(2, '0')}` : 'No audio'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${arti.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {arti.status || 'draft'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
