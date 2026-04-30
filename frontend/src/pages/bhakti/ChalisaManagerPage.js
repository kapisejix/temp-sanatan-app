import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Plus, Search, Edit, Trash2, Eye, Download, Volume2, X, Check, Play, Layers, FileText } from 'lucide-react';
import BhaktiEditorDrawer from '../BhaktiEditorDrawer';

const CHALISA_SUBCATEGORIES = [
  { value: '', label: 'All Sub-categories' },
  { value: 'devta', label: 'Devta (22)', label_hi: 'देवता' },
  { value: 'devi', label: 'Devi (21)', label_hi: 'देवी' },
  { value: 'sant', label: 'Sant (9)', label_hi: 'सन्त' },
  { value: 'anya', label: 'Anya (2)', label_hi: 'अन्य' },
];

const VERSE_TYPES = [
  { value: 'doha', label: 'Doha', label_hi: 'दोहा' },
  { value: 'chaupai', label: 'Chaupai', label_hi: 'चौपाई' },
  { value: 'sortha', label: 'Sortha', label_hi: 'सोरठा' },
];

const LANGUAGES = [
  { code: 'hi', label: 'Hindi', label_native: 'हिन्दी' },
  { code: 'en', label: 'English', label_native: 'English' },
  { code: 'sa', label: 'Sanskrit', label_native: 'संस्कृत' },
  { code: 'mr', label: 'Marathi', label_native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', label_native: 'ગુજરાતી' },
  { code: 'ta', label: 'Tamil', label_native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', label_native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', label_native: 'বাংলা' },
];

export default function ChalisaManagerPage() {
  const { api, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerItemId, setDrawerItemId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [status, setStatus] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [viewMode, setViewMode] = useState('beginner'); // beginner | expert
  const [activeTab, setActiveTab] = useState('hi');

  const [formData, setFormData] = useState({
    title_hi: '', title_en: '', deity: '', deity_hi: '', subcategory: 'devta',
    description_hi: '', description_en: '', audio_url: '', video_url: '',
    supported_languages: ['hi', 'en', 'sa'], tags: [],
    verses: [], full_text: '', audio_timestamps: []
  });

  const [currentVerse, setCurrentVerse] = useState({
    verse_num: 1, verse_type: 'doha', sanskrit_text: '', transliteration: '',
    meanings: { hi: '', en: '', sa: '' }, word_breakdown: []
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: 'chalisa' });
      if (subcategory) params.append('subcategory', subcategory);
      if (status) params.append('status', status);
      const { data } = await api.get(`/bhakti/items?${params.toString()}`);
      let filtered = data.items || [];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(i => 
          i.title_en?.toLowerCase().includes(q) || i.title_hi?.includes(q)
        );
      }
      setItems(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [subcategory, status]);

  const handleSelectAll = (e) => {
    setSelectedItems(e.target.checked ? items.map(i => i._id) : []);
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) return alert('Select items first');
    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedItems.length} items?`)) return;
      await api.post('/bhakti/bulk-delete', { ids: selectedItems });
      fetchItems();
      setSelectedItems([]);
    } else if (action === 'export') {
      const { data } = await api.post('/bhakti/bulk-export', { ids: selectedItems });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'chalisa_export.json'; a.click();
    } else if (action === 'generate_tts') {
      await api.post('/bhakti/bulk-tts', { ids: selectedItems, category: 'chalisa' });
      alert('TTS generation started');
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setFormData({
      title_hi: '', title_en: '', deity: '', deity_hi: '', subcategory: 'devta',
      description_hi: '', description_en: '', audio_url: '', video_url: '',
      supported_languages: ['hi', 'en', 'sa'], tags: [], verses: [], full_text: '', audio_timestamps: []
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    // New flow: open the full-screen Unified Editor drawer (5 tabs, Beginner/Expert toggle,
    // per-language verse meanings). The old in-place modal is retired for edit.
    setDrawerItemId(item._id);
  };

  // Support `?edit=<id>` query param (used by Import Wizard auto-redirect).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eid = params.get('edit');
    if (eid && eid !== drawerItemId) setDrawerItemId(eid);
    // eslint-disable-next-line
  }, [location.search]);

  const openView = async (item) => {
    try {
      const { data } = await api.get(`/bhakti/items/${item._id}`);
      setViewItem(data);
      setShowViewModal(true);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData, category: 'chalisa' };
      if (editItem) {
        await api.put(`/bhakti/items/${editItem._id}`, payload);
      } else {
        await api.post('/bhakti/items', payload);
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this chalisa?')) return;
    await api.delete(`/bhakti/items/${id}`);
    fetchItems();
  };

  const handleStatusChange = async (id, newStatus) => {
    await api.patch(`/bhakti/items/${id}/status`, { status: newStatus });
    fetchItems();
  };

  const addVerse = () => {
    setFormData(prev => ({
      ...prev,
      verses: [...prev.verses, { ...currentVerse, verse_num: prev.verses.length + 1 }]
    }));
    setCurrentVerse({
      verse_num: formData.verses.length + 2, verse_type: 'chaupai',
      sanskrit_text: '', transliteration: '', meanings: { hi: '', en: '', sa: '' }, word_breakdown: []
    });
  };

  const removeVerse = (idx) => {
    setFormData(prev => ({
      ...prev,
      verses: prev.verses.filter((_, i) => i !== idx).map((v, i) => ({ ...v, verse_num: i + 1 }))
    }));
  };

  const toggleLanguage = (code) => {
    setFormData(prev => ({
      ...prev,
      supported_languages: prev.supported_languages.includes(code)
        ? prev.supported_languages.filter(l => l !== code)
        : [...prev.supported_languages, code]
    }));
  };

  return (
    <div className="space-y-6" data-testid="chalisa-manager-page">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Bhakti Content</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Chalisa Manager</h1>
          <p className="text-sm text-[#7A8690] mt-1">चालीसा संग्रह - Devta (22), Devi (21), Sant (9), Anya (2) - Doha+Chaupai format</p>
        </div>
        {user?.role !== 'moderator' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm transition-colors" data-testid="create-chalisa-btn">
            <Plus size={18} /> Add Chalisa
          </button>
        )}
      </div>

      {/* Sub-category Tabs */}
      <div className="flex flex-wrap gap-2 animate-fade-in">
        {CHALISA_SUBCATEGORIES.map(sub => (
          <button
            key={sub.value}
            onClick={() => setSubcategory(sub.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              subcategory === sub.value ? 'bg-[#E95A34] text-white' : 'bg-white border border-[#E8E4E1] text-[#7A8690] hover:bg-[#F3EDEA]'
            }`}
          >
            {sub.label} {sub.label_hi && <span className="text-xs opacity-75">({sub.label_hi})</span>}
          </button>
        ))}
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap gap-3 items-center animate-fade-in">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#989EA4]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchItems()} placeholder="Search chalisa..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-[#7A8690]">{selectedItems.length} selected</span>
            <button onClick={() => handleBulkAction('delete')} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"><Trash2 size={16} className="inline mr-1" /> Delete</button>
            <button onClick={() => handleBulkAction('export')} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"><Download size={16} className="inline mr-1" /> Export</button>
            <button onClick={() => handleBulkAction('generate_tts')} className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100"><Volume2 size={16} className="inline mr-1" /> Generate TTS</button>
          </div>
        )}
      </div>

      {/* Grid View */}
      <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden animate-fade-in">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F3EDEA]">
              <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedItems.length === items.length && items.length > 0} onChange={handleSelectAll} className="rounded" /></th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Title (Hi/En)</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Deity</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Verses</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Languages</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Status</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[#E8E4E1]">
                  {[...Array(7)].map((_, j) => (<td key={j} className="px-4 py-4"><div className="h-4 bg-[#F3EDEA] rounded animate-pulse" /></td>))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[#989EA4]">No chalisa found</td></tr>
            ) : items.map((item) => (
              <tr key={item._id} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1] transition-colors">
                <td className="px-4 py-3"><input type="checkbox" checked={selectedItems.includes(item._id)} onChange={() => handleSelectItem(item._id)} className="rounded" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center"><BookOpen size={18} className="text-[#E95A34]" /></div>
                    <div>
                      <p className="text-sm font-medium text-[#374652]">{item.title_hi}</p>
                      <p className="text-xs text-[#7A8690]">{item.title_en}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-[#FEF0EC] text-[#D08465] font-medium">{item.deity_hi || item.deity || '-'}</span></td>
                <td className="px-4 py-3 text-center text-sm font-medium">{item.total_verses || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(item.supported_languages || ['hi']).slice(0, 3).map(lang => (<span key={lang} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">{lang.toUpperCase()}</span>))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <select value={item.status} onChange={(e) => handleStatusChange(item._id, e.target.value)} className={`text-xs px-2 py-1 rounded-full font-medium border-0 ${item.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openView(item)} className="p-1.5 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]"><Eye size={16} /></button>
                    <button onClick={() => openEdit(item)} data-testid={`edit-item-${item._id}`} title="Edit" className="p-1.5 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]"><Edit size={16} /></button>
                    {user?.role === 'super_admin' && (<button onClick={() => handleDelete(item._id)} className="p-1.5 hover:bg-red-50 rounded-md text-[#7A8690] hover:text-red-600"><Trash2 size={16} /></button>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal with Beginner/Expert Mode */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1] sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editItem ? 'Edit Chalisa' : 'Add Chalisa'}</h3>
                <div className="flex bg-[#F3EDEA] rounded-lg p-0.5">
                  <button onClick={() => setViewMode('beginner')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'beginner' ? 'bg-white text-[#E95A34] shadow-sm' : 'text-[#7A8690]'}`}>
                    <Layers size={14} className="inline mr-1" /> Beginner
                  </button>
                  <button onClick={() => setViewMode('expert')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'expert' ? 'bg-white text-[#E95A34] shadow-sm' : 'text-[#7A8690]'}`}>
                    <FileText size={14} className="inline mr-1" /> Expert
                  </button>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title (Hindi) *</label>
                  <input value={formData.title_hi} onChange={(e) => setFormData({ ...formData, title_hi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="हनुमान चालीसा" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title (English) *</label>
                  <input value={formData.title_en} onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="Hanuman Chalisa" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sub-category</label>
                  <select value={formData.subcategory} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm">
                    {CHALISA_SUBCATEGORIES.filter(s => s.value).map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deity (Hindi)</label>
                  <input value={formData.deity_hi} onChange={(e) => setFormData({ ...formData, deity_hi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deity (English)</label>
                  <input value={formData.deity} onChange={(e) => setFormData({ ...formData, deity: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                </div>
              </div>

              {/* Mode-specific Content */}
              {viewMode === 'beginner' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Verse-by-Verse (Doha + Chaupai)</h4>
                    <span className="text-xs text-[#7A8690]">{formData.verses.length} verses</span>
                  </div>

                  {/* Existing Verses */}
                  {formData.verses.map((verse, idx) => (
                    <div key={idx} className="bg-[#F8F3F1] rounded-lg p-4 border border-[#E8E4E1]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#E95A34]">{verse.verse_type === 'doha' ? '॥ दोहा ॥' : '॥ चौपाई ॥'} #{verse.verse_num}</span>
                        <button onClick={() => removeVerse(idx)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                      </div>
                      <p className="text-sm font-medium text-[#374652] mb-1">{verse.sanskrit_text}</p>
                      <p className="text-xs text-[#7A8690] italic">{verse.transliteration}</p>
                    </div>
                  ))}

                  {/* Add New Verse */}
                  <div className="border-2 border-dashed border-[#E8E4E1] rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <select value={currentVerse.verse_type} onChange={(e) => setCurrentVerse({ ...currentVerse, verse_type: e.target.value })} className="px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm">
                        {VERSE_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label} ({t.label_hi})</option>))}
                      </select>
                      <div className="col-span-2">
                        <input value={currentVerse.sanskrit_text} onChange={(e) => setCurrentVerse({ ...currentVerse, sanskrit_text: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm" placeholder="Sanskrit/Hindi text..." />
                      </div>
                    </div>
                    <input value={currentVerse.transliteration} onChange={(e) => setCurrentVerse({ ...currentVerse, transliteration: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm" placeholder="Transliteration..." />
                    
                    {/* Multi-language Meanings */}
                    <div className="flex gap-2 border-b border-[#E8E4E1] pb-2">
                      {LANGUAGES.slice(0, 4).map(lang => (
                        <button key={lang.code} onClick={() => setActiveTab(lang.code)} className={`px-2 py-1 text-xs rounded ${activeTab === lang.code ? 'bg-[#E95A34] text-white' : 'bg-gray-100'}`}>{lang.label}</button>
                      ))}
                    </div>
                    <textarea value={currentVerse.meanings[activeTab] || ''} onChange={(e) => setCurrentVerse({ ...currentVerse, meanings: { ...currentVerse.meanings, [activeTab]: e.target.value } })} rows={2} className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm" placeholder={`Meaning in ${activeTab.toUpperCase()}...`} />
                    
                    <button onClick={addVerse} className="w-full py-2 bg-[#E95A34] text-white rounded-lg text-sm font-medium hover:bg-[#D04A28]">
                      <Plus size={16} className="inline mr-1" /> Add Verse
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Expert Mode - Full Text</h4>
                  <textarea value={formData.full_text} onChange={(e) => setFormData({ ...formData, full_text: e.target.value })} rows={12} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm font-mono" placeholder="Paste complete chalisa text here..." />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Audio URL/Upload</label>
                      <input value={formData.audio_url} onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Video URL</label>
                      <input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                    </div>
                  </div>

                  {/* Audio-Text Sync Timestamps */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Audio-Text Sync Timestamps (ms)</label>
                    <textarea value={formData.audio_timestamps.map(t => `${t.start}-${t.end}: ${t.text}`).join('\n')} onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim());
                      const timestamps = lines.map(line => {
                        const match = line.match(/(\d+)-(\d+): (.+)/);
                        return match ? { start: parseInt(match[1]), end: parseInt(match[2]), text: match[3] } : null;
                      }).filter(Boolean);
                      setFormData({ ...formData, audio_timestamps: timestamps });
                    }} rows={4} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm font-mono" placeholder="0-3000: जय हनुमान..." />
                  </div>
                </div>
              )}

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium mb-2">Supported Languages</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <button key={lang.code} type="button" onClick={() => toggleLanguage(lang.code)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${formData.supported_languages.includes(lang.code) ? 'bg-[#E95A34] text-white' : 'bg-[#F3EDEA] text-[#7A8690]'}`}>
                      {formData.supported_languages.includes(lang.code) && <Check size={14} />}
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1] sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white text-sm font-medium rounded-lg">{editItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1] sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold">{viewItem.title_hi}</h3>
                <p className="text-sm text-[#7A8690]">{viewItem.title_en}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-[#F3EDEA] rounded-lg p-0.5">
                  <button onClick={() => setViewMode('beginner')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'beginner' ? 'bg-white text-[#E95A34] shadow-sm' : 'text-[#7A8690]'}`}>Beginner</button>
                  <button onClick={() => setViewMode('expert')} className={`px-3 py-1 rounded-md text-sm ${viewMode === 'expert' ? 'bg-white text-[#E95A34] shadow-sm' : 'text-[#7A8690]'}`}>Expert</button>
                </div>
                <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6">
              {viewMode === 'beginner' ? (
                <div className="space-y-4">
                  {(viewItem.verses || []).map((verse, idx) => (
                    <div key={idx} className="bg-[#F8F3F1] rounded-lg p-4">
                      <p className="text-xs font-bold text-[#E95A34] mb-2">{verse.verse_type === 'doha' ? '॥ दोहा ॥' : '॥ चौपाई ॥'}</p>
                      <p className="text-lg font-medium text-[#374652] mb-2 leading-relaxed">{verse.sanskrit_text}</p>
                      <p className="text-sm text-[#7A8690] italic mb-3">{verse.transliteration}</p>
                      {verse.meanings?.hi && (
                        <div className="border-t border-[#E8E4E1] pt-3">
                          <p className="text-xs font-bold text-[#E95A34] mb-1">अर्थ:</p>
                          <p className="text-sm text-[#374652]">{verse.meanings.hi}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#F8F3F1] rounded-lg p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {viewItem.full_text || 'No content'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unified Editor Drawer */}
      <BhaktiEditorDrawer
        api={api}
        itemId={drawerItemId}
        category="chalisa"
        open={!!drawerItemId}
        onClose={() => {
          setDrawerItemId(null);
          // strip ?edit= so user can close without hitting browser back
          if (location.search.includes('edit=')) navigate(location.pathname, { replace: true });
        }}
        onChange={() => fetchItems()}
      />
    </div>
  );
}
