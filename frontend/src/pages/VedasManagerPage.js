import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookMarked, ChevronRight } from 'lucide-react';

export default function VedasManagerPage() {
  const { api } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/vedas/books');
        setBooks(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [api]);

  const vedas = books.filter(b => b.category === 'veda');
  const puranas = books.filter(b => b.category === 'purana');

  const BookCard = ({ book }) => (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 hover:shadow-sm hover:-translate-y-[1px] transition-all" data-testid={`veda-${book._id}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-[#FEF0EC] rounded-lg flex items-center justify-center flex-shrink-0">
          <BookMarked size={20} className="text-[#E95A34]" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold" style={{ fontFamily: 'Manrope' }}>{book.title_en}</h3>
          <p className="text-sm text-[#E95A34]">{book.title_hi}</p>
          <p className="text-xs text-[#7A8690] mt-1">{book.description_en}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F3EDEA]">
            <span className="text-xs text-[#7A8690]">{book.total_chapters} Chapters</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${book.parsing_status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {book.parsing_status || 'pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8" data-testid="vedas-manager-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Ancient Wisdom</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Vedas & Puranas</h1>
        <p className="text-sm text-[#7A8690] mt-1">Manage Vedic texts and Puranic literature</p>
      </div>

      {/* Vedas */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Vedas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-36 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)
          ) : vedas.map(book => <BookCard key={book._id} book={book} />)}
        </div>
      </div>

      {puranas.length > 0 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Puranas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {puranas.map(book => <BookCard key={book._id} book={book} />)}
          </div>
        </div>
      )}
    </div>
  );
}
