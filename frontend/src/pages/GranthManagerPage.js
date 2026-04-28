import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Library, BookOpen, ChevronRight, ChevronDown, ArrowLeft, Globe, Eye, Search, Edit, Plus, X } from 'lucide-react';
import LivePreviewModal from '../components/LivePreviewModal';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृत' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
];

export default function GranthManagerPage() {
  const { api } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterVerses, setChapterVerses] = useState(null);
  const [viewLang, setViewLang] = useState('hi');
  const [verseSearch, setVerseSearch] = useState('');
  const [editingVerse, setEditingVerse] = useState(null);
  const [editForm, setEditForm] = useState({ sanskrit: '', transliteration: '', meaning: {} });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/granth/books');
      setBooks(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchHierarchy = async (bookId) => {
    try {
      const { data } = await api.get(`/granth/hierarchy/${bookId}`);
      setHierarchy(data);
      setSelectedBook(bookId);
      setSelectedChapter(null);
      setChapterVerses(null);
    } catch (err) { console.error(err); }
  };

  const fetchChapterVerses = async (chapterId) => {
    try {
      const { data } = await api.get(`/granth/chapter-verses/${chapterId}?lang=${viewLang}`);
      setChapterVerses(data);
      setSelectedChapter(chapterId);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (selectedChapter) fetchChapterVerses(selectedChapter);
  }, [viewLang]);

  const handleSaveVerse = async () => {
    if (!editingVerse) return;
    try {
      await api.put(`/granth/verses/${editingVerse}`, editForm);
      setEditingVerse(null);
      if (selectedChapter) fetchChapterVerses(selectedChapter);
    } catch (err) { console.error(err); }
  };

  const goBack = () => {
    if (chapterVerses) { setChapterVerses(null); setSelectedChapter(null); }
    else if (hierarchy) { setHierarchy(null); setSelectedBook(null); }
  };

  // Books Grid View
  if (!selectedBook) {
    return (
      <div className="space-y-6" data-testid="granth-manager-page">
        <div className="animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Sacred Texts</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Divya Granth Manager</h1>
          <p className="text-sm text-[#7A8690] mt-1">Book &rarr; Chapter &rarr; Verse — Full hierarchical management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-56 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)
          ) : books.map(book => (
            <div
              key={book._id}
              onClick={() => fetchHierarchy(book._id)}
              className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden hover:shadow-md hover:-translate-y-[2px] transition-all cursor-pointer group"
              data-testid={`granth-book-${book._id}`}
            >
              <div className="h-32 bg-gradient-to-br from-[#FEF0EC] to-[#FDDDD4] flex items-center justify-center">
                <Library size={40} className="text-[#E95A34] opacity-50 group-hover:opacity-80 transition-opacity" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold tracking-tight mb-1" style={{ fontFamily: 'Manrope' }}>
                  {book.title_en || book.title?.en || 'Unknown'}
                </h3>
                <p className="text-sm text-[#E95A34] mb-2">{book.title_hi || book.title?.hi || ''}</p>
                <p className="text-xs text-[#7A8690] line-clamp-2">{book.description_en || book.description?.en || ''}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F3EDEA]">
                  <div className="flex gap-4 text-xs text-[#7A8690]">
                    <span>{book.total_chapters} Chapters</span>
                    <span>{(book.total_verses || 0).toLocaleString()} Verses</span>
                  </div>
                  <ChevronRight size={16} className="text-[#989EA4] group-hover:text-[#E95A34] transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Chapter List View
  if (hierarchy && !chapterVerses) {
    return (
      <div className="space-y-6" data-testid="granth-chapters-view">
        <div className="flex items-center gap-4 animate-fade-in">
          <button onClick={goBack} className="p-2 hover:bg-[#F3EDEA] rounded-lg"><ArrowLeft size={18} /></button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">
              {hierarchy.book?.title_en || hierarchy.book?.title?.en}
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
              {hierarchy.book?.title_hi || hierarchy.book?.title?.hi} — Chapters
            </h1>
            <p className="text-sm text-[#7A8690] mt-1">{hierarchy.total_chapters} chapters</p>
          </div>
        </div>

        <div className="space-y-2 animate-fade-in">
          {hierarchy.chapters?.map((ch) => (
            <div
              key={ch.id}
              onClick={() => fetchChapterVerses(ch.id)}
              className="bg-white rounded-xl border border-[#E8E4E1] p-4 hover:shadow-sm hover:border-[#E95A34] transition-all cursor-pointer group"
              data-testid={`granth-chapter-${ch.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 flex items-center justify-center bg-[#FEF0EC] rounded-lg text-[#E95A34] text-sm font-bold">
                    {ch.chapter_num}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#374652]">{ch.title_hi}</h3>
                    <p className="text-xs text-[#7A8690]">{ch.title_en} &bull; {ch.verse_count} verses</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#989EA4] group-hover:text-[#E95A34]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Verse Reader View
  if (chapterVerses) {
    const filteredVerses = verseSearch
      ? chapterVerses.verses.filter(v => v.sanskrit?.includes(verseSearch) || v.transliteration?.toLowerCase().includes(verseSearch.toLowerCase()) || v.display_meaning?.includes(verseSearch))
      : chapterVerses.verses;

    return (
      <div className="space-y-6" data-testid="granth-verses-view">
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="p-2 hover:bg-[#F3EDEA] rounded-lg"><ArrowLeft size={18} /></button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">
                Chapter {chapterVerses.chapter?.chapter_num || chapterVerses.chapter?.title?.en || ''}
              </p>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
                {chapterVerses.chapter?.title_hi || chapterVerses.chapter?.title?.hi || 'Verses'}
              </h1>
              <p className="text-sm text-[#7A8690] mt-0.5">{chapterVerses.total} verses</p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-[#7A8690]" />
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setViewLang(l.code)}
                data-testid={`granth-lang-${l.code}`}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${viewLang === l.code ? 'bg-[#E95A34] text-white' : 'bg-[#F3EDEA] text-[#7A8690] hover:bg-[#E8E4E1]'}`}
              >
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative animate-fade-in">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#989EA4]" />
          <input
            value={verseSearch}
            onChange={(e) => setVerseSearch(e.target.value)}
            placeholder="Search in verses..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
          />
        </div>

        {/* Verses */}
        <div className="space-y-3 animate-fade-in">
          {filteredVerses.map((verse) => (
            <div key={verse._id || verse.id} className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#E95A34] px-2 py-0.5 bg-[#FEF0EC] rounded">
                    Verse {verse.verse_num}
                  </span>
                  <button
                    onClick={() => {
                      setEditingVerse(verse._id || verse.id);
                      setEditForm({
                        sanskrit: verse.sanskrit || '',
                        transliteration: verse.transliteration || '',
                        meaning: verse.meaning || {},
                      });
                    }}
                    className="p-1.5 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]"
                    data-testid={`edit-verse-${verse.verse_num}`}
                  >
                    <Edit size={14} />
                  </button>
                </div>

                {/* Original Sanskrit */}
                <p className="text-base font-medium text-[#374652] leading-relaxed whitespace-pre-wrap mb-3">
                  {verse.sanskrit}
                </p>

                {/* Transliteration */}
                {verse.transliteration && (
                  <p className="text-sm text-[#7A8690] italic leading-relaxed whitespace-pre-wrap mb-3">
                    {verse.transliteration}
                  </p>
                )}

                {/* Meaning */}
                {verse.display_meaning && (
                  <div className="border-t border-[#F3EDEA] pt-3">
                    <p className="text-xs font-bold text-[#D08465] mb-1">
                      {viewLang === 'hi' ? 'अर्थ' : viewLang === 'sa' ? 'अर्थः' : 'Meaning'} ({LANGUAGES.find(l => l.code === viewLang)?.native}):
                    </p>
                    <p className="text-sm text-[#374652] leading-relaxed whitespace-pre-wrap">
                      {verse.display_meaning}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Verse Modal */}
        {editingVerse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl m-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Edit Verse</h3>
                <button onClick={() => setEditingVerse(null)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Original Text (Sanskrit)</label>
                  <textarea
                    value={editForm.sanskrit}
                    onChange={(e) => setEditForm({ ...editForm, sanskrit: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Transliteration (Romanized)</label>
                  <textarea
                    value={editForm.transliteration}
                    onChange={(e) => setEditForm({ ...editForm, transliteration: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Meaning / Translation (Multilingual)</label>
                  <div className="flex gap-1 mb-2">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => setViewLang(l.code)}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${viewLang === l.code ? 'bg-[#E95A34] text-white' : 'bg-[#F3EDEA] text-[#7A8690]'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={editForm.meaning?.[viewLang] || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      meaning: { ...editForm.meaning, [viewLang]: e.target.value }
                    })}
                    rows={4}
                    className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"
                    placeholder={`Meaning in ${LANGUAGES.find(l => l.code === viewLang)?.label}...`}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
                <button onClick={() => setEditingVerse(null)} className="px-4 py-2 text-sm text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
                <button onClick={handleSaveVerse} className="px-4 py-2 bg-[#E95A34] text-white text-sm font-medium rounded-lg" data-testid="save-verse-btn">Save Verse</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
