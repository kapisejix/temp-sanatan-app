import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, BookOpen, Music, Clock3, CheckCircle2, AlertCircle,
  Save, Loader2, X, Plus, Trash2, Edit3, Upload, Layers, GraduationCap,
} from 'lucide-react';

/**
 * Full-screen right-drawer editor used from every Bhakti Category page
 * (Chalisa, Aarti, Namavali, Sahasranama, Vedic Mantras, Stotrams, Suktams,
 * Ashtakam, Shatkam, Kavacham, Nam Ramayanam).
 *
 * Props
 *  - api:        axios instance from useAuth()
 *  - itemId:     Mongo ObjectId of the content_item being edited
 *  - category:   string — if 'aarti' we hide the Beginner/Expert toggle &
 *                Learner tab (aarti has no Guru→Student learning mode)
 *  - open:       boolean
 *  - onClose:    () => void
 *  - onChange:   optional callback fired after any mutation so the list refreshes
 */

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

function fmtMs(ms) {
  if (ms == null) return '–';
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function BhaktiEditorDrawer({ api, itemId, category, open, onClose, onChange }) {
  const isAarti = (category || '').toLowerCase() === 'aarti';
  const [mode, setMode] = useState('expert'); // beginner | expert (locked to expert when aarti)
  const [activeTab, setActiveTab] = useState('content');
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [publishCheck, setPublishCheck] = useState(null);

  const TABS = useMemo(() => {
    const base = [
      { id: 'content', label: 'Content', icon: FileText },
      { id: 'verses', label: 'Verses', icon: BookOpen },
      { id: 'audio', label: 'Audio', icon: Music },
    ];
    if (mode === 'expert' || isAarti) {
      base.push({ id: 'sync', label: 'Audio Sync', icon: Clock3 });
    } else {
      base.push({ id: 'learner', label: 'Learner Mode', icon: GraduationCap });
    }
    base.push({ id: 'publish', label: 'Publish', icon: CheckCircle2 });
    return base;
  }, [mode, isAarti]);

  // Ensure active tab stays valid when mode flips
  useEffect(() => {
    if (!TABS.find((t) => t.id === activeTab)) setActiveTab('content');
  }, [TABS, activeTab]);

  // Load item
  useEffect(() => {
    if (!open || !itemId) return;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const { data } = await api.get(`/content/items/${itemId}`);
        setItem(data);
      } catch {
        setError('Item not found — it may have been deleted.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, itemId, api]);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const refreshItem = async () => {
    try {
      const { data } = await api.get(`/content/items/${itemId}`);
      setItem(data);
      onChange && onChange();
    } catch {}
  };

  const loadPublishCheck = async () => {
    try {
      const { data } = await api.get(`/content/items/${itemId}/publish-check`);
      setPublishCheck(data);
    } catch {
      setPublishCheck(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'publish' && open) loadPublishCheck();
  }, [activeTab, open]); // eslint-disable-line

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="bhakti-editor-drawer">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        data-testid="drawer-backdrop"
      />
      {/* Drawer */}
      <div className="w-full max-w-[1100px] bg-[#FAF6F4] h-full shadow-2xl flex flex-col overflow-hidden animate-[slideIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-[#E8E4E1] px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {loading ? (
              <Loader2 size={20} className="animate-spin text-[#E95A34]" />
            ) : item ? (
              <>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E95A34]">
                    {(item.category || category || '').toUpperCase()}
                  </p>
                  <h2 className="text-xl font-bold truncate" style={{ fontFamily: 'Manrope' }}>
                    Edit · {item.title_hi || item.title_en || 'Untitled'}
                  </h2>
                  <p className="text-xs text-[#7A8690]">
                    Status: <span className={item.status === 'published' ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {item.status || 'draft'}
                    </span>
                    {item.total_verses != null && ` · ${item.total_verses} verses`}
                  </p>
                </div>

                {/* Beginner/Expert toggle (hidden for Aarti) */}
                {!isAarti && (
                  <div className="flex bg-[#F3EDEA] rounded-lg p-0.5" data-testid="mode-toggle">
                    <button
                      onClick={() => setMode('beginner')}
                      data-testid="mode-beginner"
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        mode === 'beginner' ? 'bg-white text-[#E95A34] shadow-sm' : 'text-[#7A8690]'
                      }`}
                    >
                      <Layers size={12} /> Beginner
                    </button>
                    <button
                      onClick={() => setMode('expert')}
                      data-testid="mode-expert"
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        mode === 'expert' ? 'bg-white text-[#E95A34] shadow-sm' : 'text-[#7A8690]'
                      }`}
                    >
                      <FileText size={12} /> Expert
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F3EDEA] rounded-md text-[#374652]"
            data-testid="drawer-close-btn"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        {item && (
          <div className="flex-shrink-0 border-b border-[#E8E4E1] bg-white overflow-x-auto">
            <div className="flex">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  data-testid={`drawer-tab-${t.id}`}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === t.id ? 'border-[#E95A34] text-[#E95A34]' : 'border-transparent text-[#7A8690] hover:text-[#374652]'
                  }`}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status / error bar */}
        {(error || status) && (
          <div className="flex-shrink-0 px-6 py-2 space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs" data-testid="drawer-error">
                <AlertCircle size={14} /> {error}
                <button className="ml-auto" onClick={() => setError('')}>×</button>
              </div>
            )}
            {status && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs" data-testid="drawer-status">
                <CheckCircle2 size={14} /> {status}
                <button className="ml-auto" onClick={() => setStatus('')}>×</button>
              </div>
            )}
          </div>
        )}

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[#E95A34]" />
            </div>
          ) : !item ? (
            <div className="text-center py-20">
              <AlertCircle className="mx-auto text-red-500 mb-3" size={32} />
              <p className="text-sm text-[#374652]">{error || 'Item not found'}</p>
            </div>
          ) : (
            <>
              {activeTab === 'content' && (
                <ContentTab item={item} api={api} onSaved={(d) => { setItem(d); setStatus('Content saved'); onChange && onChange(); }} setError={setError} />
              )}
              {activeTab === 'verses' && (
                <VersesTab item={item} api={api} onChanged={refreshItem} setError={setError} setStatus={setStatus} supported={item.supported_languages || ['hi']} />
              )}
              {activeTab === 'audio' && (
                <AudioTab item={item} api={api} onChanged={refreshItem} setError={setError} setStatus={setStatus} mode={mode} />
              )}
              {activeTab === 'sync' && (
                <SyncTab item={item} api={api} onChanged={refreshItem} setError={setError} setStatus={setStatus} />
              )}
              {activeTab === 'learner' && (
                <LearnerTab item={item} api={api} />
              )}
              {activeTab === 'publish' && (
                <PublishTab item={item} api={api} check={publishCheck} reload={loadPublishCheck}
                            onStatusChanged={refreshItem} setError={setError} setStatus={setStatus} />
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

/* ---------------- Content Tab ---------------- */
function ContentTab({ item, api, onSaved, setError }) {
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
  const [saving, setSaving] = useState(false);

  const toggleLang = (code) => {
    setForm((f) => {
      const has = f.supported_languages.includes(code);
      const next = has ? f.supported_languages.filter((x) => x !== code) : [...f.supported_languages, code];
      return { ...f, supported_languages: next };
    });
  };

  const setLangField = (code, field, value) =>
    setForm((f) => ({
      ...f,
      languages: { ...(f.languages || {}), [code]: { ...((f.languages || {})[code] || {}), [field]: value } },
    }));

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
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 space-y-5" data-testid="drawer-content-tab">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Title (Hindi) *" testid="title-hi-input" value={form.title_hi}
               onChange={(v) => setForm({ ...form, title_hi: v })} />
        <Field label="Title (English) *" testid="title-en-input" value={form.title_en}
               onChange={(v) => setForm({ ...form, title_en: v })} />
        <Field label="Title (Sanskrit)" testid="title-sa-input" value={form.title_sa}
               onChange={(v) => setForm({ ...form, title_sa: v })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Deity (Hindi)" value={form.deity_hi} onChange={(v) => setForm({ ...form, deity_hi: v })} />
        <Field label="Deity (English)" value={form.deity} onChange={(v) => setForm({ ...form, deity: v })} />
        <Field label="Thumbnail URL" value={form.thumbnail_url} onChange={(v) => setForm({ ...form, thumbnail_url: v })} />
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

      {form.supported_languages.length > 0 && (
        <div className="bg-[#F8F3F1] rounded-lg border border-[#E8E4E1] overflow-hidden">
          <div className="flex border-b border-[#E8E4E1] bg-white overflow-x-auto">
            {form.supported_languages.map((code) => {
              const l = LANGUAGES.find((x) => x.code === code) || { code, label_en: code };
              return (
                <button
                  key={code}
                  onClick={() => setLangTab(code)}
                  data-testid={`desc-lang-tab-${code}`}
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
        <button onClick={save} disabled={saving} data-testid="content-save-btn"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#E95A34] text-white rounded-lg font-medium hover:bg-[#d24e2c] disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Content
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

/* ---------------- Verses Tab (with per-language meanings) ---------------- */
function VersesTab({ item, api, onChanged, setError, setStatus, supported }) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ sanskrit_text: '', transliteration: '', verse_type: 'shloka' });
  const [meanings, setMeanings] = useState({}); // { verseId: { [lang]: {meaning, word_breakdown}, ... } }
  const [meaningLangTab, setMeaningLangTab] = useState('hi');
  const [addOpen, setAddOpen] = useState(false);
  const [newVerse, setNewVerse] = useState({ verse_num: 1, verse_type: 'shloka', sanskrit_text: '', transliteration: '' });
  const autoOpened = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/content/items/${item._id}/verses`);
      const list = data || [];
      setVerses(list);
      if (!autoOpened.current) {
        autoOpened.current = true;
        if (list.length > 0) {
          const first = list[0];
          setEditingId(first._id);
          setEditForm({
            sanskrit_text: first.sanskrit_text || '',
            transliteration: first.transliteration || '',
            verse_type: first.verse_type || 'shloka',
          });
          loadMeanings(first._id);
        } else {
          setAddOpen(true);
        }
      }
    } catch {
      setError('Failed to load verses');
    } finally {
      setLoading(false);
    }
  };

  const loadMeanings = async (verseId) => {
    try {
      const { data } = await api.get(`/content/verses/${verseId}/meanings`);
      const byLang = {};
      (data || []).forEach((m) => { byLang[m.language] = m; });
      setMeanings((prev) => ({ ...prev, [verseId]: byLang }));
    } catch {}
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [item._id]);

  const startEdit = (v) => {
    setEditingId(v._id);
    setEditForm({
      sanskrit_text: v.sanskrit_text || '',
      transliteration: v.transliteration || '',
      verse_type: v.verse_type || 'shloka',
    });
    if (!meanings[v._id]) loadMeanings(v._id);
    setMeaningLangTab((supported || ['hi'])[0] || 'hi');
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/content/verses/${id}`, editForm);
      // save any dirty meaning edits
      const verseMeanings = meanings[id] || {};
      for (const lang of Object.keys(verseMeanings)) {
        const m = verseMeanings[lang];
        if (!m || !m._dirty) continue;
        await api.post(`/content/verses/${id}/meanings`, {
          language: lang,
          meaning: m.meaning || '',
          word_breakdown: m.word_breakdown || [],
        });
      }
      setEditingId(null);
      setStatus('Verse saved');
      await load();
      onChanged();
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
      setStatus('Verse added');
      await load();
      onChanged();
    } catch {
      setError('Failed to add verse');
    }
  };

  const setMeaningField = (verseId, lang, field, value) => {
    setMeanings((prev) => {
      const vm = prev[verseId] || {};
      const current = vm[lang] || { language: lang, meaning: '', word_breakdown: [] };
      return {
        ...prev,
        [verseId]: { ...vm, [lang]: { ...current, [field]: value, _dirty: true } },
      };
    });
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-3" data-testid="drawer-verses-tab">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Verses ({verses.length})</h3>
        <button onClick={() => setAddOpen((v) => !v)} data-testid="verse-add-toggle"
                className="flex items-center gap-1 px-3 py-1.5 bg-[#E95A34] text-white rounded-lg text-sm">
          <Plus size={14} /> Add Verse
        </button>
      </div>

      {addOpen && (
        <div className="border-2 border-dashed border-[#E8E4E1] rounded-lg p-3 space-y-2 bg-[#FEFBF9]" data-testid="verse-add-form">
          <div className="flex gap-2">
            <input type="number" value={newVerse.verse_num}
                   onChange={(e) => setNewVerse({ ...newVerse, verse_num: parseInt(e.target.value) || 1 })}
                   className="w-16 px-2 py-1.5 border border-[#E8E4E1] rounded text-sm" />
            <select value={newVerse.verse_type} onChange={(e) => setNewVerse({ ...newVerse, verse_type: e.target.value })}
                    className="px-2 py-1.5 border border-[#E8E4E1] rounded text-sm">
              {['shloka', 'chaupai', 'doha', 'mantra', 'stanza', 'name'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <textarea value={newVerse.sanskrit_text}
                    onChange={(e) => setNewVerse({ ...newVerse, sanskrit_text: e.target.value })}
                    placeholder="Sanskrit / Hindi text" rows={3} data-testid="new-verse-sanskrit"
                    className="w-full px-3 py-2 border border-[#E8E4E1] rounded-lg text-sm" lang="hi" />
          <input value={newVerse.transliteration}
                 onChange={(e) => setNewVerse({ ...newVerse, transliteration: e.target.value })}
                 placeholder="Transliteration (optional)"
                 className="w-full px-3 py-2 border border-[#E8E4E1] rounded-lg text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 text-sm text-[#7A8690]">Cancel</button>
            <button onClick={addVerse} disabled={!newVerse.sanskrit_text} data-testid="save-new-verse-btn"
                    className="px-3 py-1.5 bg-[#E95A34] text-white text-sm rounded-lg disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {verses.length === 0 && !addOpen && (
        <p className="text-center text-sm text-[#989EA4] py-8">No verses yet. Click "Add Verse" to begin.</p>
      )}

      <div className="space-y-2">
        {verses.map((v) => {
          const isEditing = editingId === v._id;
          const vmeanings = meanings[v._id] || {};
          const supLangs = supported && supported.length ? supported : ['hi', 'en'];
          const currentMeaning = vmeanings[meaningLangTab] || {};
          return (
            <div key={v._id} className="bg-[#F8F3F1] rounded-lg p-3 border border-[#E8E4E1]" data-testid={`verse-row-${v.verse_num}`}>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#E95A34]">#{v.verse_num}</span>
                    <select value={editForm.verse_type} onChange={(e) => setEditForm({ ...editForm, verse_type: e.target.value })}
                            className="px-2 py-1 border border-[#E8E4E1] rounded text-xs">
                      {['shloka', 'chaupai', 'doha', 'mantra', 'stanza', 'name'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <textarea value={editForm.sanskrit_text}
                            onChange={(e) => setEditForm({ ...editForm, sanskrit_text: e.target.value })}
                            rows={3} data-testid="verse-edit-sanskrit"
                            className="w-full px-3 py-2 border border-[#E8E4E1] rounded-lg text-sm bg-white" lang="hi" />
                  <input value={editForm.transliteration}
                         onChange={(e) => setEditForm({ ...editForm, transliteration: e.target.value })}
                         placeholder="Transliteration"
                         className="w-full px-3 py-2 border border-[#E8E4E1] rounded-lg text-sm bg-white" />

                  {/* Verse Meanings — per language */}
                  <div className="border border-[#E8E4E1] rounded-lg bg-white overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#E8E4E1] bg-[#FEF0EC] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#E95A34]">VERSE MEANING</span>
                      <div className="flex flex-wrap gap-1">
                        {supLangs.map((code) => {
                          const l = LANGUAGES.find((x) => x.code === code) || { code, label_en: code };
                          return (
                            <button key={code}
                                    onClick={() => setMeaningLangTab(code)}
                                    data-testid={`meaning-lang-${code}`}
                                    className={`px-2 py-0.5 text-[11px] rounded ${meaningLangTab === code ? 'bg-[#E95A34] text-white' : 'bg-white text-[#7A8690] border border-[#E8E4E1]'}`}>
                              {l.label_en}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <textarea
                      value={currentMeaning.meaning || ''}
                      onChange={(e) => setMeaningField(v._id, meaningLangTab, 'meaning', e.target.value)}
                      rows={3}
                      placeholder={`Meaning in ${meaningLangTab.toUpperCase()}…`}
                      data-testid={`verse-meaning-${meaningLangTab}`}
                      className="w-full px-3 py-2 text-sm border-0 focus:outline-none"
                      lang={meaningLangTab}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-[#7A8690]">Cancel</button>
                    <button onClick={() => saveEdit(v._id)} data-testid={`save-verse-${v.verse_num}`}
                            className="px-3 py-1.5 bg-[#E95A34] text-white text-xs rounded-lg">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-[#E95A34] bg-white px-2 py-1 rounded">#{v.verse_num}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#374652] whitespace-pre-wrap" lang="hi">
                      {v.sanskrit_text || <em className="text-[#989EA4]">(empty)</em>}
                    </p>
                    {v.transliteration && <p className="text-xs italic text-[#7A8690] mt-1">{v.transliteration}</p>}
                  </div>
                  <button onClick={() => startEdit(v)} className="p-1.5 hover:bg-white rounded-md" data-testid={`edit-verse-${v.verse_num}`}>
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Audio Tab ---------------- */
function AudioTab({ item, api, onChanged, setError, setStatus, mode }) {
  const [uploadMode, setUploadMode] = useState('primary');
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
  const showExpertVariants = mode === 'expert';

  const upload = async () => {
    if (!file) return setError('Select an audio file');
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('audio', file);
      if (uploadMode === 'primary' && syncFile) fd.append('sync_file', syncFile);
      if (duration) fd.append('duration_ms', String(parseInt(duration, 10) * 1000));
      if (uploadMode === 'variant') {
        fd.append('variant_slot', String(slot));
        if (label) fd.append('variant_label', label);
      }
      const { data } = await api.post(`/content/items/${item._id}/audio`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus(uploadMode === 'primary' ? `✓ Primary audio uploaded (${data.sync_verses || 0} synced verses)` : `✓ Variant ${slot} uploaded`);
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
      setStatus(`Variant ${slotNum} removed`); onChanged();
    } catch { setError('Delete failed'); }
  };

  const deletePrimary = async () => {
    if (!window.confirm('Delete the primary audio + its sync map? Variants remain untouched.')) return;
    try {
      await api.delete(`/content/items/${item._id}/audio`);
      setStatus('Primary audio removed'); onChanged();
    } catch { setError('Delete failed'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="drawer-audio-tab">
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
            <button onClick={deletePrimary} data-testid="delete-primary-audio"
                    className="w-full border border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 flex items-center justify-center gap-1">
              <Trash2 size={12} /> Remove Primary Audio
            </button>
          </>
        ) : (
          <p className="text-xs text-[#989EA4] italic">No primary audio uploaded.</p>
        )}

        {showExpertVariants && (
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
                    <button onClick={() => deleteVariant(v.slot)} data-testid={`delete-variant-${v.slot}`}
                            className="p-1 hover:bg-red-50 rounded text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Upload size={16} /> Upload Audio</h3>
        {showExpertVariants && (
          <div className="flex gap-2">
            <button onClick={() => setUploadMode('primary')} data-testid="audio-mode-primary"
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${uploadMode === 'primary' ? 'bg-[#E95A34] text-white border-[#E95A34]' : 'border-[#E8E4E1] text-[#7A8690]'}`}>
              Primary (+ sync)
            </button>
            <button onClick={() => setUploadMode('variant')} data-testid="audio-mode-variant"
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${uploadMode === 'variant' ? 'bg-[#E95A34] text-white border-[#E95A34]' : 'border-[#E8E4E1] text-[#7A8690]'}`}>
              Expert Variant
            </button>
          </div>
        )}

        {uploadMode === 'variant' && showExpertVariants && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Slot (1-4)</label>
              <select value={slot} onChange={(e) => setSlot(parseInt(e.target.value))} data-testid="variant-slot-select"
                      className="w-full px-2 py-1.5 border border-[#E8E4E1] rounded text-sm">
                {[1, 2, 3, 4].map((s) => <option key={s} value={s}>Slot {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} data-testid="variant-label-input"
                     placeholder="Male / Female / Slow"
                     className="w-full px-2 py-1.5 border border-[#E8E4E1] rounded text-sm" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1">Audio file (.mp3/.m4a/.wav)</label>
          <input ref={audioRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                 onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="audio-upload-input"
                 className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-[#E95A34] file:text-white" />
        </div>

        {uploadMode === 'primary' && (
          <div>
            <label className="block text-xs font-semibold mb-1">Sync file (.lrc / .json, optional)</label>
            <input ref={syncRef} type="file" accept=".lrc,.json,.txt"
                   onChange={(e) => setSyncFile(e.target.files?.[0] || null)} data-testid="sync-upload-input"
                   className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-gray-200" />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1">Duration (seconds, optional)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                 className="w-full px-3 py-1.5 border border-[#E8E4E1] rounded text-sm" />
        </div>

        <button onClick={upload} disabled={uploading || !file} data-testid="audio-upload-submit"
                className="w-full bg-[#E95A34] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#d24e2c] disabled:opacity-50 flex items-center justify-center gap-2">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : `Upload ${uploadMode === 'primary' ? 'Primary Audio' : `Variant ${slot}`}`}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Sync Tab (Expert only) ---------------- */
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
      return JSON.stringify({ audio_file: sync.audio_url, duration_ms: sync.duration_ms, verses }, null, 2);
    }
    return JSON.stringify({
      audio_file: sync.audio_url || '', duration_ms: sync.duration_ms || 0,
      verses: [
        { verse_id: 1, start_ms: 0, end_ms: 5000,
          lines: [{ text: 'Line 1', start_ms: 0, end_ms: 2500 }, { text: 'Line 2', start_ms: 2500, end_ms: 5000 }] },
      ],
    }, null, 2);
  });
  const [saving, setSaving] = useState(false);
  const [parseErr, setParseErr] = useState('');

  const save = async () => {
    setSaving(true); setParseErr('');
    let body;
    try { body = JSON.parse(jsonText); }
    catch (e) { setParseErr('Invalid JSON: ' + e.message); setSaving(false); return; }
    try {
      await api.post(`/content/items/${item._id}/audio/sync`, body);
      setStatus('Sync map updated'); onChanged();
    } catch (e) { setError(e?.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="drawer-sync-tab">
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Clock3 size={16} /> Line-level Sync (Karaoke)</h3>
        <p className="text-xs text-[#7A8690]">
          Strict nested format: each verse has <code className="bg-[#F3EDEA] px-1 rounded">start_ms</code>,
          <code className="bg-[#F3EDEA] px-1 rounded ml-1">end_ms</code> and nested
          <code className="bg-[#F3EDEA] px-1 rounded ml-1">lines[]</code>.
        </p>
        <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={20}
                  data-testid="sync-json-editor" spellCheck={false}
                  className="w-full px-3 py-2 bg-[#0F172A] text-[#E2E8F0] font-mono text-xs rounded-lg border border-[#1E293B]" />
        {parseErr && <p className="text-xs text-red-600">{parseErr}</p>}
        <button onClick={save} disabled={saving} data-testid="sync-save-btn"
                className="w-full bg-[#E95A34] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Sync Map
        </button>
      </div>
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-3">
        <h3 className="text-sm font-semibold">Live Preview</h3>
        {sync.audio_url ? <audio controls src={sync.audio_url} className="w-full" data-testid="sync-preview-audio" />
                        : <p className="text-xs text-[#989EA4] italic">Upload primary audio first (Audio tab)</p>}
        <div className="max-h-[420px] overflow-y-auto border border-[#E8E4E1] rounded-lg" data-testid="sync-preview-table">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F3F1] sticky top-0">
              <tr><th className="text-left px-2 py-1">#</th><th className="text-left px-2 py-1">Start</th>
                  <th className="text-left px-2 py-1">End</th><th className="text-left px-2 py-1">Lines</th></tr>
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

/* ---------------- Learner Tab (Beginner mode only, non-Aarti) ---------------- */
function LearnerTab({ item, api }) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingVerseId, setPlayingVerseId] = useState(null);
  const [step, setStep] = useState(''); // guru | student-1 | student-2
  const audioElRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/content/items/${item._id}/verses`);
        setVerses(data || []);
      } finally { setLoading(false); }
    })();
  }, [item._id, api]);

  const speak = async (text) => {
    const { data } = await api.post('/tts/synthesize', { text, language: 'hi' });
    const src = `data:audio/mpeg;base64,${data.audio_base64}`;
    const el = new window.Audio(src);
    audioElRef.current = el;
    await new Promise((resolve) => {
      el.onended = resolve;
      el.onerror = resolve;
      el.play().catch(resolve);
    });
  };

  const runLoop = async (verse) => {
    const text = verse.sanskrit_text || '';
    if (!text) return;
    setPlayingVerseId(verse._id);
    try {
      setStep('guru');
      await speak(text);
      await new Promise((r) => setTimeout(r, 1000));
      setStep('student-1');
      await speak(text);
      await new Promise((r) => setTimeout(r, 1000));
      setStep('student-2');
      await speak(text);
    } finally {
      setPlayingVerseId(null);
      setStep('');
    }
  };

  const stopAll = () => {
    if (audioElRef.current) {
      try { audioElRef.current.pause(); } catch {}
      audioElRef.current = null;
    }
    setPlayingVerseId(null);
    setStep('');
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 space-y-4" data-testid="drawer-learner-tab">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <GraduationCap size={16} /> Learner Mode Preview
          </h3>
          <p className="text-xs text-[#7A8690] mt-1">
            Guru → Student → Student (2x repeat) using Google TTS. This exactly mirrors
            the mobile Beginner Mode experience so you can verify pronunciation before publishing.
          </p>
        </div>
        {playingVerseId && (
          <button onClick={stopAll} data-testid="learner-stop-btn"
                  className="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-lg hover:bg-red-50">
            Stop
          </button>
        )}
      </div>

      {verses.length === 0 ? (
        <p className="text-sm text-[#989EA4] italic text-center py-8">Add verses first (Verses tab) to preview Learner Mode.</p>
      ) : (
        <div className="space-y-2">
          {verses.map((v) => {
            const active = playingVerseId === v._id;
            return (
              <div key={v._id} className={`rounded-lg border p-3 ${active ? 'border-[#E95A34] bg-[#FEF0EC]' : 'border-[#E8E4E1] bg-[#F8F3F1]'}`}
                   data-testid={`learner-verse-${v.verse_num}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#E95A34] bg-white px-2 py-1 rounded">#{v.verse_num}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm whitespace-pre-wrap" lang="hi">{v.sanskrit_text}</p>
                    {active && (
                      <p className="text-[11px] mt-1 font-semibold text-[#7B3F61]">
                        {step === 'guru' && '🕉️ गुरु बोल रहे हैं…'}
                        {step === 'student-1' && '👂 शिष्य दोहराए (1 / 2)'}
                        {step === 'student-2' && '🙏 शिष्य दोहराए (2 / 2)'}
                      </p>
                    )}
                  </div>
                  <button onClick={() => runLoop(v)} disabled={!!playingVerseId} data-testid={`learner-play-${v.verse_num}`}
                          className="px-3 py-1.5 bg-[#7B3F61] text-white text-xs rounded-lg font-medium disabled:opacity-40">
                    {active ? 'Playing…' : '▶ Teach'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Publish Tab ---------------- */
function PublishTab({ item, api, check, reload, onStatusChanged, setError, setStatus }) {
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    setLoading(true); setError('');
    try {
      await api.patch(`/content/items/${item._id}/status`, { status: 'published' });
      setStatus('✓ Item published!'); onStatusChanged(); await reload();
    } catch (e) { setError(e?.response?.data?.detail || 'Publish failed'); }
    finally { setLoading(false); }
  };

  const unpublish = async () => {
    setLoading(true);
    try {
      await api.patch(`/content/items/${item._id}/status`, { status: 'draft' });
      setStatus('Reverted to draft'); onStatusChanged(); await reload();
    } catch (e) { setError(e?.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  if (!check) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 max-w-2xl space-y-4" data-testid="drawer-publish-tab">
      <h3 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16} /> Pre-publish Checklist</h3>
      <ul className="space-y-2">
        {check.checks.map((c) => (
          <li key={c.key} data-testid={`publish-check-${c.key}`} className="flex items-center gap-3 text-sm">
            {c.ok ? <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} /> :
             c.optional ? <span className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 flex-shrink-0" /> :
             <AlertCircle className="text-red-500 flex-shrink-0" size={18} />}
            <span className={c.ok ? 'text-[#374652]' : (c.optional ? 'text-[#7A8690]' : 'text-red-700')}>
              {c.label}{c.optional && <span className="text-xs ml-1 text-[#989EA4]">(optional)</span>}
              {c.detail && <span className="text-xs text-[#989EA4] ml-2">· {c.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="pt-3 border-t border-[#E8E4E1]">
        {check.current_status === 'published' ? (
          <button onClick={unpublish} disabled={loading} data-testid="unpublish-btn"
                  className="w-full border border-amber-400 text-amber-700 py-2 rounded-lg text-sm font-semibold hover:bg-amber-50 disabled:opacity-50">
            Revert to Draft
          </button>
        ) : (
          <button onClick={publish} disabled={!check.can_publish || loading} data-testid="publish-btn"
                  className="w-full bg-[#E95A34] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#d24e2c] disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {check.can_publish ? 'Publish Item' : 'Fix required fields above'}
          </button>
        )}
      </div>
    </div>
  );
}
