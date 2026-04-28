import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, Edit, X, Sun, Moon, Loader2 } from 'lucide-react';

export default function PanchangPage() {
  const { api, user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState({
    date: '', tithi: '', nakshatra: '', yoga: '', karana: '',
    sunrise: '', sunset: '', rahu_kaal: '',
    festival_name: '', festival_name_en: '',
    is_panchak: false, is_bhadra: false,
  });

  const fetchEntries = async () => {
    try {
      const { data } = await api.get('/admin/panchang');
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  const openCreate = () => {
    setEditEntry(null);
    setForm({ date: '', tithi: '', nakshatra: '', yoga: '', karana: '', sunrise: '', sunset: '', rahu_kaal: '', festival_name: '', festival_name_en: '', is_panchak: false, is_bhadra: false });
    setShowModal(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      date: entry.date || '', tithi: entry.tithi || '', nakshatra: entry.nakshatra || '',
      yoga: entry.yoga || '', karana: entry.karana || '',
      sunrise: entry.sunrise || '', sunset: entry.sunset || '', rahu_kaal: entry.rahu_kaal || '',
      festival_name: entry.festival_name || '', festival_name_en: entry.festival_name_en || '',
      is_panchak: entry.is_panchak || false, is_bhadra: entry.is_bhadra || false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editEntry) {
        await api.put(`/admin/panchang/${editEntry._id}`, form);
      } else {
        await api.post('/admin/panchang', form);
      }
      setShowModal(false);
      fetchEntries();
    } catch (err) {
      alert('Error saving panchang');
    }
  };

  return (
    <div className="space-y-6" data-testid="panchang-page">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Hindu Calendar</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Panchang</h1>
          <p className="text-sm text-[#7A8690] mt-1">Manage daily panchang data and festivals</p>
        </div>
        {user?.role !== 'moderator' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm transition-colors" data-testid="add-panchang-btn">
            <Plus size={18} /> Add Entry
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-48 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)
        ) : entries.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#989EA4]">
            <Calendar size={40} className="mx-auto mb-3 opacity-50" />
            <p>No panchang entries yet</p>
          </div>
        ) : entries.map(entry => (
          <div key={entry._id} className="bg-white rounded-xl border border-[#E8E4E1] p-5 hover:shadow-sm transition-all" data-testid={`panchang-${entry._id}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#E95A34]" />
                <span className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>{entry.date}</span>
              </div>
              {user?.role !== 'moderator' && (
                <button onClick={() => openEdit(entry)} className="p-1 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]">
                  <Edit size={14} />
                </button>
              )}
            </div>
            {entry.festival_name && (
              <div className="mb-3 px-2 py-1 bg-[#FEF0EC] rounded-md">
                <p className="text-xs font-medium text-[#D08465]">{entry.festival_name}</p>
                {entry.festival_name_en && <p className="text-[10px] text-[#B45309]">{entry.festival_name_en}</p>}
              </div>
            )}
            <div className="space-y-1.5 text-xs text-[#7A8690]">
              <div className="flex justify-between"><span>Tithi:</span><span className="font-medium text-[#374652]">{entry.tithi}</span></div>
              <div className="flex justify-between"><span>Nakshatra:</span><span className="font-medium text-[#374652]">{entry.nakshatra}</span></div>
              <div className="flex justify-between"><span>Yoga:</span><span className="font-medium text-[#374652]">{entry.yoga}</span></div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#F3EDEA]">
                <div className="flex items-center gap-1"><Sun size={12} className="text-amber-500" /><span>{entry.sunrise}</span></div>
                <div className="flex items-center gap-1"><Moon size={12} className="text-blue-500" /><span>{entry.sunset}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" data-testid="panchang-modal">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editEntry ? 'Edit Panchang' : 'Add Panchang'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tithi</label>
                  <input value={form.tithi} onChange={(e) => setForm({ ...form, tithi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nakshatra</label>
                  <input value={form.nakshatra} onChange={(e) => setForm({ ...form, nakshatra: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Yoga</label>
                  <input value={form.yoga} onChange={(e) => setForm({ ...form, yoga: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Karana</label>
                  <input value={form.karana} onChange={(e) => setForm({ ...form, karana: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Sunrise</label>
                  <input value={form.sunrise} onChange={(e) => setForm({ ...form, sunrise: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sunset</label>
                  <input value={form.sunset} onChange={(e) => setForm({ ...form, sunset: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rahu Kaal</label>
                  <input value={form.rahu_kaal} onChange={(e) => setForm({ ...form, rahu_kaal: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Festival (Hindi)</label>
                  <input value={form.festival_name} onChange={(e) => setForm({ ...form, festival_name: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Festival (English)</label>
                  <input value={form.festival_name_en} onChange={(e) => setForm({ ...form, festival_name_en: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white text-sm font-medium rounded-lg" data-testid="save-panchang-btn">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
