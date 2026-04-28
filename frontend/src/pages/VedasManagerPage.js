import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookMarked, ChevronRight, ArrowLeft, Globe, Search, Edit, X, Upload, Loader2, Eye } from 'lucide-react';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृत' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
];

export default function VedasManagerPage() {
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
  const [editForm, setEditForm] = useState({ text_sa: '', transliteration: '', meaning: {} });
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBookId, setUploadBookId] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchBooks(); }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/vedas/books');
      setBooks(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchHierarchy = async (bookId) => {
    try {
      const { data } = await api.get(`/vedas/hierarchy/${bookId}`);
      setHierarchy(data);
      setSelectedBook(bookId);
      setSelectedChapter(null);
      setChapterVerses(null);
    } catch (err) { console.error(err); }
  };

  const fetchChapterVerses = async (chapterId) => {
    try {
      const { data } = await api.get(`/vedas/chapter-verses/${chapterId}?lang=${viewLang}`);
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
      await api.put(`/vedas/verses/${editingVerse}`, editForm);
      setEditingVerse(null);
      if (selectedChapter) fetchChapterVerses(selectedChapter);
    } catch (err) { console.error(err); }
  };

  const handleUploadPDF = async () => {
    if (!uploadFile || !uploadBookId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('book_id', uploadBookId);
      await api.post('/vedas/upload-parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setUploadModal(false);
      setUploadFile(null);
      fetchBooks();
      if (selectedBook) fetchHierarchy(selectedBook);
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const goBack = () => {
    if (chapterVerses) { setChapterVerses(null); setSelectedChapter(null); }
    else if (hierarchy) { setHierarchy(null); setSelectedBook(null); }
  };

  const vedas = books.filter(b => b.category === 'veda');
  const puranas = books.filter(b => b.category === 'purana');

  // Books Grid View
  if (!selectedBook) {
    return (
      <div className="space-y-8" data-testid="vedas-manager-page">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Ancient Wisdom</p>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Vedas & Puranas</h1>
            <p className="text-sm text-[#7A8690] mt-1">Book &rarr; Chapter/Mandala &rarr; Verse &mdash; Full hierarchical management</p>
          </div>
          <button onClick={() => setUploadModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] text-white rounded-lg text-sm font-medium hover:bg-[#D04A28] transition-colors" data-testid="upload-pdf-btn">
            <Upload size={16} /> Upload PDF
          </button>
        </div>

        {/* Vedas Section */}
        <div className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Vedas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-56 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)
            ) : vedas.map(book => (
              <div
                key={book._id}
                onClick={() => fetchHierarchy(book._id)}
                className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden hover:shadow-md hover:-translate-y-[2px] transition-all cursor-pointer group"
                data-testid={`veda-book-${book._id}`}
              >
                <div className="h-24 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                  <BookMarked size={32} className="text-[#E95A34] opacity-50 group-hover:opacity-80 transition-opacity" />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold tracking-tight" style={{ fontFamily: 'Manrope' }}>{book.title_en}</h3>
                  <p className="text-sm text-[#E95A34]">{book.title_hi}</p>
                  <p className="text-xs text-[#7A8690] mt-1 line-clamp-2">{book.description_en}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F3EDEA]">
                    <span className="text-xs text-[#7A8690]">{book.total_chapters} Chapters</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${book.parsing_status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {book.parsing_status || 'pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Puranas Section */}
        {puranas.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Puranas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {puranas.map(book => (
                <div
                  key={book._id}
                  onClick={() => fetchHierarchy(book._id)}
                  className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden hover:shadow-md hover:-translate-y-[2px] transition-all cursor-pointer group"
                  data-testid={`purana-book-${book._id}`}
                >
                  <div className="h-24 bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
                    <BookMarked size={32} className="text-purple-500 opacity-50 group-hover:opacity-80 transition-opacity" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold">{book.title_en}</h3>
                    <p className="text-sm text-purple-600">{book.title_hi}</p>
                    <p className="text-xs text-[#7A8690] mt-1 line-clamp-2">{book.description_en}</p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F3EDEA]">
                      <span className="text-xs text-[#7A8690]">{book.total_chapters} Chapters</span>
                      <ChevronRight size={14} className="text-[#989EA4]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload PDF Modal */}
        {uploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-lg shadow-xl m-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Upload PDF for Parsing</h3>
                <button onClick={() => setUploadModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Book</label>
                  <select value={uploadBookId} onChange={(e) => setUploadBookId(e.target.value)} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm">
                    <option value="">Choose a book...</option>
                    {books.map(b => <option key={b._id} value={b._id}>{b.title_en} ({b.title_hi})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">PDF File</label>
                  <div className="border-2 border-dashed border-[#E8E4E1] rounded-lg p-6 text-center cursor-pointer hover:border-[#E95A34] transition-colors" onClick={() => document.getElementById('vedas-pdf-input').click()}>
                    <Upload size={24} className="mx-auto text-[#989EA4] mb-2" />
                    <p className="text-sm text-[#374652]">{uploadFile ? uploadFile.name : 'Click to select PDF'}</p>
                    <input id="vedas-pdf-input" type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={(e) => setUploadFile(e.target.files[0])} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
                <button onClick={() => setUploadModal(false)} className="px-4 py-2 text-sm text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
                <button onClick={handleUploadPDF} disabled={uploading || !uploadFile || !uploadBookId} className="px-4 py-2 bg-[#E95A34] text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Parsing...</> : <>Upload & Parse</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chapter List View
  if (hierarchy && !chapterVerses) {
    const bookTitle = hierarchy.book?.title_en || hierarchy.book?.title?.en || '';
    const bookTitleHi = hierarchy.book?.title_hi || hierarchy.book?.title?.hi || '';
    return (
      <div className="space-y-6" data-testid="vedas-chapters-view">
        <div className="flex items-center gap-4 animate-fade-in">
          <button onClick={goBack} className="p-2 hover:bg-[#F3EDEA] rounded-lg" data-testid="back-to-books"><ArrowLeft size={18} /></button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">{bookTitle}</p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{bookTitleHi} &mdash; Chapters</h1>
            <p className="text-sm text-[#7A8690] mt-1">{hierarchy.total_chapters} chapters/mandalas</p>
          </div>
        </div>

        <div className="space-y-2 animate-fade-in">
          {hierarchy.chapters?.map((ch) => (
            <div
              key={ch.id}
              onClick={() => fetchChapterVerses(ch.id)}
              className="bg-white rounded-xl border border-[#E8E4E1] p-4 hover:shadow-sm hover:border-[#E95A34] transition-all cursor-pointer group"
              data-testid={`vedas-chapter-${ch.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 flex items-center justify-center bg-amber-50 rounded-lg text-amber-700 text-sm font-bold">
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
          {(!hierarchy.chapters || hierarchy.chapters.length === 0) && (
            <div className="bg-white rounded-xl border border-[#E8E4E1] p-12 text-center">
              <BookMarked size={32} className="mx-auto text-[#989EA4] mb-3" />
              <p className="text-sm text-[#7A8690]">No chapters yet. Upload a PDF to parse content for this book.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Verse Reader View
  if (chapterVerses) {
    const filteredVerses = verseSearch
      ? chapterVerses.verses.filter(v => v.text_sa?.includes(verseSearch) || v.transliteration?.toLowerCase().includes(verseSearch.toLowerCase()) || v.display_meaning?.includes(verseSearch))
      : chapterVerses.verses;

    return (
      <div className="space-y-6" data-testid="vedas-verses-view">
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="p-2 hover:bg-[#F3EDEA] rounded-lg"><ArrowLeft size={18} /></button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">
                {chapterVerses.chapter?.title_en || chapterVerses.chapter?.title?.en || 'Chapter'}
              </p>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
                {chapterVerses.chapter?.title_hi || chapterVerses.chapter?.title?.hi || 'Verses'}
              </h1>
              <p className="text-sm text-[#7A8690] mt-0.5">{chapterVerses.total} verses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-[#7A8690]" />
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setViewLang(l.code)} data-testid={`vedas-lang-${l.code}`}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${viewLang === l.code ? 'bg-[#E95A34] text-white' : 'bg-[#F3EDEA] text-[#7A8690] hover:bg-[#E8E4E1]'}`}>
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="relative animate-fade-in">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#989EA4]" />
          <input value={verseSearch} onChange={(e) => setVerseSearch(e.target.value)} placeholder="Search in verses..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]" />
        </div>

        <div className="space-y-3 animate-fade-in">
          {filteredVerses.map((verse) => (
            <div key={verse._id || verse.id} className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-amber-700 px-2 py-0.5 bg-amber-50 rounded">Verse {verse.verse_num}</span>
                  <button onClick={() => { setEditingVerse(verse._id || verse.id); setEditForm({ text_sa: verse.text_sa || '', transliteration: verse.transliteration || '', meaning: verse.meaning || {} }); }}
                    className="p-1.5 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] hover:text-[#E95A34]" data-testid={`edit-veda-verse-${verse.verse_num}`}>
                    <Edit size={14} />
                  </button>
                </div>
                <p className="text-base font-medium text-[#374652] leading-relaxed whitespace-pre-wrap mb-3">{verse.text_sa}</p>
                {verse.transliteration && <p className="text-sm text-[#7A8690] italic leading-relaxed whitespace-pre-wrap mb-3">{verse.transliteration}</p>}
                {verse.display_meaning && (
                  <div className="border-t border-[#F3EDEA] pt-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">{viewLang === 'hi' ? 'अर्थ' : 'Meaning'} ({LANGUAGES.find(l => l.code === viewLang)?.native}):</p>
                    <p className="text-sm text-[#374652] leading-relaxed whitespace-pre-wrap">{verse.display_meaning}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredVerses.length === 0 && (
            <div className="bg-white rounded-xl border border-[#E8E4E1] p-12 text-center">
              <p className="text-sm text-[#7A8690]">No verses found. Upload a PDF to parse content.</p>
            </div>
          )}
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
                  <textarea value={editForm.text_sa} onChange={(e) => setEditForm({ ...editForm, text_sa: e.target.value })} rows={4}
                    className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Transliteration</label>
                  <textarea value={editForm.transliteration} onChange={(e) => setEditForm({ ...editForm, transliteration: e.target.value })} rows={3}
                    className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Meaning (Multilingual)</label>
                  <div className="flex gap-1 mb-2">
                    {LANGUAGES.map(l => (
                      <button key={l.code} onClick={() => setViewLang(l.code)}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${viewLang === l.code ? 'bg-[#E95A34] text-white' : 'bg-[#F3EDEA] text-[#7A8690]'}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={editForm.meaning?.[viewLang] || ''} onChange={(e) => setEditForm({ ...editForm, meaning: { ...editForm.meaning, [viewLang]: e.target.value } })} rows={4}
                    className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"
                    placeholder={`Meaning in ${LANGUAGES.find(l => l.code === viewLang)?.label}...`} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
                <button onClick={() => setEditingVerse(null)} className="px-4 py-2 text-sm text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
                <button onClick={handleSaveVerse} className="px-4 py-2 bg-[#E95A34] text-white text-sm font-medium rounded-lg" data-testid="save-veda-verse-btn">Save Verse</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
