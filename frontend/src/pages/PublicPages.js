import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, ArrowLeft, Clock, Eye } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function BlogListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/blog/posts`).then(r => { setPosts(r.data.posts || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F3F1]">
      <nav className="bg-white border-b border-[#E8E4E1] px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-[#7A8690] hover:text-[#374652]"><ArrowLeft size={18} /> Home</Link>
          <span className="text-[#E8E4E1]">|</span>
          <span className="font-semibold" style={{ fontFamily: 'Manrope' }}>Blog</span>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Manrope' }}>Spiritual Knowledge Blog</h1>
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <p className="text-[#989EA4] text-center py-16">No blog posts yet</p>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <Link key={post._id} to={`/blog/${post.slug}`} className="block bg-white rounded-xl border border-[#E8E4E1] p-6 hover:shadow-md transition-all group" data-testid={`blog-${post.slug}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#E95A34]">{post.category}</p>
                <h2 className="text-xl font-semibold mt-2 group-hover:text-[#E95A34] transition-colors">{post.title}</h2>
                <p className="text-sm text-[#7A8690] mt-2 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-[#989EA4]">
                  <span className="flex items-center gap-1"><Clock size={12} /> {post.published_at?.split('T')[0]}</span>
                  <span>{post.author_name}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {post.views || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BlogDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/blog/posts/${slug}`).then(r => { setPost(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#E95A34] border-t-transparent rounded-full" /></div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center text-[#989EA4]">Post not found</div>;

  return (
    <div className="min-h-screen bg-[#F8F3F1]">
      <nav className="bg-white border-b border-[#E8E4E1] px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/blog" className="flex items-center gap-2 text-[#7A8690] hover:text-[#374652]"><ArrowLeft size={18} /> Blog</Link>
        </div>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12" data-testid="blog-detail">
        <p className="text-xs font-bold uppercase tracking-wider text-[#E95A34] mb-3">{post.category}</p>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight" style={{ fontFamily: 'Manrope' }}>{post.title}</h1>
        <div className="flex items-center gap-4 mt-4 text-sm text-[#7A8690]">
          <span>{post.author_name}</span>
          <span>{post.published_at?.split('T')[0]}</span>
          <span className="flex items-center gap-1"><Eye size={14} /> {post.views}</span>
        </div>
        <div className="mt-8 prose prose-stone max-w-none text-[#374652] leading-relaxed whitespace-pre-wrap">{post.content}</div>
      </article>
    </div>
  );
}

export function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/pages/${slug}`).then(r => { setPage(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#E95A34] border-t-transparent rounded-full" /></div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center text-[#989EA4]">Page not found</div>;

  return (
    <div className="min-h-screen bg-[#F8F3F1]">
      <nav className="bg-white border-b border-[#E8E4E1] px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-[#7A8690] hover:text-[#374652]"><ArrowLeft size={18} /> Home</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Manrope' }}>{page.title}</h1>
        <div className="prose prose-stone max-w-none text-[#374652] leading-relaxed whitespace-pre-wrap">{page.content}</div>
      </div>
    </div>
  );
}
