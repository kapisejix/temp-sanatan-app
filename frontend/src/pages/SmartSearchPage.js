import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, BookOpen, Scroll, BookMarked, Database, Globe, X } from 'lucide-react';

const SOURCE_ICONS = { bhakti: Scroll, granth: BookOpen, vedas: BookMarked, knowledge_base: Database };
const SOURCE_LABELS = { bhakti: 'Bhakti', granth: 'Divya Granth', vedas: 'Vedas & Puranas', knowledge_base: 'Knowledge Base' };
const SOURCE_COLORS = { bhakti: '#E95A34', granth: '#B45309', vedas: '#0369A1', knowledge_base: '#7C3AED' };

const LANGUAGES = [
  { code: 'hi', label: 'HI' }, { code: 'en', label: 'EN' }, { code: 'sa', label: 'SA' },
];

export default function SmartSearchPage() {
  const { api } = useAuth();
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState('hi');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}&lang=${lang}&limit=30`);
      setResults(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [api, lang]);

  const handleInput = (val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const contentItems = results?.results?.filter(r => r.type === 'content_item') || [];
  const verses = results?.results?.filter(r => r.type === 'verse') || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="smart-search-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Discovery</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Smart Search</h1>
        <p className="text-sm text-[#7A8690] mt-1">Search across all scriptures — Vedas, Gita, Chalisas, Mantras, Puranas</p>
      </div>

      {/* Search Bar */}
      <div className="relative animate-fade-in">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#989EA4]" />
        <input
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Search by Sanskrit text, meaning, deity name, book title..."
          className="w-full pl-12 pr-32 py-4 bg-white border border-[#E8E4E1] rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#E95A34] shadow-sm"
          data-testid="smart-search-input"
          autoFocus
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); if (query.length >= 2) search(query); }}
              className={`px-2 py-1 rounded text-xs font-medium ${lang === l.code ? 'bg-[#E95A34] text-white' : 'bg-[#F3EDEA] text-[#7A8690]'}`}>
              {l.label}
            </button>
          ))}
          {query && <button onClick={() => { setQuery(''); setResults(null); }} className="p-1 ml-1 text-[#989EA4] hover:text-[#374652]"><X size={16} /></button>}
        </div>
      </div>

      {loading && <div className="text-center py-4 text-sm text-[#989EA4]">Searching scriptures...</div>}

      {results && !loading && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm text-[#7A8690]">{results.total} result{results.total !== 1 ? 's' : ''} for "<span className="font-medium text-[#374652]">{results.query}</span>"</p>

          {/* Content Items */}
          {contentItems.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A8690] mb-2">Content Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {contentItems.map((item, i) => (
                  <div key={i} className="bg-white rounded-lg border border-[#E8E4E1] p-3 flex items-center gap-3 hover:border-[#E95A34] transition-colors">
                    <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Scroll size={18} className="text-[#E95A34]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#374652]">{item.title}</p>
                      <p className="text-xs text-[#7A8690]">{item.category} {item.deity ? `• ${item.deity}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verses */}
          {verses.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A8690] mb-2">Shlokas & Verses ({verses.length})</h3>
              <div className="space-y-3">
                {verses.map((v, i) => {
                  const Icon = SOURCE_ICONS[v.source] || BookOpen;
                  const color = SOURCE_COLORS[v.source] || '#E95A34';
                  return (
                    <div key={i} className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#F8F3F1] border-b border-[#E8E4E1]">
                        <Icon size={14} style={{ color }} />
                        <span className="text-xs font-bold" style={{ color }}>{SOURCE_LABELS[v.source] || v.source}</span>
                        <span className="text-xs text-[#7A8690]">|</span>
                        <span className="text-xs font-medium text-[#374652]">{v.book}</span>
                        {v.chapter && <><span className="text-xs text-[#7A8690]">|</span><span className="text-xs text-[#7A8690]">Ch. {v.chapter}</span></>}
                        {v.verse_num && <><span className="text-xs text-[#7A8690]">|</span><span className="text-xs text-[#7A8690]">V. {v.verse_num}</span></>}
                      </div>
                      <div className="p-4">
                        {v.sanskrit && <p className="text-sm font-medium text-[#374652] leading-relaxed whitespace-pre-wrap mb-2">{v.sanskrit}</p>}
                        {v.transliteration && <p className="text-xs text-[#7A8690] italic mb-2">{v.transliteration}</p>}
                        {v.meaning && (
                          <div className="border-t border-[#F3EDEA] pt-2">
                            <p className="text-xs font-bold text-[#D08465] mb-0.5">{lang === 'hi' ? 'अर्थ' : 'Meaning'}:</p>
                            <p className="text-sm text-[#374652] leading-relaxed whitespace-pre-wrap">{v.meaning}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {results.total === 0 && (
            <div className="bg-white rounded-xl border border-[#E8E4E1] p-12 text-center">
              <Search size={32} className="mx-auto text-[#989EA4] mb-3" />
              <p className="text-sm text-[#7A8690]">No results found. Try different keywords or language.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-12 text-center animate-fade-in">
          <Search size={40} className="mx-auto text-[#E95A34] opacity-40 mb-4" />
          <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>Search All Scriptures</h3>
          <p className="text-sm text-[#7A8690] mb-6 max-w-md mx-auto">Search in Hindi, English, or Sanskrit across Vedas, Bhagavad Gita, Chalisas, Mantras, and more.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['गायत्री', 'Karma', 'Hanuman', 'अग्नि', 'Dharma', 'कृष्ण'].map(s => (
              <button key={s} onClick={() => handleInput(s)} className="px-3 py-1.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm text-[#7A8690] hover:border-[#E95A34] hover:text-[#E95A34] transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
