import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText, BookOpen, Music, Clock3, CheckCircle2, AlertCircle,
  Save, Loader2, ArrowLeft, Plus, X, Trash2, Edit3, Upload, Play,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'hi', label: 'हिन्दी', label_en: 'Hindi' },
  { code: 'en', label: 'English', label_en: 'English' },
  { code: 'sa', label: 'संस्कृत', label_en: 'Sanskrit' },
  { code: 'mr', label: 'मराठी', label_en: 'Marathi' },
  { code: 'gu', label: 'ગુજરાતી', label_en: 'Gujarati' },
  { code: 'ta', label: 'தமிழ்', label_en: 'Tamil' },
  { code: 'te', label: 'తెలుగు', label_en: 'Telugu' },
  { code: 'bn', label: 'বাংলা', label_en: 'Bengali' },
];

const TABS = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'verses', label: 'Verses', icon: BookOpen },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'sync', label: 'Audio Sync', icon: Clock3 },
  { id: 'publish', label: 'Publish', icon: CheckCircle2 },
];

function fmtMs(ms) {
  if (ms == null) return '–';
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function BhaktiUnifiedEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const search = new URLSearchParams(window.location.search);

  const [activeTab, setActiveTab] = useState(search.get('tab') || 'content');
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [publishCheck, setPublishCheck] = useState(null);

  // ---- Fetch item ----
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/content/items/${id}`);
        setItem(data);
      } catch (e) {
        setError('Item not found. It may have been deleted.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, api]);

  // Sync active tab into URL so refresh keeps place
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState(null, '', url.toString());
  }, [activeTab]);

  const refreshItem = async () => {
    const { data } = await api.get(`/content/items/${id}`);
    setItem(data);
  };

  const loadPublishCheck = async () => {
    try {
      const { data } = await api.get(`/content/items/${id}/publish-check`);
      setPublishCheck(data);
    } catch {
      setPublishCheck(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'publish') loadPublishCheck();
  }, [activeTab]); // eslint-disable-line

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="bhakti-editor-loading">
        <Loader2 className="animate-spin text-[#E95A34]" size={32} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8 text-center" data-testid="bhakti-editor-not-found">
        <AlertCircle className="mx-auto text-red-500 mb-3" size={32} />
        <p className="text-[#374652]">{error || 'Item not found'}</p>
        <button onClick={() => navigate('/admin/dashboard')} className="mt-4 px-4 py-2 bg-[#E95A34] text-white rounded-lg">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="bhakti-unified-editor">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[#F3EDEA] rounded-md"
            data-testid="editor-back-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-0.5">
              {item.category?.toUpperCase() || 'BHAKTI'}
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
              {item.title_hi || item.title_en || 'Untitled'}
            </h1>
            <p className="text-xs text-[#7A8690] mt-0.5">
              Status: <span className={`font-semibold ${item.status === 'published' ? 'text-green-700' : 'text-amber-700'}`}>
                {item.status || 'draft'}
              </span>
              {item.total_verses != null && ` · ${item.total_verses} verses`}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm" data-testid="editor-error">
          <AlertCircle size={16} /> {error}
          <button className="ml-auto text-red-600" onClick={() => setError('')}>×</button>
        </div>
      )}
      {status && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm" data-testid="editor-status">
          <CheckCircle2 size={16} /> {status}
          <button className="ml-auto text-green-600" onClick={() => setStatus('')}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E8E4E1] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            data-testid={`editor-tab-${t.id}`}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-[#E95A34] text-[#E95A34]'
                : 'border-transparent text-[#7A8690] hover:text-[#374652]'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'content' && (
          <ContentTab
            item={item}
            saving={saving}
            setSaving={setSaving}
            onSaved={(nextItem) => { setItem(nextItem); setStatus('Content saved'); }}
            setError={setError}
            api={api}
          />
        )}
        {activeTab === 'verses' && (
          <VersesTab
            item={item}
            api={api}
            onChanged={refreshItem}
            setError={setError}
            setStatus={setStatus}
          />
        )}
        {activeTab === 'audio' && (
          <AudioTab
            item={item}
            api={api}
            onChanged={refreshItem}
            setError={setError}
            setStatus={setStatus}
          />
        )}
        {activeTab === 'sync' && (
          <SyncTab
            item={item}
            api={api}
            onChanged={refreshItem}
            setError={setError}
            setStatus={setStatus}
          />
        )}
        {activeTab === 'publish' && (
          <PublishTab
            item={item}
            api={api}
            check={publishCheck}
            reload={loadPublishCheck}
            onStatusChanged={refreshItem}
            setError={setError}
            setStatus={setStatus}
          />
        )}
      </div>
    </div>
  );
}

/* ===== Tab 1: Content (title / deity / description / languages) ===== */
function ContentTab({ item, saving, setSaving, onSaved, setError, api }) {
  const [form, setForm] = useState({
    title_hi: item.title_hi || '',
    title_en: item.title_en || '',
    title_sa: item.title_sa || '',
    deity: item.deity || '',
    deity_hi: item.deity_hi || '',
    description_hi: item.description_hi || '',
    description_en: item.description_en || '',
    thumbnail_url: item.thumbnail_url || '',
    supported_languages: item.supported_languages || ['hi', 'en'],
    languages: item.languages || {},
  });
  const [langTab, setLangTab] = useState((item.supported_languages || ['hi'])[0] || 'hi');

  const toggleLang = (code) => {
    setForm((f) => {
      const has = f.supported_languages.includes(code);
      const next = has
        ? f.supported_languages.filter((x) => x !== code)
        : [...f.supported_languages, code];
      return { ...f, supported_languages: next };
    });
  };

  const setLangField = (code, field, value) => {
    setForm((f) => ({
      ...f,
      languages: {
        ...(f.languages || {}),
        [code]: { ...((f.languages || {})[code] || {}), [field]: value },
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/content/items/${item._id}`, form);
      onSaved(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 space-y-5" data-testid="content-tab">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Title (Hindi)" testid="title-hi-input"
               value={form.title_hi}
               onChange={(v) => setForm({ ...form, title_hi: v })} />
        <Field label="Title (English)" testid="title-en-input"
               value={form.title_en}
               onChange={(v) => setForm({ ...form, title_en: v })} />
        <Field label="Title (Sanskrit)" testid="title-sa-input"
               value={form.title_sa}
               onChange={(v) => setForm({ ...form, title_sa: v })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Deity (Hindi)" value={form.deity_hi}
               onChange={(v) => setForm({ ...form, deity_hi: v })} />
        <Field label="Deity (English)" value={form.deity}
               onChange={(v) => setForm({ ...form, deity: v })} />
        <Field label="Thumbnail URL" value={form.thumbnail_url}
               onChange={(v) => setForm({ ...form, thumbnail_url: v })} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#374652] mb-2">Supported Languages</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => {
            const on = form.supported_languages.includes(l.code);
            return (
              <button
                key={l.code}
                onClick={() => toggleLang(l.code)}
                data-testid={`lang-toggle-${l.code}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  on ? 'bg-[#E95A34] text-white' : 'bg-[#F3EDEA] text-[#7A8690] hover:bg-[#E8E4E1]'
                }`}
              >
                {l.label_en} <span className="opacity-75 ml-1">{l.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-language title/description (hybrid multilingual) */}
      {form.supported_languages.length > 0 && (
        <div className="bg-[#F8F3F1] rounded-lg border border-[#E8E4E1] overflow-hidden">
          <div className="flex border-b border-[#E8E4E1] bg-white overflow-x-auto">
            {form.supported_languages.map((code) => {
              const l = LANGUAGES.find((x) => x.code === code) || { code, label_en: code };
              return (
                <button
                  key={code}
                  onClick={() => setLangTab(code)}
                  data-testid={`per-lang-tab-${code}`}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    langTab === code ? 'border-[#E95A34] text-[#E95A34] bg-[#FEF0EC]' : 'border-transparent text-[#7A8690]'
                  }`}
                >
                  {l.label_en}
                </button>
              );
            })}
          </div>
          <div className="p-4 space-y-3">
            {/* Hindi & English map to legacy flat fields for back-compat */}
            {langTab === 'hi' ? (
              <Field label="Description (Hindi)" textarea value={form.description_hi}
                     onChange={(v) => setForm({ ...form, description_hi: v })} />
            ) : langTab === 'en' ? (
              <Field label="Description (English)" textarea value={form.description_en}
                     onChange={(v) => setForm({ ...form, description_en: v })} />
            ) : (
              <>
                <Field label={`Title (${langTab})`} value={(form.languages?.[langTab] || {}).title || ''}
                       onChange={(v) => setLangField(langTab, 'title', v)} />
                <Field label={`Description (${langTab})`} textarea
                       value={(form.languages?.[langTab] || {}).description || ''}
                       onChange={(v) => setLangField(langTab, 'description', v)} />
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={save}
          disabled={saving}
          data-testid="content-save-btn"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E95A34] text-white rounded-lg font-medium hover:bg-[#d24e2c] disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Content
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea, testid }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#374652] mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          data-testid={testid}
          className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"
        />
      )}
    </div>
  );
}

/* ===== Tab 2: Verses (list + inline add/edit/delete) ===== */
function VersesTab({ item, api, onChanged, setError, setStatus }) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ sanskrit_text: '', transliteration: '', verse_type: 'shloka' });
  const [addOpen, setAddOpen] = useState(false);
  const [newVerse, setNewVerse] = useState({ verse_num: 1, verse_type: 'shloka', sanskrit_text: '', transliteration: '' });
  const autoOpened = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/content/items/${item._id}/verses`);
      setVerses(data || []);
      // Auto-open first verse in edit mode (only once per mount)
      if (!autoOpened.current && (data || []).length > 0) {
        autoOpened.current = true;
        const first = data[0];
        setEditingId(first._id);
        setForm({
          sanskrit_text: first.sanskrit_text || '',
          transliteration: first.transliteration || '',
          verse_type: first.verse_type || 'shloka',
        });
      } else if (!autoOpened.current) {
        autoOpened.current = true;
        setAddOpen(true);
        setNewVerse((n) => ({ ...n, verse_num: 1 }));
      }
    } catch {
      setError('Failed to load verses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [item._id]);

  const startEdit = (v) => {
    setEditingId(v._id);
    setForm({
      sanskrit_text: v.sanskrit_text || '',
      transliteration: v.transliteration || '',
      verse_type: v.verse_type || 'shloka',
    });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/content/verses/${id}`, form);
      setEditingId(null);
      await load();
      onChanged();
      setStatus('Verse saved');
    } catch {
      setError('Failed to save verse');
    }
  };

  const addVerse = async () => {
    try {
      await api.post(`/content/items/${item._id}/verses`, {
        verse_num: newVerse.verse_num || verses.length + 1,
        verse_type: newVerse.verse_type,
        sanskrit_text: newVerse.sanskrit_text,
        transliteration: newVerse.transliteration,
      });
      setNewVerse({ verse_num: verses.length + 2, verse_type: 'shloka', sanskrit_text: '', transliteration: '' });
      setAddOpen(false);
      await load();
      onChanged();
      setStatus('Verse added');
    } catch {
      setError('Failed to add verse');
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-4 space-y-3" data-testid="verses-tab">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Verses ({verses.length})</h3>
        <button
          onClick={() => setAddOpen((v) => !v)}
          data-testid="add-verse-toggle"
          className="flex items-center gap-1 px-3 py-1.5 bg-[#E95A34] text-white rounded-lg text-sm"
        >
          <Plus size={14} /> Add Verse
        </button>
      </div>

      {addOpen && (
        <div className="border-2 border-dashed border-[#E8E4E1] rounded-lg p-3 space-y-2 bg-[#FEFBF9]" data-testid="verse-add-form">
          <div className="flex gap-2">
            <input type="number" value={newVerse.verse_num}
                   onChange={(e) => setNewVerse({ ...newVerse, verse_num: parseInt(e.target.value) || 1 })}
                   placeholder="#"
                   className="w-16 px-2 py-1.5 border border-[#E8E4E1] rounded text-sm" />
            <select value={newVerse.verse_type}
                    onChange={(e) => setNewVerse({ ...newVerse, verse_type: e.target.value })}
                    className="px-2 py-1.5 border border-[#E8E4E1] rounded text-sm">
              {['shloka', 'chaupai', 'doha', 'mantra', 'stanza', 'name'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <textarea value={newVerse.sanskrit_text}
                    onChange={(e) => setNewVerse({ ...newVerse, sanskrit_text: e.target.value })}
                    placeholder="Sanskrit/Hindi verse text"
                    rows={3}
                    data-testid="new-verse-sanskrit"
                    className="w-full px-3 py-2 border border-[#E8E4E1] rounded-lg text-sm" lang="hi" />
          <input value={newVerse.transliteration}
                 onChange={(e) => setNewVerse({ ...newVerse, transliteration: e.target.value })}
                 placeholder="Transliteration (optional)"
                 className="w-full px-3 py-2 border border-[#E8E4E1] rounded-lg text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 text-sm text-[#7A8690]">Cancel</button>
            <button onClick={addVerse} disabled={!newVerse.sanskrit_text}
                    data-testid="save-new-verse-btn"
                    className="px-3 py-1.5 bg-[#E95A34] text-white text-sm rounded-lg disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {verses.length === 0 && !addOpen && (
        <p className="text-center text-sm text-[#989EA4] py-8">No verses yet. Click "Add Verse" to create the first one.</p>
      )}

      <div className="space-y-2">
        {verses.map((v) => (
          <div key={v._id} className="bg-[#F8F3F1] rounded-lg p-3 border border-[#E8E4E1]" data-testid={`verse-row-${v.verse_num}`}>
            {editingId === v._id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#E95A34]">#{v.verse_num}</span>
                  <select value={form.verse_type} onChange={(e) => setForm({ ...form, verse_type: e.target.value })}
                          className="px-2 py-1 border border-[#E8E4E1] rounded text-xs">
                    {['shloka', 'chaupai', 'doha', 'mantra', 'stanza', 'name'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <textarea value={form.sanskrit_text}
                          onChange={(e) => setForm({ ...form, sanskrit_text: e.target.value })}
                          rows={3}
                          data-testid="verse-edit-sanskrit"
                          className="w-full px-3 py-2 border border-[#E8E4E1] rounded-lg text-sm bg-white" lang="hi" />
                <input value={form.transliteration}
                       onChange={(e) => setForm({ ...form, transliteration: e.target.value })}
                       placeholder="Transliteration"
                       className="w-full px-3 py-2 border border-[#E8E4E1] rounded-lg text-sm bg-white" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-[#7A8690]">Cancel</button>
                  <button onClick={() => saveEdit(v._id)} data-testid={`save-verse-${v.verse_num}`}
                          className="px-3 py-1 bg-[#E95A34] text-white text-xs rounded-lg">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-[#E95A34] bg-white px-2 py-1 rounded">#{v.verse_num}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#374652] whitespace-pre-wrap" lang="hi">{v.sanskrit_text || <em className="text-[#989EA4]">(empty)</em>}</p>
                  {v.transliteration && <p className="text-xs italic text-[#7A8690] mt-1">{v.transliteration}</p>}
                </div>
                <button onClick={() => startEdit(v)} className="p-1.5 hover:bg-white rounded-md" data-testid={`edit-verse-${v.verse_num}`}>
                  <Edit3 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Tab 3: Audio (Primary + Expert variants 1-4) ===== */
function AudioTab({ item, api, onChanged, setError, setStatus }) {
  const [mode, setMode] = useState('primary'); // 'primary' | 'variant'
  const [slot, setSlot] = useState(1);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [syncFile, setSyncFile] = useState(null);
  const [duration, setDuration] = useState('');
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef(null);
  const syncRef = useRef(null);

  const audioSync = item.audio_sync || {};
  const variants = audioSync.variants || [];

  const upload = async () => {
    if (!file) return setError('Select an audio file');
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('audio', file);
      if (mode === 'primary' && syncFile) fd.append('sync_file', syncFile);
      if (duration) fd.append('duration_ms', String(parseInt(duration, 10) * 1000));
      if (mode === 'variant') {
        fd.append('variant_slot', String(slot));
        if (label) fd.append('variant_label', label);
      }
      const { data } = await api.post(`/content/items/${item._id}/audio`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus(mode === 'primary' ? `✓ Primary audio uploaded (${data.sync_verses || 0} synced verses)` : `✓ Variant ${slot} uploaded`);
      setFile(null); setSyncFile(null); setLabel('');
      if (audioRef.current) audioRef.current.value = '';
      if (syncRef.current) syncRef.current.value = '';
      onChanged();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteVariant = async (slotNum) => {
    if (!window.confirm(`Delete variant ${slotNum}?`)) return;
    try {
      await api.delete(`/content/items/${item._id}/audio/variants/${slotNum}`);
      setStatus(`Variant ${slotNum} removed`);
      onChanged();
    } catch {
      setError('Delete failed');
    }
  };

  const deletePrimary = async () => {
    if (!window.confirm('Delete the primary audio + its sync map? Variants remain untouched.')) return;
    try {
      await api.delete(`/content/items/${item._id}/audio`);
      setStatus('Primary audio removed');
      onChanged();
    } catch {
      setError('Delete failed');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="audio-tab">
      {/* Current audio */}
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Music size={16} /> Current Audio</h3>
        {audioSync.audio_url ? (
          <>
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span className="text-[#7A8690]">Format</span><span className="font-medium uppercase">{audioSync.format}</span></div>
              <div className="flex justify-between"><span className="text-[#7A8690]">Duration</span><span className="font-medium">{fmtMs(audioSync.duration_ms)}</span></div>
              <div className="flex justify-between"><span className="text-[#7A8690]">Sync verses</span><span className="font-medium">{(audioSync.sync_map || []).length}</span></div>
            </div>
            <audio controls src={audioSync.audio_url} className="w-full" data-testid="primary-audio-player" />
            <button onClick={deletePrimary}
                    className="w-full border border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 flex items-center justify-center gap-1"
                    data-testid="delete-primary-audio">
              <Trash2 size={12} /> Remove Primary Audio
            </button>
          </>
        ) : (
          <p className="text-xs text-[#989EA4] italic">No primary audio uploaded.</p>
        )}

        <div className="border-t border-[#E8E4E1] pt-3">
          <h4 className="text-xs font-semibold text-[#374652] mb-2">Expert Mode Variants (up to 4)</h4>
          {variants.length === 0 ? (
            <p className="text-xs text-[#989EA4] italic">No variants uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.slot} className="flex items-center gap-2 bg-[#F8F3F1] p-2 rounded-lg border border-[#E8E4E1]" data-testid={`variant-row-${v.slot}`}>
                  <span className="text-xs font-bold text-[#E95A34] bg-white px-1.5 py-0.5 rounded">V{v.slot}</span>
                  <span className="text-xs font-medium text-[#374652] flex-1">{v.label}</span>
                  <audio controls src={v.url} className="h-7" style={{ maxWidth: 180 }} />
                  <button onClick={() => deleteVariant(v.slot)} className="p-1 hover:bg-red-50 rounded text-red-500" data-testid={`delete-variant-${v.slot}`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Upload size={16} /> Upload Audio</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('primary')}
            data-testid="audio-mode-primary"
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${mode === 'primary' ? 'bg-[#E95A34] text-white border-[#E95A34]' : 'border-[#E8E4E1] text-[#7A8690]'}`}
          >
            Primary (+ sync)
          </button>
          <button
            onClick={() => setMode('variant')}
            data-testid="audio-mode-variant"
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${mode === 'variant' ? 'bg-[#E95A34] text-white border-[#E95A34]' : 'border-[#E8E4E1] text-[#7A8690]'}`}
          >
            Expert Variant
          </button>
        </div>

        {mode === 'variant' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Slot (1-4)</label>
              <select value={slot} onChange={(e) => setSlot(parseInt(e.target.value))}
                      data-testid="variant-slot-select"
                      className="w-full px-2 py-1.5 border border-[#E8E4E1] rounded text-sm">
                {[1, 2, 3, 4].map((s) => <option key={s} value={s}>Slot {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)}
                     data-testid="variant-label-input"
                     placeholder="e.g. Male / Female / Slow"
                     className="w-full px-2 py-1.5 border border-[#E8E4E1] rounded text-sm" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1">Audio file (.mp3/.m4a/.wav)</label>
          <input ref={audioRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                 onChange={(e) => setFile(e.target.files?.[0] || null)}
                 data-testid="audio-upload-input"
                 className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-[#E95A34] file:text-white" />
        </div>

        {mode === 'primary' && (
          <div>
            <label className="block text-xs font-semibold mb-1">Sync file (.lrc / .json, optional)</label>
            <input ref={syncRef} type="file" accept=".lrc,.json,.txt"
                   onChange={(e) => setSyncFile(e.target.files?.[0] || null)}
                   data-testid="sync-upload-input"
                   className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-gray-200" />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1">Duration (seconds, optional)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                 placeholder="e.g. 240"
                 className="w-full px-3 py-1.5 border border-[#E8E4E1] rounded text-sm" />
        </div>

        <button onClick={upload} disabled={uploading || !file}
                data-testid="audio-upload-submit"
                className="w-full bg-[#E95A34] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#d24e2c] disabled:opacity-50 flex items-center justify-center gap-2">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : `Upload ${mode === 'primary' ? 'Primary Audio' : `Variant ${slot}`}`}
        </button>
      </div>
    </div>
  );
}

/* ===== Tab 4: Audio Sync (strict nested JSON editor) ===== */
function SyncTab({ item, api, onChanged, setError, setStatus }) {
  const sync = item.audio_sync || {};
  const [jsonText, setJsonText] = useState(() => {
    if (Array.isArray(sync.sync_map) && sync.sync_map.length) {
      const verses = sync.sync_map.map((v) => ({
        verse_id: v.verse_num,
        start_ms: v.start_ms,
        end_ms: v.end_ms,
        lines: v.lines && v.lines.length
          ? v.lines
          : (v.text ? [{ text: v.text, start_ms: v.start_ms, end_ms: v.end_ms }] : []),
      }));
      return JSON.stringify({
        audio_file: sync.audio_url,
        duration_ms: sync.duration_ms,
        verses,
      }, null, 2);
    }
    return JSON.stringify({
      audio_file: sync.audio_url || '',
      duration_ms: sync.duration_ms || 0,
      verses: [
        { verse_id: 1, start_ms: 0, end_ms: 5000,
          lines: [{ text: 'Line 1 text', start_ms: 0, end_ms: 2500 }, { text: 'Line 2 text', start_ms: 2500, end_ms: 5000 }] },
      ],
    }, null, 2);
  });
  const [saving, setSaving] = useState(false);
  const [parseErr, setParseErr] = useState('');

  const save = async () => {
    setSaving(true);
    setParseErr('');
    let body;
    try {
      body = JSON.parse(jsonText);
    } catch (e) {
      setParseErr('Invalid JSON: ' + e.message);
      setSaving(false);
      return;
    }
    try {
      await api.post(`/content/items/${item._id}/audio/sync`, body);
      setStatus('Sync map updated');
      onChanged();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const totalLines = useMemo(() => {
    try {
      const d = JSON.parse(jsonText);
      return (d.verses || []).reduce((s, v) => s + ((v.lines && v.lines.length) || 0), 0);
    } catch { return 0; }
  }, [jsonText]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="sync-tab">
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Clock3 size={16} /> Line-level Sync (Karaoke)</h3>
          <span className="text-xs text-[#7A8690]">{totalLines} line(s)</span>
        </div>
        <p className="text-xs text-[#7A8690]">
          Strict format: each verse is an object with <code className="bg-[#F3EDEA] px-1 rounded">start_ms</code>,
          <code className="bg-[#F3EDEA] px-1 rounded ml-1">end_ms</code> and nested
          <code className="bg-[#F3EDEA] px-1 rounded ml-1">lines[]</code> for line-by-line highlighting.
        </p>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={20}
          data-testid="sync-json-editor"
          spellCheck={false}
          className="w-full px-3 py-2 bg-[#0F172A] text-[#E2E8F0] font-mono text-xs rounded-lg border border-[#1E293B]"
        />
        {parseErr && <p className="text-xs text-red-600">{parseErr}</p>}
        <button onClick={save} disabled={saving}
                data-testid="sync-save-btn"
                className="w-full bg-[#E95A34] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Sync Map
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-3">
        <h3 className="text-sm font-semibold">Live Preview</h3>
        {sync.audio_url ? (
          <audio controls src={sync.audio_url} className="w-full" data-testid="sync-preview-audio" />
        ) : (
          <p className="text-xs text-[#989EA4] italic">Upload primary audio first (Audio tab)</p>
        )}
        <div className="max-h-[420px] overflow-y-auto border border-[#E8E4E1] rounded-lg" data-testid="sync-preview-table">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F3F1] sticky top-0">
              <tr>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Start</th>
                <th className="text-left px-2 py-1">End</th>
                <th className="text-left px-2 py-1">Lines</th>
              </tr>
            </thead>
            <tbody>
              {(sync.sync_map || []).map((v) => (
                <tr key={v.verse_num} className="border-t border-[#E8E4E1]">
                  <td className="px-2 py-1 font-bold">{v.verse_num}</td>
                  <td className="px-2 py-1">{fmtMs(v.start_ms)}</td>
                  <td className="px-2 py-1">{fmtMs(v.end_ms)}</td>
                  <td className="px-2 py-1">
                    {(v.lines && v.lines.length) ? (
                      <ul className="space-y-0.5">
                        {v.lines.map((ln, i) => (
                          <li key={i} className="truncate max-w-[220px]" lang="hi">
                            <span className="text-[#989EA4]">[{fmtMs(ln.start_ms)}]</span> {ln.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="truncate block max-w-[220px]" lang="hi">{v.text}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== Tab 5: Publish (checklist + action) ===== */
function PublishTab({ item, api, check, reload, onStatusChanged, setError, setStatus }) {
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    setLoading(true);
    setError('');
    try {
      await api.patch(`/content/items/${item._id}/status`, { status: 'published' });
      setStatus('✓ Item published!');
      onStatusChanged();
      await reload();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Publish failed');
    } finally {
      setLoading(false);
    }
  };

  const unpublish = async () => {
    setLoading(true);
    try {
      await api.patch(`/content/items/${item._id}/status`, { status: 'draft' });
      setStatus('Reverted to draft');
      onStatusChanged();
      await reload();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!check) return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 max-w-2xl space-y-4" data-testid="publish-tab">
      <h3 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16} /> Pre-publish Checklist</h3>
      <ul className="space-y-2">
        {check.checks.map((c) => (
          <li key={c.key}
              data-testid={`publish-check-${c.key}`}
              className="flex items-center gap-3 text-sm">
            {c.ok ? (
              <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} />
            ) : c.optional ? (
              <span className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 flex-shrink-0" />
            ) : (
              <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
            )}
            <span className={c.ok ? 'text-[#374652]' : (c.optional ? 'text-[#7A8690]' : 'text-red-700')}>
              {c.label}{c.optional && <span className="text-xs ml-1 text-[#989EA4]">(optional)</span>}
              {c.detail && <span className="text-xs text-[#989EA4] ml-2">· {c.detail}</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="pt-3 border-t border-[#E8E4E1]">
        {check.current_status === 'published' ? (
          <button onClick={unpublish} disabled={loading}
                  data-testid="unpublish-btn"
                  className="w-full border border-amber-400 text-amber-700 py-2 rounded-lg text-sm font-semibold hover:bg-amber-50 disabled:opacity-50">
            Revert to Draft
          </button>
        ) : (
          <button
            onClick={publish}
            disabled={!check.can_publish || loading}
            data-testid="publish-btn"
            className="w-full bg-[#E95A34] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#d24e2c] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {check.can_publish ? 'Publish Item' : 'Fix required fields above'}
          </button>
        )}
      </div>
    </div>
  );
}
