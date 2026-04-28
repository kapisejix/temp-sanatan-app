import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, ChevronDown, ChevronRight, Edit, Save, X, Loader2, Plus, Languages } from 'lucide-react';

export default function VerseManagerPage() {
  const { api, user } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [versesLoading, setVersesLoading] = useState(false);
  const [expandedVerse, setExpandedVerse] = useState(null);
  const [meanings, setMeanings] = useState({});
  const [editingVerse, setEditingVerse] = useState(null);
  const [verseForm, setVerseForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [addMeaningFor, setAddMeaningFor] = useState(null);
  const [meaningForm, setMeaningForm] = useState({ language: 'hi', meaning: '', word_breakdown: [] });
  const [showAddVerse, setShowAddVerse] = useState(false);
  const [newVerseForm, setNewVerseForm] = useState({ verse_num: 1, verse_type: 'shloka', sanskrit_text: '', transliteration: '' });

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/content/items?limit=100');
        setItems(data.items || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [api]);

  const loadVerses = async (itemId) => {
    setSelectedItem(itemId);
    setVersesLoading(true);
    setExpandedVerse(null);
    try {
      const { data } = await api.get(`/content/items/${itemId}/verses`);
      setVerses(data);
    } catch (err) { console.error(err); }
    finally { setVersesLoading(false); }
  };

  const loadMeanings = async (verseId) => {
    if (expandedVerse === verseId) { setExpandedVerse(null); return; }
    setExpandedVerse(verseId);
    try {
      const { data } = await api.get(`/content/verses/${verseId}/meanings`);
      setMeanings(prev => ({ ...prev, [verseId]: data }));
    } catch (err) { console.error(err); }
  };

  const startEditVerse = (verse) => {
    setEditingVerse(verse._id);
    setVerseForm({ sanskrit_text: verse.sanskrit_text || '', transliteration: verse.transliteration || '', verse_type: verse.verse_type || 'shloka' });
  };

  const saveVerse = async (verseId) => {
    setSaving(true);
    try {
      await api.put(`/content/verses/${verseId}`, verseForm);
      setEditingVerse(null);
      if (selectedItem) loadVerses(selectedItem);
    } catch (err) { alert('Error saving verse'); }
    finally { setSaving(false); }
  };

  const saveMeaning = async (verseId) => {
    setSaving(true);
    try {
      await api.post(`/content/verses/${verseId}/meanings`, meaningForm);
      setAddMeaningFor(null);
      setMeaningForm({ language: 'hi', meaning: '', word_breakdown: [] });
      const { data } = await api.get(`/content/verses/${verseId}/meanings`);
      setMeanings(prev => ({ ...prev, [verseId]: data }));
    } catch (err) { alert('Error saving meaning'); }
    finally { setSaving(false); }
  };

  const addNewVerse = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await api.post(`/content/items/${selectedItem}/verses`, newVerseForm);
      setShowAddVerse(false);
      setNewVerseForm({ verse_num: verses.length + 2, verse_type: 'shloka', sanskrit_text: '', transliteration: '' });
      loadVerses(selectedItem);
    } catch (err) { alert('Error adding verse'); }
    finally { setSaving(false); }
  };

  const selectedItemData = items.find(i => i._id === selectedItem);
  const isEditable = user?.role !== 'moderator';

  return (
    <div className="space-y-6" data-testid="verse-manager-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Edit Verses</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Verse Manager</h1>
        <p className="text-sm text-[#7A8690] mt-1">Edit Sanskrit text, transliteration, and multilingual meanings inline</p>
      </div>

      {/* Item Selector */}
      <div className="bg-white rounded-xl border border-[#E8E4E1] p-4 animate-fade-in">
        <label className="block text-sm font-medium mb-2">Select Content Item</label>
        <select value={selectedItem || ''} onChange={(e) => e.target.value && loadVerses(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="verse-item-select">
          <option value="">-- Select a content item --</option>
          {items.map(item => (
            <option key={item._id} value={item._id}>
              {item.title_en} ({item.title_hi}) - {item.category?.replace(/_/g, ' ')} - {item.total_verses} verses
            </option>
          ))}
        </select>
      </div>

      {selectedItem && (
        <div className="space-y-3 animate-fade-in">
          {selectedItemData && (
            <div className="bg-[#FEF0EC] rounded-xl border border-[#FDDDD4] p-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold" style={{ fontFamily: 'Manrope' }}>{selectedItemData.title_en}</h3>
                <p className="text-sm text-[#D08465]">{selectedItemData.title_hi} | {verses.length} verses loaded</p>
              </div>
              {isEditable && (
                <button onClick={() => { setNewVerseForm({ verse_num: verses.length + 1, verse_type: 'shloka', sanskrit_text: '', transliteration: '' }); setShowAddVerse(true); }}
                  className="flex items-center gap-2 px-3 py-2 bg-[#E95A34] text-white rounded-lg text-sm font-medium hover:bg-[#D04A28]" data-testid="add-verse-btn">
                  <Plus size={14} /> Add Verse
                </button>
              )}
            </div>
          )}

          {/* Add Verse Form */}
          {showAddVerse && (
            <div className="bg-white rounded-xl border-2 border-[#E95A34] p-5 space-y-3" data-testid="add-verse-form">
              <h4 className="text-sm font-semibold">Add New Verse</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Verse Number</label>
                  <input type="number" value={newVerseForm.verse_num} onChange={(e) => setNewVerseForm({ ...newVerseForm, verse_num: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Verse Type</label>
                  <select value={newVerseForm.verse_type} onChange={(e) => setNewVerseForm({ ...newVerseForm, verse_type: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm mt-1">
                    <option value="shloka">Shloka</option>
                    <option value="doha">Doha</option>
                    <option value="chaupai">Chaupai</option>
                    <option value="mantra">Mantra</option>
                    <option value="stanza">Stanza</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Sanskrit Text</label>
                <textarea value={newVerseForm.sanskrit_text} onChange={(e) => setNewVerseForm({ ...newVerseForm, sanskrit_text: e.target.value })} rows={3} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm mt-1" placeholder="Enter Sanskrit/Hindi text..." data-testid="new-verse-text" />
              </div>
              <div>
                <label className="text-xs font-medium">Transliteration</label>
                <textarea value={newVerseForm.transliteration} onChange={(e) => setNewVerseForm({ ...newVerseForm, transliteration: e.target.value })} rows={2} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm mt-1" placeholder="Enter transliteration..." />
              </div>
              <div className="flex gap-2">
                <button onClick={addNewVerse} disabled={saving} className="px-4 py-2 bg-[#E95A34] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save Verse
                </button>
                <button onClick={() => setShowAddVerse(false)} className="px-4 py-2 text-sm text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          {versesLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#E95A34]" /></div>
          ) : verses.length === 0 ? (
            <div className="text-center py-12 text-[#989EA4] bg-white rounded-xl border border-[#E8E4E1]">
              <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
              <p>No verses found for this item</p>
            </div>
          ) : verses.map((verse) => (
            <div key={verse._id} className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden" data-testid={`verse-${verse._id}`}>
              <button onClick={() => loadMeanings(verse._id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8F3F1] transition-colors text-left">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 bg-[#FEF0EC] rounded-lg flex items-center justify-center text-xs font-bold text-[#E95A34]">{verse.verse_num}</span>
                  <div>
                    <p className="text-sm font-medium text-[#374652] line-clamp-1">{verse.sanskrit_text?.split('\n')[0]}</p>
                    <p className="text-xs text-[#7A8690] capitalize">{verse.verse_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditable && (
                    <button onClick={(e) => { e.stopPropagation(); startEditVerse(verse); }} className="p-1 hover:bg-[#FEF0EC] rounded-md text-[#7A8690] hover:text-[#E95A34]">
                      <Edit size={14} />
                    </button>
                  )}
                  {expandedVerse === verse._id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>

              {/* Inline Edit */}
              {editingVerse === verse._id && (
                <div className="px-5 py-4 border-t border-[#E95A34] bg-[#FEF0EC] space-y-3" data-testid={`edit-verse-${verse._id}`}>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#7A8690]">Sanskrit Text</label>
                      <textarea value={verseForm.sanskrit_text} onChange={(e) => setVerseForm({ ...verseForm, sanskrit_text: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#7A8690]">Verse Type</label>
                      <select value={verseForm.verse_type} onChange={(e) => setVerseForm({ ...verseForm, verse_type: e.target.value })} className="w-full mt-1 px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm">
                        <option value="shloka">Shloka</option><option value="doha">Doha</option><option value="chaupai">Chaupai</option><option value="mantra">Mantra</option><option value="stanza">Stanza</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#7A8690]">Transliteration</label>
                    <textarea value={verseForm.transliteration} onChange={(e) => setVerseForm({ ...verseForm, transliteration: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveVerse(verse._id)} disabled={saving} className="px-3 py-1.5 bg-[#E95A34] text-white rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50">
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                    </button>
                    <button onClick={() => setEditingVerse(null)} className="px-3 py-1.5 text-xs text-[#7A8690] hover:bg-white rounded-lg">Cancel</button>
                  </div>
                </div>
              )}

              {/* Expanded View with Meanings */}
              {expandedVerse === verse._id && editingVerse !== verse._id && (
                <div className="px-5 py-4 border-t border-[#E8E4E1] bg-[#F8F3F1] space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#7A8690]">Sanskrit</label>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-[#374652]">{verse.sanskrit_text}</p>
                  </div>
                  {verse.transliteration && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#7A8690]">Transliteration</label>
                      <p className="mt-1 text-sm text-[#7A8690] italic">{verse.transliteration}</p>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#7A8690]">Meanings</label>
                      {isEditable && (
                        <button onClick={() => { setAddMeaningFor(verse._id); setMeaningForm({ language: 'hi', meaning: '', word_breakdown: [] }); }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-[#E95A34] hover:bg-[#FEF0EC] rounded-md" data-testid={`add-meaning-${verse._id}`}>
                          <Languages size={12} /> Add Meaning
                        </button>
                      )}
                    </div>
                    {(meanings[verse._id] || []).length === 0 ? (
                      <p className="text-xs text-[#989EA4]">No meanings added yet</p>
                    ) : (meanings[verse._id] || []).map((m, i) => (
                      <div key={i} className="mt-2 p-3 bg-white rounded-lg border border-[#E8E4E1]">
                        <span className="text-xs font-medium text-[#E95A34] uppercase">{m.language}</span>
                        <p className="text-sm text-[#374652] mt-1">{m.meaning}</p>
                        {m.word_breakdown?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {m.word_breakdown.map((w, j) => (
                              <span key={j} className="text-xs px-2 py-1 bg-[#FEF0EC] rounded-md text-[#D08465]">
                                {w.word} = {w.meaning_en || w.meaning_hi}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Meaning Form */}
                    {addMeaningFor === verse._id && (
                      <div className="mt-3 p-3 bg-white rounded-lg border-2 border-[#E95A34]" data-testid={`meaning-form-${verse._id}`}>
                        <div className="grid grid-cols-4 gap-3 mb-2">
                          <select value={meaningForm.language} onChange={(e) => setMeaningForm({ ...meaningForm, language: e.target.value })} className="px-2 py-1.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-md text-xs">
                            <option value="hi">Hindi</option><option value="en">English</option><option value="sa">Sanskrit</option><option value="mr">Marathi</option><option value="gu">Gujarati</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="bn">Bengali</option>
                          </select>
                        </div>
                        <textarea value={meaningForm.meaning} onChange={(e) => setMeaningForm({ ...meaningForm, meaning: e.target.value })} rows={3} placeholder="Enter meaning..." className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm mb-2" data-testid={`meaning-text-${verse._id}`} />
                        <div className="flex gap-2">
                          <button onClick={() => saveMeaning(verse._id)} disabled={saving} className="px-3 py-1.5 bg-[#E95A34] text-white rounded-md text-xs font-medium flex items-center gap-1">
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                          </button>
                          <button onClick={() => setAddMeaningFor(null)} className="px-3 py-1.5 text-xs text-[#7A8690]">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
