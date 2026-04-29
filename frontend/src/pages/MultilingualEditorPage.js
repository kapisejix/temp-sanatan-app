import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Languages, Sparkles, Save, CheckCircle2, Loader2, Trash2,
  AlertCircle, BookOpen, ChevronRight, Wand2,
} from 'lucide-react';
import UnicodeRichEditor from '../components/UnicodeRichEditor';

const TARGET_LANGUAGES_PHASE1 = [
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'en', name: 'English', native: 'English' },
];

const SOURCE_LANG_OPTIONS = [
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'en', name: 'English', native: 'English' },
];

export default function MultilingualEditorPage() {
  const { api } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [verses, setVerses] = useState([]);
  const [activeVerseId, setActiveVerseId] = useState(null);
  const [drafts, setDrafts] = useState({}); // { lang: { text, transliteration, meaning, is_draft, ... } }
  const [activeLang, setActiveLang] = useState('mr');
  const [sourceLang, setSourceLang] = useState('hi');
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { done, total, failed }
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [error, setError] = useState(null);

  // ---- Load items ----
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/content/items?limit=100');
        setItems(data.items || []);
      } catch (e) {
        setError('Failed to load content items');
      } finally {
        setLoadingItems(false);
      }
    })();
  }, [api]);

  // ---- Load verses on item change ----
  useEffect(() => {
    if (!selectedItemId) return;
    setLoadingVerses(true);
    setActiveVerseId(null);
    setVerses([]);
    setDrafts({});
    (async () => {
      try {
        const { data } = await api.get(`/content/items/${selectedItemId}/verses`);
        setVerses(data || []);
        if (data?.length) setActiveVerseId(data[0]._id);
      } catch (e) {
        setError('Failed to load verses');
      } finally {
        setLoadingVerses(false);
      }
    })();
  }, [api, selectedItemId]);

  // ---- Load drafts on verse change ----
  useEffect(() => {
    if (!activeVerseId) return;
    (async () => {
      try {
        const { data } = await api.get(`/admin/translate/drafts/${activeVerseId}`);
        const map = {};
        (data || []).forEach((d) => { map[d.language] = d; });
        setDrafts(map);
      } catch (e) {
        // Drafts collection may be empty — non-fatal
        setDrafts({});
      }
    })();
  }, [api, activeVerseId]);

  const activeVerse = useMemo(
    () => verses.find((v) => v._id === activeVerseId),
    [verses, activeVerseId]
  );

  // Source content fetched from active verse + meaning collection
  const [sourceMeaning, setSourceMeaning] = useState('');
  useEffect(() => {
    if (!activeVerseId) return;
    (async () => {
      try {
        const { data } = await api.get(`/content/verses/${activeVerseId}/meanings`);
        const found = (data || []).find((m) => m.language === sourceLang);
        setSourceMeaning(found?.meaning || '');
      } catch {
        setSourceMeaning('');
      }
    })();
  }, [api, activeVerseId, sourceLang]);

  const sourceText = sourceLang === 'sa'
    ? (activeVerse?.sanskrit_text || '')
    : (activeVerse?.text_translations?.[sourceLang] || activeVerse?.sanskrit_text || '');
  const sourceTransliteration = activeVerse?.transliteration || '';

  // ---- Actions ----
  const handleAITranslate = async (allLangs = false) => {
    if (!activeVerseId) return;
    if (!sourceText && !sourceTransliteration && !sourceMeaning) {
      setError('Source verse has no text to translate. Add content in Verse Manager first.');
      return;
    }
    setError(null);
    setStatusMsg(null);
    setTranslating(true);
    const targets = allLangs
      ? TARGET_LANGUAGES_PHASE1.map((l) => l.code).filter((c) => c !== sourceLang)
      : [activeLang].filter((c) => c !== sourceLang);
    const payload = {
      source_language: sourceLang,
      target_languages: targets,
      text: sourceText,
      transliteration: sourceTransliteration,
      meaning: sourceMeaning,
      verse_id: activeVerseId,
    };
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data } = await api.post('/admin/translate/verse', payload);
        const { data: drf } = await api.get(`/admin/translate/drafts/${activeVerseId}`);
        const map = {};
        (drf || []).forEach((d) => { map[d.language] = d; });
        setDrafts(map);
        setStatusMsg(`AI draft generated for ${Object.keys(data.translations || {}).length} language(s). Review & publish below.`);
        setTranslating(false);
        return;
      } catch (e) {
        lastErr = e;
        const detail = e?.response?.data?.detail || '';
        // Retry once on transient Gemini budget hiccups
        if (attempt === 0 && /budget|exceeded|429/i.test(detail)) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        break;
      }
    }
    const detail = lastErr?.response?.data?.detail || 'AI translation failed';
    setError(/budget|exceeded/i.test(detail)
      ? 'Gemini budget temporarily exceeded — please retry in a few seconds.'
      : detail);
    setTranslating(false);
  };

  const handleSaveDraft = async () => {
    if (!activeVerseId) return;
    const draft = drafts[activeLang] || {};
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put(`/admin/translate/drafts/${activeVerseId}/${activeLang}`, {
        text: draft.text || '',
        transliteration: draft.transliteration || '',
        meaning: draft.meaning || '',
      });
      setDrafts((prev) => ({ ...prev, [activeLang]: { ...data, is_draft: true } }));
      setStatusMsg('Draft saved.');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!activeVerseId) return;
    setPublishing(true);
    setError(null);
    try {
      // Save any pending edits first
      await api.put(`/admin/translate/drafts/${activeVerseId}/${activeLang}`, {
        text: drafts[activeLang]?.text || '',
        transliteration: drafts[activeLang]?.transliteration || '',
        meaning: drafts[activeLang]?.meaning || '',
      });
      await api.post(`/admin/translate/drafts/${activeVerseId}/${activeLang}/publish`);
      setStatusMsg(`Published ${activeLang.toUpperCase()} successfully.`);
      // Reload drafts (will mark as not-draft)
      const { data: drf } = await api.get(`/admin/translate/drafts/${activeVerseId}`);
      const map = {};
      (drf || []).forEach((d) => { map[d.language] = d; });
      setDrafts(map);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!activeVerseId || !drafts[activeLang]) return;
    if (!window.confirm(`Delete ${activeLang.toUpperCase()} draft? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/translate/drafts/${activeVerseId}/${activeLang}`);
      setDrafts((prev) => { const cp = { ...prev }; delete cp[activeLang]; return cp; });
      setStatusMsg('Draft deleted.');
    } catch (e) {
      setError('Delete failed');
    }
  };

  // ---- One-click: translate ALL verses of the item into ALL target languages ----
  const handleTranslateWholeItem = async () => {
    if (!verses.length) return;
    if (!window.confirm(
      `Translate all ${verses.length} verses into ${TARGET_LANGUAGES_PHASE1.length} languages?\n\n` +
      `This will take ~${Math.round(verses.length * 6 / 60 * 1.2)} minute(s) and use Gemini AI.\n\n` +
      `All output is saved as DRAFT — nothing is auto-published.`
    )) return;

    setError(null);
    setStatusMsg(null);
    setBulkProgress({ done: 0, total: verses.length, failed: 0 });
    const targets = TARGET_LANGUAGES_PHASE1.map((l) => l.code).filter((c) => c !== sourceLang);
    let failed = 0;

    for (let i = 0; i < verses.length; i++) {
      const v = verses[i];
      // Fetch source meaning for this verse in source language (best effort)
      let vMeaning = '';
      try {
        const { data: ms } = await api.get(`/content/verses/${v._id}/meanings`);
        vMeaning = (ms || []).find((m) => m.language === sourceLang)?.meaning || '';
      } catch { /* non-fatal */ }

      const vText = sourceLang === 'sa'
        ? (v.sanskrit_text || '')
        : (v.text_translations?.[sourceLang] || v.sanskrit_text || '');
      const vTrans = v.transliteration || '';

      if (!vText && !vTrans && !vMeaning) {
        // Nothing to translate; mark this verse as done and continue
        setBulkProgress((p) => ({ ...p, done: (p?.done || 0) + 1 }));
        continue;
      }

      let success = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await api.post('/admin/translate/verse', {
            source_language: sourceLang,
            target_languages: targets,
            text: vText,
            transliteration: vTrans,
            meaning: vMeaning,
            verse_id: v._id,
          });
          success = true;
          break;
        } catch (e) {
          const detail = e?.response?.data?.detail || '';
          if (attempt === 0 && /budget|exceeded|429/i.test(detail)) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          break;
        }
      }
      if (!success) failed += 1;
      setBulkProgress({ done: i + 1, total: verses.length, failed });

      // Tiny pacing between calls to be gentle on the LLM key
      if (i < verses.length - 1) await new Promise((r) => setTimeout(r, 250));
    }

    // Refresh drafts for the currently-active verse
    if (activeVerseId) {
      try {
        const { data: drf } = await api.get(`/admin/translate/drafts/${activeVerseId}`);
        const map = {};
        (drf || []).forEach((d) => { map[d.language] = d; });
        setDrafts(map);
      } catch { /* ignore */ }
    }

    setBulkProgress(null);
    if (failed === 0) {
      setStatusMsg(`✓ Translated all ${verses.length} verses into ${targets.length} languages. Review drafts before publishing.`);
    } else {
      setError(`Translated ${verses.length - failed}/${verses.length} verses. ${failed} failed — retry the missing ones individually.`);
    }
  };

  const updateField = (field, val) => {
    setDrafts((prev) => ({
      ...prev,
      [activeLang]: { ...(prev[activeLang] || {}), [field]: val, is_draft: true, language: activeLang, verse_id: activeVerseId },
    }));
  };

  const currentDraft = drafts[activeLang] || {};
  const isPublished = currentDraft && currentDraft.is_draft === false && !!currentDraft.published_at;
  const isAI = !!currentDraft.is_ai_generated;

  // ---- Render ----
  return (
    <div className="space-y-5" data-testid="multilingual-editor-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Languages size={26} className="text-[#E95A34]" />
            Multilingual Editor
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Translate verses with Gemini AI. All AI output is saved as <strong>draft</strong> — review &amp; publish manually.
          </p>
        </div>
      </div>

      {/* Top: Item picker */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-xs font-semibold text-gray-700 mb-2">Content Item</label>
        <select
          data-testid="multi-item-select"
          className="w-full md:w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E95A34] focus:border-transparent"
          value={selectedItemId || ''}
          onChange={(e) => setSelectedItemId(e.target.value || null)}
          disabled={loadingItems}
        >
          <option value="">{loadingItems ? 'Loading…' : '-- Select content item --'}</option>
          {items.map((it) => (
            <option key={it._id} value={it._id}>
              [{it.category}] {it.title_hi || it.title_en || it.slug}
            </option>
          ))}
        </select>
      </div>

      {/* Status / errors */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-2 flex items-center gap-2 text-sm" data-testid="multi-error">
          <AlertCircle size={16} /> {error}
          <button className="ml-auto text-red-600" onClick={() => setError(null)}>×</button>
        </div>
      )}
      {statusMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2 flex items-center gap-2 text-sm" data-testid="multi-status">
          <CheckCircle2 size={16} /> {statusMsg}
          <button className="ml-auto text-green-600" onClick={() => setStatusMsg(null)}>×</button>
        </div>
      )}

      {selectedItemId && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Verses list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="multi-verses-list">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen size={16} /> Verses ({verses.length})
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loadingVerses && <div className="p-4 text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>}
              {!loadingVerses && verses.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No verses. Add some in Verse Manager.</div>
              )}
              {verses.map((v) => (
                <button
                  key={v._id}
                  onClick={() => setActiveVerseId(v._id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-orange-50 transition-colors flex items-center justify-between ${
                    activeVerseId === v._id ? 'bg-orange-50 border-l-4 border-l-[#E95A34]' : ''
                  }`}
                  data-testid={`multi-verse-${v.verse_num}`}
                >
                  <div>
                    <div className="text-xs text-gray-500 uppercase">{v.verse_type || 'shloka'} #{v.verse_num}</div>
                    <div className="text-sm text-gray-800 truncate max-w-[180px] mt-0.5">
                      {(v.sanskrit_text || '').split('\n')[0].slice(0, 40) || '—'}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Editor pane */}
          <div className="bg-white rounded-xl border border-gray-200" data-testid="multi-editor-pane">
            {!activeVerse ? (
              <div className="p-8 text-center text-sm text-gray-500">Select a verse on the left to begin.</div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Source preview */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-700">SOURCE</div>
                    <select
                      data-testid="multi-source-lang"
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                    >
                      {SOURCE_LANG_OPTIONS.map((l) => (
                        <option key={l.code} value={l.code}>{l.native} — {l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-gray-900" lang={sourceLang}>
                    {sourceText || <span className="italic text-gray-400">No source text</span>}
                  </div>
                  {sourceTransliteration && (
                    <div className="text-xs italic text-gray-600 mt-2">{sourceTransliteration}</div>
                  )}
                  {sourceMeaning && (
                    <div className="text-xs text-gray-700 mt-2 pt-2 border-t border-gray-200">
                      <strong>Meaning ({sourceLang}):</strong> {sourceMeaning}
                    </div>
                  )}
                </div>

                {/* AI translate buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAITranslate(false)}
                    disabled={translating || !!bulkProgress}
                    className="bg-[#E95A34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d24e2c] disabled:opacity-50 flex items-center gap-2"
                    data-testid="multi-ai-translate-current"
                  >
                    {translating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Translate ({activeLang.toUpperCase()})
                  </button>
                  <button
                    onClick={() => handleAITranslate(true)}
                    disabled={translating || !!bulkProgress}
                    className="bg-[#7B3F61] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#62304d] disabled:opacity-50 flex items-center gap-2"
                    data-testid="multi-ai-translate-all"
                  >
                    <Wand2 size={14} /> Translate All Languages
                  </button>
                  <button
                    onClick={handleTranslateWholeItem}
                    disabled={translating || !!bulkProgress || !verses.length}
                    className="bg-gradient-to-r from-[#E95A34] to-[#7B3F61] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    data-testid="multi-ai-translate-whole-item"
                  >
                    <Sparkles size={14} /> AI Translate Whole Item
                    <span className="bg-white/20 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      {verses.length} verses × {TARGET_LANGUAGES_PHASE1.filter((l) => l.code !== sourceLang).length} langs
                    </span>
                  </button>
                </div>

                {bulkProgress && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3" data-testid="multi-bulk-progress">
                    <div className="flex items-center justify-between text-xs font-semibold text-purple-900 mb-2">
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Translating verse {bulkProgress.done}/{bulkProgress.total}
                        {bulkProgress.failed > 0 && <span className="text-red-700 ml-2">· {bulkProgress.failed} failed</span>}
                      </span>
                      <span>· {Math.round((bulkProgress.done / bulkProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#E95A34] to-[#7B3F61] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Language tabs */}
                <div className="border-b border-gray-200 flex flex-wrap gap-1">
                  {TARGET_LANGUAGES_PHASE1.map((lang) => {
                    const has = !!drafts[lang.code];
                    const published = has && drafts[lang.code].is_draft === false;
                    const ai = has && drafts[lang.code].is_ai_generated;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => setActiveLang(lang.code)}
                        className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                          activeLang === lang.code
                            ? 'border-[#E95A34] text-[#E95A34]'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                        data-testid={`multi-tab-${lang.code}`}
                      >
                        <span lang={lang.code}>{lang.native}</span>
                        <span className="text-[10px] text-gray-400 uppercase">{lang.code}</span>
                        {published && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Published" />}
                        {!published && has && (
                          <span className={`w-1.5 h-1.5 rounded-full ${ai ? 'bg-purple-500' : 'bg-amber-500'}`}
                                title={ai ? 'AI Draft' : 'Manual Draft'} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Editor for active language */}
                <div className="space-y-3" data-testid={`multi-editor-${activeLang}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      Editing: <strong>{TARGET_LANGUAGES_PHASE1.find((l) => l.code === activeLang)?.native}</strong>
                      {isPublished && <span className="ml-2 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 text-[10px] font-semibold">PUBLISHED</span>}
                      {!isPublished && isAI && <span className="ml-2 text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-0.5 text-[10px] font-semibold">AI DRAFT — REVIEW BEFORE PUBLISH</span>}
                      {!isPublished && currentDraft && !isAI && Object.keys(currentDraft).length > 0 && (
                        <span className="ml-2 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-[10px] font-semibold">DRAFT</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Text (verse / mantra in {activeLang})</label>
                    <UnicodeRichEditor
                      value={currentDraft.text || ''}
                      onChange={(v) => updateField('text', v)}
                      lang={activeLang}
                      testId={`multi-text-${activeLang}`}
                      placeholder="Translated verse text…"
                      minHeight="120px"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Transliteration (Latin script)</label>
                    <UnicodeRichEditor
                      value={currentDraft.transliteration || ''}
                      onChange={(v) => updateField('transliteration', v)}
                      lang="en"
                      testId={`multi-trans-${activeLang}`}
                      placeholder="Romanized pronunciation guide…"
                      minHeight="80px"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Meaning (in {activeLang})</label>
                    <UnicodeRichEditor
                      value={currentDraft.meaning || ''}
                      onChange={(v) => updateField('meaning', v)}
                      lang={activeLang}
                      testId={`multi-meaning-${activeLang}`}
                      placeholder="Prose explanation of the verse…"
                      minHeight="140px"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                      data-testid="multi-save-draft"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Draft
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                      data-testid="multi-publish"
                    >
                      {publishing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Publish {activeLang.toUpperCase()}
                    </button>
                    {drafts[activeLang] && drafts[activeLang].is_draft && (
                      <button
                        onClick={handleDeleteDraft}
                        className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-2"
                        data-testid="multi-delete-draft"
                      >
                        <Trash2 size={14} /> Delete Draft
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
