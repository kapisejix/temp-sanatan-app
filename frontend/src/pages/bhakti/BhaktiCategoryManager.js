import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Scroll, Plus, Search, Edit, Trash2, Eye, Download, Volume2, X, Check, Play, Layers, FileText, Upload, Globe } from 'lucide-react';
import LivePreviewModal from '../../components/LivePreviewModal';
import BhaktiEditorDrawer from '../BhaktiEditorDrawer';

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

// Configuration for each bhakti category
const CATEGORY_CONFIG = {
  namavali: {
    title: 'Namavali Manager',
    title_hi: 'नामावली संग्रह',
    description: '22 deity groups - 108 names format',
    category: 'namavali',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Names',
    subcategories: [
      { value: '', label: 'All Deities' },
      { value: 'ganesha', label: 'Ganesha (108)', label_hi: 'गणेश' },
      { value: 'shiva', label: 'Shiva (108)', label_hi: 'शिव' },
      { value: 'vishnu', label: 'Vishnu (108)', label_hi: 'विष्णु' },
      { value: 'lakshmi', label: 'Lakshmi (108)', label_hi: 'लक्ष्मी' },
      { value: 'hanuman', label: 'Hanuman (108)', label_hi: 'हनुमान' },
      { value: 'durga', label: 'Durga (108)', label_hi: 'दुर्गा' },
      { value: 'krishna', label: 'Krishna (108)', label_hi: 'कृष्ण' },
      { value: 'rama', label: 'Rama (108)', label_hi: 'राम' },
      { value: 'saraswati', label: 'Saraswati (108)', label_hi: 'सरस्वती' },
      { value: 'surya', label: 'Surya (108)', label_hi: 'सूर्य' },
      { value: 'kartikeya', label: 'Kartikeya (108)', label_hi: 'कार्तिकेय' },
      { value: 'devi', label: 'Devi (Various)', label_hi: 'देवी' },
    ],
  },
  sahasranama: {
    title: 'Sahasranama Manager',
    title_hi: 'सहस्रनाम संग्रह',
    description: '7 groups - 1000 names format',
    category: 'sahasranama',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Names',
    subcategories: [
      { value: '', label: 'All' },
      { value: 'vishnu', label: 'Vishnu Sahasranama', label_hi: 'विष्णु सहस्रनाम' },
      { value: 'shiva', label: 'Shiva Sahasranama', label_hi: 'शिव सहस्रनाम' },
      { value: 'lalita', label: 'Lalita Sahasranama', label_hi: 'ललिता सहस्रनाम' },
      { value: 'ganesha', label: 'Ganesha Sahasranama', label_hi: 'गणेश सहस्रनाम' },
      { value: 'lakshmi', label: 'Lakshmi Sahasranama', label_hi: 'लक्ष्मी सहस्रनाम' },
      { value: 'hanuman', label: 'Hanuman Sahasranama', label_hi: 'हनुमान सहस्रनाम' },
      { value: 'surya', label: 'Surya Sahasranama', label_hi: 'सूर्य सहस्रनाम' },
    ],
  },
  vedic_mantra: {
    title: 'Vedic Mantra Manager',
    title_hi: 'वैदिक मन्त्र संग्रह',
    description: '15 deity groups + special mantras',
    category: 'vedic_mantra',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Mantras',
    subcategories: [
      { value: '', label: 'All Mantras' },
      { value: 'ganesha', label: 'Ganesha Mantras', label_hi: 'गणेश मन्त्र' },
      { value: 'shiva', label: 'Shiva Mantras', label_hi: 'शिव मन्त्र' },
      { value: 'vishnu', label: 'Vishnu Mantras', label_hi: 'विष्णु मन्त्र' },
      { value: 'devi', label: 'Devi Mantras', label_hi: 'देवी मन्त्र' },
      { value: 'gayatri', label: 'Gayatri Mantras', label_hi: 'गायत्री मन्त्र' },
      { value: 'surya', label: 'Surya Mantras', label_hi: 'सूर्य मन्त्र' },
      { value: 'hanuman', label: 'Hanuman Mantras', label_hi: 'हनुमान मन्त्र' },
      { value: 'lakshmi', label: 'Lakshmi Mantras', label_hi: 'लक्ष्मी मन्त्र' },
      { value: 'saraswati', label: 'Saraswati Mantras', label_hi: 'सरस्वती मन्त्र' },
      { value: 'durga', label: 'Durga Mantras', label_hi: 'दुर्गा मन्त्र' },
      { value: 'navgraha', label: 'Navgraha Mantras', label_hi: 'नवग्रह मन्त्र' },
      { value: 'mrityunjaya', label: 'Mrityunjaya Mantra', label_hi: 'मृत्युंजय मन्त्र' },
      { value: 'special', label: 'Special Mantras', label_hi: 'विशेष मन्त्र' },
    ],
  },
  stotram: {
    title: 'Stotram Manager',
    title_hi: 'स्तोत्रम् संग्रह',
    description: '22+ groups - Shloka format',
    category: 'stotram',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Shlokas',
    subcategories: [
      { value: '', label: 'All Stotrams' },
      { value: 'ganesha', label: 'Ganesha Stotrams', label_hi: 'गणेश स्तोत्र' },
      { value: 'shiva', label: 'Shiva Stotrams', label_hi: 'शिव स्तोत्र' },
      { value: 'vishnu', label: 'Vishnu Stotrams', label_hi: 'विष्णु स्तोत्र' },
      { value: 'devi', label: 'Devi Stotrams', label_hi: 'देवी स्तोत्र' },
      { value: 'lakshmi', label: 'Lakshmi Stotrams', label_hi: 'लक्ष्मी स्तोत्र' },
      { value: 'hanuman', label: 'Hanuman Stotrams', label_hi: 'हनुमान स्तोत्र' },
      { value: 'krishna', label: 'Krishna Stotrams', label_hi: 'कृष्ण स्तोत्र' },
      { value: 'rama', label: 'Rama Stotrams', label_hi: 'राम स्तोत्र' },
      { value: 'surya', label: 'Surya Stotrams', label_hi: 'सूर्य स्तोत्र' },
    ],
  },
  suktam: {
    title: 'Suktam Manager',
    title_hi: 'सूक्तम् संग्रह',
    description: '9 suktams - Vedic shloka format',
    category: 'suktam',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Mantras',
    subcategories: [
      { value: '', label: 'All Suktams' },
      { value: 'purusha', label: 'Purusha Suktam', label_hi: 'पुरुष सूक्तम्' },
      { value: 'narayana', label: 'Narayana Suktam', label_hi: 'नारायण सूक्तम्' },
      { value: 'shri', label: 'Shri Suktam', label_hi: 'श्री सूक्तम्' },
      { value: 'durga', label: 'Durga Suktam', label_hi: 'दुर्गा सूक्तम्' },
      { value: 'rudram', label: 'Rudram', label_hi: 'रुद्रम्' },
      { value: 'medha', label: 'Medha Suktam', label_hi: 'मेधा सूक्तम्' },
      { value: 'bhu', label: 'Bhu Suktam', label_hi: 'भू सूक्तम्' },
      { value: 'nila', label: 'Nila Suktam', label_hi: 'नीला सूक्तम्' },
      { value: 'manyu', label: 'Manyu Suktam', label_hi: 'मन्यु सूक्तम्' },
    ],
  },
  ashtakam: {
    title: 'Ashtakam Manager',
    title_hi: 'अष्टकम् संग्रह',
    description: '7 deity groups - 8-verse format',
    category: 'ashtakam',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Shlokas (8)',
    subcategories: [
      { value: '', label: 'All Ashtakams' },
      { value: 'ganesha', label: 'Ganesha Ashtakam', label_hi: 'गणेश अष्टकम्' },
      { value: 'shiva', label: 'Shiva Ashtakam', label_hi: 'शिव अष्टकम्' },
      { value: 'vishnu', label: 'Vishnu Ashtakam', label_hi: 'विष्णु अष्टकम्' },
      { value: 'devi', label: 'Devi Ashtakam', label_hi: 'देवी अष्टकम्' },
      { value: 'krishna', label: 'Krishna Ashtakam', label_hi: 'कृष्ण अष्टकम्' },
      { value: 'rama', label: 'Rama Ashtakam', label_hi: 'राम अष्टकम्' },
      { value: 'hanuman', label: 'Hanuman Ashtakam', label_hi: 'हनुमान अष्टकम्' },
    ],
  },
  shatkam: {
    title: 'Shatkam Manager',
    title_hi: 'षट्कम् संग्रह',
    description: '6-verse format compositions',
    category: 'shatkam',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Shlokas (6)',
    subcategories: [
      { value: '', label: 'All Shatkams' },
      { value: 'nirvana', label: 'Nirvana Shatkam', label_hi: 'निर्वाण षट्कम्' },
      { value: 'atma', label: 'Atma Shatkam', label_hi: 'आत्म षट्कम्' },
      { value: 'shiva', label: 'Shiva Shatkam', label_hi: 'शिव षट्कम्' },
      { value: 'devi', label: 'Devi Shatkam', label_hi: 'देवी षट्कम्' },
    ],
  },
  kavacham: {
    title: 'Kavacham Manager',
    title_hi: 'कवचम् संग्रह',
    description: '2 groups (Devta+Devi) - Protection verses',
    category: 'kavacham',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Shlokas',
    subcategories: [
      { value: '', label: 'All Kavachams' },
      { value: 'devta', label: 'Devta Kavacham', label_hi: 'देवता कवचम्' },
      { value: 'devi', label: 'Devi Kavacham', label_hi: 'देवी कवचम्' },
      { value: 'narasimha', label: 'Narasimha Kavacham', label_hi: 'नृसिंह कवचम्' },
      { value: 'narayan', label: 'Narayan Kavacham', label_hi: 'नारायण कवचम्' },
      { value: 'bhairav', label: 'Bhairav Kavacham', label_hi: 'भैरव कवचम्' },
      { value: 'lakshmi', label: 'Lakshmi Kavacham', label_hi: 'लक्ष्मी कवचम्' },
      { value: 'sita', label: 'Sita Kavacham', label_hi: 'सीता कवचम्' },
      { value: 'sheetla', label: 'Sheetla Kavacham', label_hi: 'शीतला कवचम्' },
    ],
  },
  nam_ramayanam: {
    title: 'Nam Ramayanam Manager',
    title_hi: 'नाम रामायणम्',
    description: '108 names + Ek Shloki Ramayanam',
    category: 'nam_ramayanam',
    icon: 'Scroll',
    hasBeginner: true,
    hasExpert: true,
    verseLabel: 'Names',
    subcategories: [
      { value: '', label: 'All' },
      { value: 'nam_ramayanam', label: 'Nam Ramayanam (108)', label_hi: 'नाम रामायणम्' },
      { value: 'ek_shloki', label: 'Ek Shloki Ramayanam', label_hi: 'एक श्लोकी रामायणम्' },
    ],
  },
};

export default function BhaktiCategoryManager({ categoryKey }) {
  const config = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.namavali;
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
  const [viewMode, setViewMode] = useState('beginner');
  const [activeTab, setActiveTab] = useState('hi');
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewItemId, setPreviewItemId] = useState(null);
  const [multiLangContent, setMultiLangContent] = useState({});

  const [formData, setFormData] = useState({
    title_hi: '', title_en: '', deity: '', deity_hi: '', subcategory: '',
    description_hi: '', description_en: '', audio_url: '', video_url: '',
    supported_languages: ['hi', 'en', 'sa'], tags: [],
    verses: [], full_text: '', audio_timestamps: []
  });

  const [currentVerse, setCurrentVerse] = useState({
    verse_num: 1, verse_type: 'shloka', sanskrit_text: '', transliteration: '',
    meanings: { hi: '', en: '', sa: '' }, word_breakdown: []
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: config.category });
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

  useEffect(() => { fetchItems(); }, [subcategory, status, categoryKey]);

  const handleSelectAll = (e) => {
    setSelectedItems(e.target.checked ? items.map(i => i._id) : []);
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) return alert('Select items first');
    try {
      if (action === 'delete') {
        if (!window.confirm(`Delete ${selectedItems.length} items?`)) return;
        await api.post('/bhakti/bulk-delete', { ids: selectedItems });
      } else if (action === 'export') {
        const { data } = await api.post('/bhakti/bulk-export', { ids: selectedItems });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${config.category}_export.json`; a.click();
      } else if (action === 'generate_tts') {
        await api.post('/bhakti/bulk-tts', { ids: selectedItems, category: config.category });
        alert('TTS generation started');
      }
      fetchItems();
      setSelectedItems([]);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error');
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setFormData({
      title_hi: '', title_en: '', deity: '', deity_hi: '', subcategory: config.subcategories[1]?.value || '',
      description_hi: '', description_en: '', audio_url: '', video_url: '',
      supported_languages: ['hi', 'en', 'sa'], tags: [], verses: [], full_text: '', audio_timestamps: []
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    // Open the unified Bhakti Editor drawer (5 tabs + Beginner/Expert + per-language meanings)
    setDrawerItemId(item._id);
  };

  // Auto-open drawer when URL has ?edit=<id> (used by Import Wizard redirect)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eid = params.get('edit');
    if (eid && eid !== drawerItemId) setDrawerItemId(eid);
    // eslint-disable-next-line
  }, [location.search]);

  const openView = async (item) => {
    setPreviewItemId(item._id);
    setShowLivePreview(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData, category: config.category };
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
    if (!window.confirm('Delete this item?')) return;
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
      verse_num: formData.verses.length + 2, verse_type: 'shloka',
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
    <div className="space-y-6" data-testid={`${config.category}-manager-page`}>
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Bhakti Content</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{config.title}</h1>
          <p className="text-sm text-[#7A8690] mt-1">{config.title_hi} - {config.description}</p>
        </div>
        {user?.role !== 'moderator' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm transition-colors" data-testid={`create-${config.category}-btn`}>
            <Plus size={18} /> Add {config.title.split(' ')[0]}
          </button>
        )}
      </div>

      {/* Sub-category Tabs */}
      <div className="flex flex-wrap gap-2 animate-fade-in">
        {config.subcategories.map(sub => (
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchItems()} placeholder={`Search ${config.title.toLowerCase()}...`} className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]" />
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
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">{config.verseLabel}</th>
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
              <tr><td colSpan={7} className="text-center py-12 text-[#989EA4]">No items found</td></tr>
            ) : items.map((item) => (
              <tr key={item._id} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1] transition-colors">
                <td className="px-4 py-3"><input type="checkbox" checked={selectedItems.includes(item._id)} onChange={() => handleSelectItem(item._id)} className="rounded" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center"><Scroll size={18} className="text-[#E95A34]" /></div>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1] sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editItem ? 'Edit' : 'Add'} {config.title.split(' ')[0]}</h3>
                {config.hasBeginner && (
                  <div className="flex bg-[#F3EDEA] rounded-lg p-0.5">
                    <button onClick={() => setViewMode('beginner')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'beginner' ? 'bg-white text-[#E95A34] shadow-sm' : 'text-[#7A8690]'}`}>
                      <Layers size={14} className="inline mr-1" /> Beginner
                    </button>
                    <button onClick={() => setViewMode('expert')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'expert' ? 'bg-white text-[#E95A34] shadow-sm' : 'text-[#7A8690]'}`}>
                      <FileText size={14} className="inline mr-1" /> Expert
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title (Hindi) *</label>
                  <input value={formData.title_hi} onChange={(e) => setFormData({ ...formData, title_hi: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title (English) *</label>
                  <input value={formData.title_en} onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sub-category</label>
                  <select value={formData.subcategory} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm">
                    {config.subcategories.filter(s => s.value).map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
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
              {viewMode === 'beginner' && config.hasBeginner ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Verse-by-Verse Entry</h4>
                    <span className="text-xs text-[#7A8690]">{formData.verses.length} {config.verseLabel.toLowerCase()}</span>
                  </div>

                  {formData.verses.map((verse, idx) => (
                    <div key={idx} className="bg-[#F8F3F1] rounded-lg p-4 border border-[#E8E4E1]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#E95A34]">#{verse.verse_num}</span>
                        <button onClick={() => removeVerse(idx)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                      </div>
                      <p className="text-sm font-medium text-[#374652] mb-1">{verse.sanskrit_text}</p>
                      <p className="text-xs text-[#7A8690] italic">{verse.transliteration}</p>
                    </div>
                  ))}

                  <div className="border-2 border-dashed border-[#E8E4E1] rounded-lg p-4 space-y-3">
                    <input value={currentVerse.sanskrit_text} onChange={(e) => setCurrentVerse({ ...currentVerse, sanskrit_text: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm" placeholder="Sanskrit/Hindi text..." />
                    <input value={currentVerse.transliteration} onChange={(e) => setCurrentVerse({ ...currentVerse, transliteration: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm" placeholder="Transliteration..." />
                    
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
                  <textarea value={formData.full_text} onChange={(e) => setFormData({ ...formData, full_text: e.target.value })} rows={12} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm font-mono" placeholder="Paste complete text here..." />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Audio URL</label>
                      <input value={formData.audio_url} onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Video URL</label>
                      <input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* Supported Languages — Dynamic Tabs */}
              <div>
                <label className="block text-sm font-medium mb-2">Supported Languages — Select to add content</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {LANGUAGES.map(lang => (
                    <button key={lang.code} type="button" onClick={() => { toggleLanguage(lang.code); if (!formData.supported_languages.includes(lang.code)) setActiveTab(lang.code); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${formData.supported_languages.includes(lang.code) ? 'bg-[#E95A34] text-white' : 'bg-[#F3EDEA] text-[#7A8690]'}`} data-testid={`lang-toggle-${lang.code}`}>
                      {formData.supported_languages.includes(lang.code) && <Check size={14} />}
                      {lang.label} <span className="text-xs opacity-75">{lang.label_native}</span>
                    </button>
                  ))}
                </div>

                {/* Dynamic Language Content Tabs */}
                {formData.supported_languages.length > 0 && (
                  <div className="bg-[#F8F3F1] rounded-lg border border-[#E8E4E1] overflow-hidden">
                    <div className="flex border-b border-[#E8E4E1] bg-white overflow-x-auto">
                      {formData.supported_languages.map(langCode => {
                        const langObj = LANGUAGES.find(l => l.code === langCode);
                        return (
                          <button
                            key={langCode}
                            onClick={() => setActiveTab(langCode)}
                            data-testid={`lang-tab-${langCode}`}
                            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                              activeTab === langCode ? 'border-[#E95A34] text-[#E95A34] bg-[#FEF0EC]' : 'border-transparent text-[#7A8690] hover:text-[#374652]'
                            }`}
                          >
                            <Globe size={12} className="inline mr-1" />
                            {langObj?.label || langCode.toUpperCase()} ({langObj?.label_native || ''})
                          </button>
                        );
                      })}
                    </div>
                    <div className="p-4">
                      <label className="block text-xs font-medium text-[#7A8690] mb-1">
                        Description in {LANGUAGES.find(l => l.code === activeTab)?.label || activeTab}
                      </label>
                      <textarea
                        value={activeTab === 'hi' ? formData.description_hi : activeTab === 'en' ? formData.description_en : (multiLangContent[activeTab]?.description || '')}
                        onChange={(e) => {
                          if (activeTab === 'hi') setFormData({ ...formData, description_hi: e.target.value });
                          else if (activeTab === 'en') setFormData({ ...formData, description_en: e.target.value });
                          else setMultiLangContent(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], description: e.target.value } }));
                        }}
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm"
                        placeholder={`Description in ${LANGUAGES.find(l => l.code === activeTab)?.label || activeTab}...`}
                      />
                      <label className="block text-xs font-medium text-[#7A8690] mb-1 mt-3">
                        Full Content Text in {LANGUAGES.find(l => l.code === activeTab)?.label || activeTab}
                      </label>
                      <textarea
                        value={activeTab === 'hi' ? (formData.full_text || '') : (multiLangContent[activeTab]?.full_text || '')}
                        onChange={(e) => {
                          if (activeTab === 'hi') setFormData({ ...formData, full_text: e.target.value });
                          else setMultiLangContent(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], full_text: e.target.value } }));
                        }}
                        rows={6}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm font-mono"
                        placeholder={`Paste full content in ${LANGUAGES.find(l => l.code === activeTab)?.label || activeTab}...`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between gap-3 px-6 py-4 border-t border-[#E8E4E1] sticky bottom-0 bg-white">
              <button onClick={() => { setShowModal(false); if (editItem) { setPreviewItemId(editItem._id); setShowLivePreview(true); } }} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-[#E95A34] hover:bg-[#FEF0EC] rounded-lg" data-testid="preview-from-edit-btn">
                <Eye size={16} /> Live Preview
              </button>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white text-sm font-medium rounded-lg" data-testid="save-content-btn">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {showLivePreview && previewItemId && (
        <LivePreviewModal itemId={previewItemId} onClose={() => { setShowLivePreview(false); setPreviewItemId(null); }} />
      )}

      {/* Unified Editor Drawer */}
      <BhaktiEditorDrawer
        api={api}
        itemId={drawerItemId}
        category={config.category}
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

// Export individual page components
export const NamavaliManagerPage = () => <BhaktiCategoryManager categoryKey="namavali" />;
export const SahasranamaManagerPage = () => <BhaktiCategoryManager categoryKey="sahasranama" />;
export const VedicMantraManagerPage = () => <BhaktiCategoryManager categoryKey="vedic_mantra" />;
export const StotramManagerPage = () => <BhaktiCategoryManager categoryKey="stotram" />;
export const SuktamManagerPage = () => <BhaktiCategoryManager categoryKey="suktam" />;
export const AshtakamManagerPage = () => <BhaktiCategoryManager categoryKey="ashtakam" />;
export const ShatkamManagerPage = () => <BhaktiCategoryManager categoryKey="shatkam" />;
export const KavachamManagerPage = () => <BhaktiCategoryManager categoryKey="kavacham" />;
export const NamRamayanamManagerPage = () => <BhaktiCategoryManager categoryKey="nam_ramayanam" />;
