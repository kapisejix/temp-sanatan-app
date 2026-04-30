import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Music, Plus, Search, Edit, Trash2, Eye, Download, Volume2, ChevronDown, X, Check, Play, Pause, Upload } from 'lucide-react';
import BhaktiEditorDrawer from '../BhaktiEditorDrawer';

const AARTI_SUBCATEGORIES = [
  { value: '', label: 'All Sub-categories' },
  { value: 'ganesha', label: 'Ganesha', label_hi: 'गणेश' },
  { value: 'hanuman', label: 'Hanuman', label_hi: 'हनुमान' },
  { value: 'krishna', label: 'Krishna', label_hi: 'कृष्ण' },
  { value: 'ram', label: 'Ram', label_hi: 'राम' },
  { value: 'shiv', label: 'Shiv', label_hi: 'शिव' },
  { value: 'narayan', label: 'Narayan', label_hi: 'नारायण' },
  { value: 'devta', label: 'Devta', label_hi: 'देवता' },
  { value: 'devi', label: 'Devi', label_hi: 'देवी' },
  { value: 'sant', label: 'Sant', label_hi: 'सन्त' },
  { value: 'saptavar', label: 'Saptavar', label_hi: 'सप्तवार' },
  { value: 'anya', label: 'Anya (Other)', label_hi: 'अन्य' },
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

export default function AartiManagerPage() {
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
  const [playingAudio, setPlayingAudio] = useState(null);

  const [formData, setFormData] = useState({
    title_hi: '', title_en: '', deity: '', deity_hi: '', subcategory: 'ganesha',
    description_hi: '', description_en: '', music_type: 'Traditional harmonium',
    best_occasion: '', audio_url: '', video_url: '', thumbnail_url: '',
    supported_languages: ['hi', 'en', 'sa'], tags: [], full_text: '',
    audio_timestamps: []
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: 'aarti' });
      if (subcategory) params.append('subcategory', subcategory);
      if (status) params.append('status', status);
      const { data } = await api.get(`/bhakti/items?${params.toString()}`);
      let filtered = data.items || [];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(i => 
          i.title_en?.toLowerCase().includes(q) || 
          i.title_hi?.includes(q) ||
          i.deity?.toLowerCase().includes(q)
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
    if (e.target.checked) {
      setSelectedItems(items.map(i => i._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      alert('Please select items first');
      return;
    }
    
    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedItems.length} items?`)) return;
      try {
        await api.post('/bhakti/bulk-delete', { ids: selectedItems });
        fetchItems();
        setSelectedItems([]);
      } catch (err) {
        alert('Error deleting items');
      }
    } else if (action === 'export') {
      try {
        const { data } = await api.post('/bhakti/bulk-export', { ids: selectedItems });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aarti_export.json';
        a.click();
      } catch (err) {
        alert('Error exporting');
      }
    } else if (action === 'generate_tts') {
      try {
        await api.post('/bhakti/bulk-tts', { ids: selectedItems, category: 'aarti' });
        alert('TTS generation started for selected items');
      } catch (err) {
        alert('Error generating TTS');
      }
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setFormData({
      title_hi: '', title_en: '', deity: '', deity_hi: '', subcategory: 'ganesha',
      description_hi: '', description_en: '', music_type: 'Traditional harmonium',
      best_occasion: '', audio_url: '', video_url: '', thumbnail_url: '',
      supported_languages: ['hi', 'en', 'sa'], tags: [], full_text: '',
      audio_timestamps: []
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    // Open the unified Bhakti Editor drawer (Aarti → no Beginner/Expert toggle,
    // no Learner tab per product decision).
    setDrawerItemId(item._id);
  };

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
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData, category: 'aarti' };
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
    if (!window.confirm('Are you sure you want to delete this aarti?')) return;
    try {
      await api.delete(`/bhakti/items/${id}`);
      fetchItems();
    } catch (err) {
      alert('Error deleting');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/bhakti/items/${id}/status`, { status: newStatus });
      fetchItems();
    } catch (err) {
      alert('Error updating status');
    }
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
    <div className="space-y-6" data-testid="aarti-manager-page">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Bhakti Content</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Aarti Manager</h1>
          <p className="text-sm text-[#7A8690] mt-1">आरती संग्रह - 11 sub-categories, 80+ artis</p>
        </div>
        {user?.role !== 'moderator' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm transition-colors" data-testid="create-aarti-btn">
            <Plus size={18} /> Add Aarti
          </button>
        )}
      </div>

      {/* Sub-category Tabs */}
      <div className="flex flex-wrap gap-2 animate-fade-in">
        {AARTI_SUBCATEGORIES.map(sub => (
          <button
            key={sub.value}
            onClick={() => setSubcategory(sub.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              subcategory === sub.value
                ? 'bg-[#E95A34] text-white'
                : 'bg-white border border-[#E8E4E1] text-[#7A8690] hover:bg-[#F3EDEA]'
            }`}
            data-testid={`subcategory-tab-${sub.value || 'all'}`}
          >
            {sub.label} {sub.label_hi && <span className="text-xs opacity-75">({sub.label_hi})</span>}
          </button>
        ))}
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap gap-3 items-center animate-fade-in">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#989EA4]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
            placeholder="Search aarti..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
            data-testid="aarti-search-input"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-[#7A8690]">{selectedItems.length} selected</span>
            <button onClick={() => handleBulkAction('delete')} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
              <Trash2 size={16} className="inline mr-1" /> Delete
            </button>
            <button onClick={() => handleBulkAction('export')} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
              <Download size={16} className="inline mr-1" /> Export
            </button>
            <button onClick={() => handleBulkAction('generate_tts')} className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100">
              <Volume2 size={16} className="inline mr-1" /> Generate TTS
            </button>
          </div>
        )}
      </div>

      {/* Grid View */}
      <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F3EDEA]">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selectedItems.length === items.length && items.length > 0} onChange={handleSelectAll} className="rounded border-[#E8E4E1]" />
                </th>
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
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-[#F3EDEA] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-[#989EA4]">No aarti found</td></tr>
              ) : items.map((item) => (
                <tr key={item._id} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1] transition-colors" data-testid={`aarti-row-${item._id}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedItems.includes(item._id)} onChange={() => handleSelectItem(item._id)} className="rounded border-[#E8E4E1]" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Music size={18} className="text-[#E95A34]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#374652]">{item.title_hi}</p>
                        <p className="text-xs text-[#7A8690]">{item.title_en}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#FEF0EC] text-[#D08465] font-medium">{item.deity_hi || item.deity || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium">{item.total_verses || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(item.supported_languages || ['hi']).slice(0, 3).map(lang => (
                        <span key={lang} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">{lang.toUpperCase()}</span>
                      ))}
                      {(item.supported_languages?.length || 0) > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">+{item.supported_languages.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item._id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${
                        item.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openView(item)} className="p-1.5 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]" title="View">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => openEdit(item)} data-testid={`edit-item-${item._id}`} className="p-1.5 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]" title="Edit">
                        <Edit size={16} />
                      </button>
                      {user?.role === 'super_admin' && (
                        <button onClick={() => handleDelete(item._id)} className="p-1.5 hover:bg-red-50 rounded-md text-[#7A8690] hover:text-red-600" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal - Aarti specific (No Beginner/Expert mode) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1] sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editItem ? 'Edit Aarti' : 'Add Aarti'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title (Hindi) *</label>
                  <input value={formData.title_hi} onChange={(e) => setFormData({ ...formData, title_hi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" placeholder="श्री गणेश आरती" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title (English) *</label>
                  <input value={formData.title_en} onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" placeholder="Shri Ganesh Aarti" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sub-category</label>
                  <select value={formData.subcategory} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm">
                    {AARTI_SUBCATEGORIES.filter(s => s.value).map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deity (Hindi)</label>
                  <input value={formData.deity_hi} onChange={(e) => setFormData({ ...formData, deity_hi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="गणेश" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deity (English)</label>
                  <input value={formData.deity} onChange={(e) => setFormData({ ...formData, deity: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="Ganesha" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Music Type</label>
                  <input value={formData.music_type} onChange={(e) => setFormData({ ...formData, music_type: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="Traditional harmonium" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Best Occasion</label>
                  <input value={formData.best_occasion} onChange={(e) => setFormData({ ...formData, best_occasion: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="Wednesday, Chaturthi" />
                </div>
              </div>

              {/* Full Text Content */}
              <div>
                <label className="block text-sm font-medium mb-1">Full Aarti Text</label>
                <textarea value={formData.full_text} onChange={(e) => setFormData({ ...formData, full_text: e.target.value })} rows={8} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#E95A34]" placeholder="Enter complete aarti text here..." />
              </div>

              {/* Audio & Video Upload */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Audio URL</label>
                  <input value={formData.audio_url} onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Video URL</label>
                  <input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="https://youtube.com/..." />
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium mb-2">Supported Languages</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleLanguage(lang.code)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        formData.supported_languages.includes(lang.code)
                          ? 'bg-[#E95A34] text-white'
                          : 'bg-[#F3EDEA] text-[#7A8690] hover:bg-[#E8E4E1]'
                      }`}
                    >
                      {formData.supported_languages.includes(lang.code) && <Check size={14} />}
                      {lang.label} <span className="text-xs opacity-75">({lang.label_native})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1] sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white text-sm font-medium rounded-lg" data-testid="save-aarti-btn">
                {editItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1] sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{viewItem.title_hi}</h3>
                <p className="text-sm text-[#7A8690]">{viewItem.title_en}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[#F3EDEA]">
                <div className="flex-1">
                  <p className="text-xs text-[#7A8690]">Deity: <span className="font-medium text-[#374652]">{viewItem.deity_hi || viewItem.deity}</span></p>
                  <p className="text-xs text-[#7A8690]">Music: <span className="font-medium text-[#374652]">{viewItem.music_type}</span></p>
                  <p className="text-xs text-[#7A8690]">Occasion: <span className="font-medium text-[#374652]">{viewItem.best_occasion}</span></p>
                </div>
                {viewItem.audio_url && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#FEF0EC] text-[#E95A34] rounded-lg text-sm font-medium hover:bg-[#FDDDD4]">
                    <Play size={16} /> Play Audio
                  </button>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Full Text</h4>
                <div className="bg-[#F8F3F1] rounded-lg p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {viewItem.full_text || 'No content yet'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Editor Drawer (Aarti — no Beginner/Expert toggle) */}
      <BhaktiEditorDrawer
        api={api}
        itemId={drawerItemId}
        category="aarti"
        open={!!drawerItemId}
        onClose={() => {
          setDrawerItemId(null);
          if (location.search.includes('edit=')) navigate(location.pathname, { replace: true });
        }}
        onChange={() => fetchItems()}
      />
    </div>
  );
}
