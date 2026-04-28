import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, Edit, Trash2, X, Eye, Loader2 } from 'lucide-react';

export default function BlogManagerPage() {
  const { api, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', category: 'spirituality', status: 'draft', cover_image: '' });
  const [pageForm, setPageForm] = useState({ title: '', slug: '', content: '', show_in_menu: false, menu_position: 'footer', sort_order: 0 });
  const [showPageModal, setShowPageModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [p, pg] = await Promise.all([api.get('/admin/blog/posts'), api.get('/admin/pages')]);
      setPosts(p.data);
      setPages(pg.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  const savePost = async () => {
    setSaving(true);
    try {
      if (editItem) await api.put(`/admin/blog/posts/${editItem._id}`, form);
      else await api.post('/admin/blog/posts', form);
      setShowModal(false); setEditItem(null); fetchAll();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const savePage = async () => {
    setSaving(true);
    try {
      if (editItem) await api.put(`/admin/pages/${editItem._id}`, pageForm);
      else await api.post('/admin/pages', pageForm);
      setShowPageModal(false); setEditItem(null); fetchAll();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const deletePost = async (id) => { if (window.confirm('Delete?')) { await api.delete(`/admin/blog/posts/${id}`); fetchAll(); } };
  const deletePage = async (id) => { if (window.confirm('Delete?')) { await api.delete(`/admin/pages/${id}`); fetchAll(); } };

  return (
    <div className="space-y-6" data-testid="blog-manager-page">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Content</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Blog & Pages</h1>
        </div>
        <button onClick={() => { setEditItem(null); tab === 'posts' ? (setForm({ title: '', excerpt: '', content: '', category: 'spirituality', status: 'draft', cover_image: '' }), setShowModal(true)) : (setPageForm({ title: '', slug: '', content: '', show_in_menu: false, menu_position: 'footer', sort_order: 0 }), setShowPageModal(true)); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm" data-testid="add-post-btn">
          <Plus size={18} /> {tab === 'posts' ? 'New Post' : 'New Page'}
        </button>
      </div>

      <div className="flex gap-1 bg-[#F3EDEA] rounded-lg p-1 w-fit">
        {[{ key: 'posts', label: `Blog Posts (${posts.length})` }, { key: 'pages', label: `CMS Pages (${pages.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t.key ? 'bg-white shadow-sm' : 'text-[#7A8690]'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'posts' && (
        <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-[#F3EDEA]">
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Title</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Category</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Status</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Views</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Actions</th>
            </tr></thead>
            <tbody>
              {posts.map(p => (
                <tr key={p._id} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1]">
                  <td className="px-4 py-3"><p className="text-sm font-medium">{p.title}</p><p className="text-xs text-[#7A8690]">/blog/{p.slug}</p></td>
                  <td className="px-4 py-3 text-sm capitalize">{p.category}</td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${p.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-center text-sm">{p.views || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditItem(p); setForm({ title: p.title, excerpt: p.excerpt || '', content: p.content || '', category: p.category || 'spirituality', status: p.status || 'draft', cover_image: p.cover_image || '' }); setShowModal(true); }} className="p-1 hover:bg-[#F3EDEA] rounded text-[#7A8690] hover:text-[#E95A34]"><Edit size={14} /></button>
                    <button onClick={() => deletePost(p._id)} className="p-1 hover:bg-red-50 rounded text-[#7A8690] hover:text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map(p => (
            <div key={p._id} className="bg-white rounded-xl border border-[#E8E4E1] p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => { setEditItem(p); setPageForm({ title: p.title, slug: p.slug, content: p.content || '', show_in_menu: p.show_in_menu, menu_position: p.menu_position || 'footer', sort_order: p.sort_order || 0 }); setShowPageModal(true); }} className="p-1 hover:bg-[#F3EDEA] rounded"><Edit size={14} /></button>
                  <button onClick={() => deletePage(p._id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-xs text-[#7A8690]">/{p.slug}</p>
              <div className="flex gap-2 mt-2">
                {p.show_in_menu && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{p.menu_position} menu</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blog Post Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editItem ? 'Edit Post' : 'New Blog Post'}</h3>
              <button onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" data-testid="post-title" /></div>
              <div><label className="block text-sm font-medium mb-1">Excerpt</label><textarea value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} rows={2} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Content</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={10} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" data-testid="post-content" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Category</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"><option value="draft">Draft</option><option value="published">Published</option></select></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t"><button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#7A8690]">Cancel</button><button onClick={savePost} disabled={saving} className="px-4 py-2 bg-[#E95A34] text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button></div>
          </div>
        </div>
      )}

      {/* Page Modal */}
      {showPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{editItem ? 'Edit Page' : 'New Page'}</h3>
              <button onClick={() => setShowPageModal(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Title</label><input value={pageForm.title} onChange={e => setPageForm({...pageForm, title: e.target.value})} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Slug</label><input value={pageForm.slug} onChange={e => setPageForm({...pageForm, slug: e.target.value})} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" placeholder="e.g., about-us" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Content</label><textarea value={pageForm.content} onChange={e => setPageForm({...pageForm, content: e.target.value})} rows={10} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" /></div>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={pageForm.show_in_menu} onChange={e => setPageForm({...pageForm, show_in_menu: e.target.checked})} className="accent-[#E95A34]" /><span className="text-sm">Show in Menu</span></label>
                <div><label className="block text-sm font-medium mb-1">Position</label><select value={pageForm.menu_position} onChange={e => setPageForm({...pageForm, menu_position: e.target.value})} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm"><option value="header">Header</option><option value="footer">Footer</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Sort Order</label><input type="number" value={pageForm.sort_order} onChange={e => setPageForm({...pageForm, sort_order: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t"><button onClick={() => setShowPageModal(false)} className="px-4 py-2 text-sm text-[#7A8690]">Cancel</button><button onClick={savePage} disabled={saving} className="px-4 py-2 bg-[#E95A34] text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
