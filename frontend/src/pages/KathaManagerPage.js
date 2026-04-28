import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Flame, Plus, Edit, X, ChevronRight } from 'lucide-react';

export default function KathaManagerPage() {
  const { api, user } = useAuth();
  const [kathas, setKathas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/katha/items');
        setKathas(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [api]);

  return (
    <div className="space-y-6" data-testid="katha-manager-page">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Stories & Rituals</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Katha & Puja</h1>
          <p className="text-sm text-[#7A8690] mt-1">Manage sacred stories and puja vidhi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-48 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)
        ) : kathas.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#989EA4]">
            <Flame size={40} className="mx-auto mb-3 opacity-50" />
            <p>No kathas yet</p>
          </div>
        ) : kathas.map(katha => (
          <div key={katha._id} className="bg-white rounded-xl border border-[#E8E4E1] p-5 hover:shadow-sm transition-all" data-testid={`katha-${katha._id}`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0">
                <Flame size={20} className="text-[#E95A34]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold" style={{ fontFamily: 'Manrope' }}>{katha.title_en}</h3>
                <p className="text-sm text-[#E95A34]">{katha.title_hi}</p>
                <p className="text-xs text-[#7A8690] mt-1">Deity: {katha.deity || katha.deity_hi}</p>
                <p className="text-xs text-[#7A8690] mt-1 line-clamp-2">{katha.intro_text_en}</p>
                <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[#F3EDEA] text-xs text-[#7A8690]">
                  <span>{katha.total_chapters} Chapters</span>
                  <span>{katha.puja_vidhi?.length || 0} Puja Steps</span>
                  <span>{katha.samagri?.length || 0} Samagri Items</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
