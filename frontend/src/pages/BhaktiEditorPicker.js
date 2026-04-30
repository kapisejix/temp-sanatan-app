import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Search, Loader2, Edit3 } from 'lucide-react';

/**
 * Item picker used when the admin lands on /admin/bhakti/editor (no id).
 * Also serves as the landing screen for the legacy /admin/verse-manager and
 * /admin/audio-sync routes, which now redirect here.
 */
export default function BhaktiEditorPicker() {
  const { api } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/content/items?limit=200');
        setItems(data.items || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [api]);

  const filtered = items.filter((it) => {
    const text = `${it.title_hi || ''} ${it.title_en || ''} ${it.category || ''}`.toLowerCase();
    return !q || text.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-4" data-testid="bhakti-editor-picker">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Bhakti Content</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Unified Content Editor</h1>
        <p className="text-sm text-[#7A8690] mt-1">
          One editor to manage content, verses, audio, sync and publish for every bhakti item.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E4E1] p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#989EA4]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or category…"
            className="w-full pl-9 pr-4 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"
            data-testid="editor-picker-search"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="animate-spin inline text-[#E95A34]" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F3EDEA]">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-bold uppercase text-[#7A8690]">Title</th>
                <th className="text-left px-4 py-2 text-xs font-bold uppercase text-[#7A8690]">Category</th>
                <th className="text-center px-4 py-2 text-xs font-bold uppercase text-[#7A8690]">Verses</th>
                <th className="text-center px-4 py-2 text-xs font-bold uppercase text-[#7A8690]">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-[#989EA4]">No items</td></tr>
              )}
              {filtered.map((it) => (
                <tr key={it._id} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1]">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-[#E95A34]" />
                      <span className="text-sm font-medium">{it.title_hi || it.title_en || it.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-[#7A8690]">{it.category}</td>
                  <td className="px-4 py-2 text-center text-sm">{it.total_verses || 0}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${it.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {it.status || 'draft'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => nav(`/admin/bhakti/editor/${it._id}`)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#E95A34] text-white text-xs rounded-md hover:bg-[#d24e2c]"
                      data-testid={`picker-edit-${it._id}`}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
