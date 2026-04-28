import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, Edit, Trash2, Eye, MoreHorizontal, X, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'chalisa', label: 'Chalisa' },
  { value: 'vedic_mantra', label: 'Vedic Mantras' },
  { value: 'ashtakam', label: 'Ashtakam' },
  { value: 'sahasranama', label: 'Sahasranama' },
  { value: 'nama_ramayanam', label: 'Nama Ramayanam' },
];

const STATUSES = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default function ContentManagerPage() {
  const { api, user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    category: 'chalisa', title_hi: '', title_en: '', deity: '', deity_hi: '',
    description_hi: '', description_en: '', tags: [],
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      const { data } = await api.get(`/content/items?${params.toString()}`);
      let filtered = data.items || [];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(i => i.title_en?.toLowerCase().includes(q) || i.title_hi?.includes(q));
      }
      setItems(filtered);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [category, status]);

  const handleSearch = () => fetchItems();

  const openCreate = () => {
    setEditItem(null);
    setFormData({ category: 'chalisa', title_hi: '', title_en: '', deity: '', deity_hi: '', description_hi: '', description_en: '', tags: [] });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      category: item.category || 'chalisa',
      title_hi: item.title_hi || '', title_en: item.title_en || '',
      deity: item.deity || '', deity_hi: item.deity_hi || '',
      description_hi: item.description_hi || '', description_en: item.description_en || '',
      tags: item.tags || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await api.put(`/content/items/${editItem._id}`, formData);
      } else {
        await api.post('/content/items', formData);
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/content/items/${id}/status`, { status: newStatus });
      fetchItems();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/content/items/${id}`);
      fetchItems();
    } catch (err) {
      alert('Error deleting');
    }
  };

  return (
    <div className="space-y-6" data-testid="content-manager-page">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Manage</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Content Manager</h1>
          <p className="text-sm text-[#7A8690] mt-1">{total} items total</p>
        </div>
        {user?.role !== 'moderator' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm transition-colors" data-testid="create-content-btn">
            <Plus size={18} /> Add Content
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 animate-fade-in">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#989EA4]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search content..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34] focus:border-[#E95A34]"
            data-testid="content-search-input"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="category-filter">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="status-filter">
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F3EDEA]">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Title</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Category</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Deity</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Verses</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Status</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[#E8E4E1]">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-[#F3EDEA] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#989EA4]">No content found</td></tr>
              ) : items.map((item) => (
                <tr key={item._id} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1] transition-colors" data-testid={`content-row-${item._id}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[#374652]">{item.title_en}</p>
                    <p className="text-xs text-[#7A8690]">{item.title_hi}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#FEF0EC] text-[#D08465] font-medium capitalize">{item.category?.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#7A8690]">{item.deity || '-'}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium">{item.total_verses || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item._id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${
                        item.status === 'published' ? 'bg-green-50 text-green-700' :
                        item.status === 'draft' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}
                      disabled={user?.role === 'moderator'}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34] transition-colors" data-testid={`edit-btn-${item._id}`}>
                        <Edit size={16} />
                      </button>
                      {user?.role === 'super_admin' && (
                        <button onClick={() => handleDelete(item._id)} className="p-1.5 hover:bg-red-50 rounded-md text-[#7A8690] hover:text-red-600 transition-colors" data-testid={`delete-btn-${item._id}`}>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" data-testid="content-modal">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editItem ? 'Edit Content' : 'Add Content'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]">
                  {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title (English)</label>
                  <input value={formData.title_en} onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="content-title-en" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title (Hindi)</label>
                  <input value={formData.title_hi} onChange={(e) => setFormData({ ...formData, title_hi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="content-title-hi" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Deity (English)</label>
                  <input value={formData.deity} onChange={(e) => setFormData({ ...formData, deity: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deity (Hindi)</label>
                  <input value={formData.deity_hi} onChange={(e) => setFormData({ ...formData, deity_hi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (English)</label>
                <textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} rows={2} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Hindi)</label>
                <textarea value={formData.description_hi} onChange={(e) => setFormData({ ...formData, description_hi: e.target.value })} rows={2} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white text-sm font-medium rounded-lg transition-colors" data-testid="save-content-btn">
                {editItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
