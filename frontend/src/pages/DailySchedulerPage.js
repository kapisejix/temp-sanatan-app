import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CalendarClock, Plus, Edit, Trash2, X, Loader2, Calendar, Repeat, Star } from 'lucide-react';

const DAYS = [
  { value: 'sunday', label: 'Sunday (Ravivar)' },
  { value: 'monday', label: 'Monday (Somvar)' },
  { value: 'tuesday', label: 'Tuesday (Mangalvar)' },
  { value: 'wednesday', label: 'Wednesday (Budhvar)' },
  { value: 'thursday', label: 'Thursday (Guruvar)' },
  { value: 'friday', label: 'Friday (Shukravar)' },
  { value: 'saturday', label: 'Saturday (Shanivar)' },
];

export default function DailySchedulerPage() {
  const { api, user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [vratFestivals, setVratFestivals] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showVFModal, setShowVFModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeTab, setActiveTab] = useState('schedules');
  const [form, setForm] = useState({
    schedule_type: 'recurring', day_of_week: 'monday', date: '',
    content_id: '', title: '', is_active: true,
  });
  const [vfForm, setVfForm] = useState({
    type: 'vrat', name_hi: '', name_en: '', deity: '',
    description_hi: '', description_en: '',
    date: '', recurring_day: '', linked_content_tags: [], is_active: true,
  });

  const fetchAll = async () => {
    try {
      const [sched, vf, items] = await Promise.all([
        api.get('/admin/daily-schedule'),
        api.get('/admin/vrat-festivals'),
        api.get('/content/items?limit=100'),
      ]);
      setSchedules(sched.data);
      setVratFestivals(vf.data);
      setContentItems(items.data.items || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveSchedule = async () => {
    try {
      if (editItem) {
        await api.put(`/admin/daily-schedule/${editItem._id}`, form);
      } else {
        await api.post('/admin/daily-schedule', form);
      }
      setShowModal(false);
      setEditItem(null);
      fetchAll();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    try { await api.delete(`/admin/daily-schedule/${id}`); fetchAll(); }
    catch (err) { alert('Error deleting'); }
  };

  const handleSaveVF = async () => {
    try {
      if (editItem) {
        await api.put(`/admin/vrat-festivals/${editItem._id}`, vfForm);
      } else {
        await api.post('/admin/vrat-festivals', vfForm);
      }
      setShowVFModal(false);
      setEditItem(null);
      fetchAll();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const openEditSchedule = (s) => {
    setEditItem(s);
    setForm({ schedule_type: s.schedule_type || 'recurring', day_of_week: s.day_of_week || 'monday', date: s.date || '', content_id: s.content_id || '', title: s.title || '', is_active: s.is_active !== false });
    setShowModal(true);
  };

  const openEditVF = (v) => {
    setEditItem(v);
    setVfForm({ type: v.type || 'vrat', name_hi: v.name_hi || '', name_en: v.name_en || '', deity: v.deity || '', description_hi: v.description_hi || '', description_en: v.description_en || '', date: v.date || '', recurring_day: v.recurring_day || '', linked_content_tags: v.linked_content_tags || [], is_active: v.is_active !== false });
    setShowVFModal(true);
  };

  return (
    <div className="space-y-6" data-testid="daily-scheduler-page">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Schedule</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Daily Shloka & Festivals</h1>
          <p className="text-sm text-[#7A8690] mt-1">Schedule daily shlokas, manage vrats and festivals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F3EDEA] rounded-lg p-1 w-fit animate-fade-in">
        {[
          { key: 'schedules', label: 'Daily Shloka', icon: CalendarClock },
          { key: 'vrat', label: 'Vrat & Festivals', icon: Star },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-[#374652] shadow-sm' : 'text-[#7A8690] hover:text-[#374652]'}`}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'schedules' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditItem(null); setForm({ schedule_type: 'recurring', day_of_week: 'monday', date: '', content_id: '', title: '', is_active: true }); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm" data-testid="add-schedule-btn">
              <Plus size={18} /> Add Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)
            ) : schedules.length === 0 ? (
              <div className="col-span-full text-center py-16 text-[#989EA4]">
                <CalendarClock size={40} className="mx-auto mb-3 opacity-50" />
                <p>No daily schedules yet</p>
              </div>
            ) : schedules.map(s => (
              <div key={s._id} className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-all ${s.is_active ? 'border-[#E8E4E1]' : 'border-gray-200 opacity-60'}`} data-testid={`schedule-${s._id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {s.schedule_type === 'recurring' ? <Repeat size={16} className="text-[#E95A34]" /> : <Calendar size={16} className="text-[#E95A34]" />}
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E95A34]">
                      {s.schedule_type === 'recurring' ? s.day_of_week : s.date}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditSchedule(s)} className="p-1 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]"><Edit size={14} /></button>
                    <button onClick={() => handleDeleteSchedule(s._id)} className="p-1 hover:bg-red-50 rounded-md text-[#7A8690] hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <p className="text-sm font-medium text-[#374652]">{s.title || 'Untitled'}</p>
                {s.content_item && (
                  <p className="text-xs text-[#7A8690] mt-1">{s.content_item.title_en} ({s.content_item.category?.replace(/_/g, ' ')})</p>
                )}
                <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'vrat' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditItem(null); setVfForm({ type: 'vrat', name_hi: '', name_en: '', deity: '', description_hi: '', description_en: '', date: '', recurring_day: '', linked_content_tags: [], is_active: true }); setShowVFModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm" data-testid="add-vrat-btn">
              <Plus size={18} /> Add Vrat/Festival
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {vratFestivals.map(v => (
              <div key={v._id} className="bg-white rounded-xl border border-[#E8E4E1] p-5 hover:shadow-sm transition-all" data-testid={`vf-${v._id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${v.type === 'festival' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {v.type === 'festival' ? 'Festival' : 'Vrat'}
                  </span>
                  <button onClick={() => openEditVF(v)} className="p-1 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]"><Edit size={14} /></button>
                </div>
                <h3 className="text-base font-semibold" style={{ fontFamily: 'Manrope' }}>{v.name_en}</h3>
                <p className="text-sm text-[#E95A34]">{v.name_hi}</p>
                {v.deity && <p className="text-xs text-[#7A8690] mt-1">Deity: {v.deity}</p>}
                <p className="text-xs text-[#7A8690] mt-1">{v.description_en}</p>
                <div className="mt-3 pt-2 border-t border-[#F3EDEA] flex items-center gap-2 text-xs text-[#7A8690]">
                  {v.recurring_day && <span className="capitalize">Every {v.recurring_day}</span>}
                  {v.date && <span>{v.date}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-md shadow-xl animate-fade-in m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editItem ? 'Edit Schedule' : 'Add Schedule'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" placeholder="e.g., Tuesday - Hanuman Chalisa" data-testid="schedule-title-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={form.schedule_type} onChange={(e) => setForm({ ...form, schedule_type: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]">
                  <option value="recurring">Recurring (Weekly)</option>
                  <option value="specific">Specific Date</option>
                </select>
              </div>
              {form.schedule_type === 'recurring' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Day of Week</label>
                  <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]">
                    {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Content Item</label>
                <select value={form.content_id} onChange={(e) => setForm({ ...form, content_id: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="schedule-content-select">
                  <option value="">-- Select --</option>
                  {contentItems.map(i => <option key={i._id} value={i._id}>{i.title_en} ({i.category?.replace(/_/g, ' ')})</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#E95A34]" />
                <label className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
              <button onClick={handleSaveSchedule} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white text-sm font-medium rounded-lg" data-testid="save-schedule-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Vrat/Festival Modal */}
      {showVFModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editItem ? 'Edit' : 'Add'} Vrat/Festival</h3>
              <button onClick={() => setShowVFModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={vfForm.type} onChange={(e) => setVfForm({ ...vfForm, type: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm">
                    <option value="vrat">Vrat (Fast)</option>
                    <option value="festival">Festival</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deity</label>
                  <input value={vfForm.deity} onChange={(e) => setVfForm({ ...vfForm, deity: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name (Hindi)</label>
                  <input value={vfForm.name_hi} onChange={(e) => setVfForm({ ...vfForm, name_hi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" data-testid="vf-name-hi" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name (English)</label>
                  <input value={vfForm.name_en} onChange={(e) => setVfForm({ ...vfForm, name_en: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" data-testid="vf-name-en" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Hindi)</label>
                <textarea value={vfForm.description_hi} onChange={(e) => setVfForm({ ...vfForm, description_hi: e.target.value })} rows={2} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (English)</label>
                <textarea value={vfForm.description_en} onChange={(e) => setVfForm({ ...vfForm, description_en: e.target.value })} rows={2} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Recurring Day</label>
                  <select value={vfForm.recurring_day} onChange={(e) => setVfForm({ ...vfForm, recurring_day: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm">
                    <option value="">None</option>
                    {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Specific Date</label>
                  <input type="date" value={vfForm.date} onChange={(e) => setVfForm({ ...vfForm, date: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
              <button onClick={() => setShowVFModal(false)} className="px-4 py-2 text-sm text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
              <button onClick={handleSaveVF} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white text-sm font-medium rounded-lg" data-testid="save-vf-btn">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
