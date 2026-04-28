import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, MessageCircle, Headphones, Star, ChevronRight, ArrowRight, Download, Send, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_INFO = {
  chalisa: { title: 'Chalisa', desc: '40-verse hymns to deities', icon: BookOpen, color: '#E95A34' },
  vedic_mantra: { title: 'Vedic Mantras', desc: 'Sacred chants from the Vedas', icon: Star, color: '#166534' },
  ashtakam: { title: 'Ashtakam', desc: 'Eight-verse devotional poems', icon: BookOpen, color: '#7C3AED' },
  sahasranama: { title: 'Sahasranama', desc: 'Thousand names of deities', icon: Star, color: '#0369A1' },
  katha: { title: 'Katha & Puja', desc: 'Sacred stories and rituals', icon: BookOpen, color: '#991B1B' },
  arti: { title: 'Arti Sangrah', desc: 'Devotional songs collection', icon: Headphones, color: '#B45309' },
};

export default function PublicHomePage() {
  const [data, setData] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [remaining, setRemaining] = useState(5);
  const [chatLoading, setChatLoading] = useState(false);
  const [limited, setLimited] = useState(false);

  useEffect(() => {
    axios.get(`${API}/public/homepage`).then(r => setData(r.data)).catch(console.error);
  }, []);

  const askQuestion = async () => {
    if (!question.trim() || chatLoading || limited) return;
    setChatLoading(true);
    try {
      const { data: resp } = await axios.post(`${API}/public/ask`, { question, session_id: localStorage.getItem('ss_session') || Date.now().toString() });
      if (!localStorage.getItem('ss_session')) localStorage.setItem('ss_session', Date.now().toString());
      if (resp.limited) { setLimited(true); setAnswer(resp.message); }
      else { setAnswer(resp.answer); setRemaining(resp.remaining); }
    } catch { setAnswer('Sorry, unable to process right now.'); }
    finally { setChatLoading(false); }
  };

  const panchang = data?.panchang;

  return (
    <div className="min-h-screen bg-[#F8F3F1]" data-testid="public-homepage">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E8E4E1]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E95A34] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Manrope' }}>SS</span>
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Sanatan Saathi</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-[#7A8690] hover:text-[#374652] transition-colors">Features</a>
            <a href="#scriptures" className="text-[#7A8690] hover:text-[#374652] transition-colors">Scriptures</a>
            <Link to="/birth-chart" className="text-[#7A8690] hover:text-[#374652] transition-colors">Birth Chart</Link>
            <a href="#ask" className="text-[#7A8690] hover:text-[#374652] transition-colors">Ask Anything</a>
            <Link to="/blog" className="text-[#7A8690] hover:text-[#374652] transition-colors">Blog</Link>
            {(data?.menu_pages || []).filter(p => p.menu_position === 'header').map(p => (
              <Link key={p.slug} to={`/page/${p.slug}`} className="text-[#7A8690] hover:text-[#374652] transition-colors">{p.title}</Link>
            ))}
            <Link to="/page/contact" className="px-4 py-2 bg-[#E95A34] text-white rounded-lg font-medium hover:bg-[#D04A28] transition-colors">Contact</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-28 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FEF0EC] via-[#F8F3F1] to-[#FFF1E6]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E95A34] mb-4">Digital Spiritual Companion</p>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight text-[#374652]" style={{ fontFamily: 'Manrope' }}>
              Your Daily Guide to<br /><span className="text-[#E95A34]">Sanatan Dharma</span>
            </h1>
            <p className="mt-6 text-lg text-[#7A8690] leading-relaxed max-w-xl">
              Read, listen & learn Vedic Mantras, Chalisa, Artis, Sacred Texts in 12+ languages.
              AI-powered spiritual guidance with verse references.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <a href="#ask" className="px-8 py-3.5 bg-[#E95A34] text-white rounded-xl font-semibold hover:bg-[#D04A28] transition-colors flex items-center gap-2">
                <MessageCircle size={18} /> Ask VedaChat Free
              </a>
              <a href="#download" className="px-8 py-3.5 bg-white border-2 border-[#E8E4E1] text-[#374652] rounded-xl font-semibold hover:border-[#E95A34] transition-colors flex items-center gap-2">
                <Download size={18} /> Download App
              </a>
            </div>
            {data?.stats && (
              <div className="flex gap-8 mt-10">
                <div><p className="text-2xl font-bold text-[#E95A34]">{data.stats.total_content}+</p><p className="text-xs text-[#7A8690]">Mantras & Shlokas</p></div>
                <div><p className="text-2xl font-bold text-[#E95A34]">{data.stats.total_verses}+</p><p className="text-xs text-[#7A8690]">Verses</p></div>
                <div><p className="text-2xl font-bold text-[#E95A34]">12+</p><p className="text-xs text-[#7A8690]">Languages</p></div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Daily Panchang */}
      {panchang && (
        <section className="py-16 px-6 bg-white border-y border-[#E8E4E1]">
          <div className="max-w-6xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-2">Today's Panchang</p>
            <h2 className="text-2xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Manrope' }}>{panchang.date}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                ['Tithi', panchang.tithi], ['Nakshatra', panchang.nakshatra],
                ['Yoga', panchang.yoga], ['Sunrise', panchang.sunrise],
                ['Sunset', panchang.sunset], ['Rahu Kaal', panchang.rahu_kaal],
              ].map(([label, val]) => val && (
                <div key={label} className="bg-[#FEF0EC] rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#D08465]">{label}</p>
                  <p className="text-sm font-semibold text-[#374652] mt-1">{val}</p>
                </div>
              ))}
            </div>
            {panchang.festival_name && (
              <div className="mt-4 inline-block bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                <span className="text-sm font-semibold text-amber-800">{panchang.festival_name} {panchang.festival_name_en && `(${panchang.festival_name_en})`}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Content Categories */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-2">Explore</p>
          <h2 className="text-3xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Manrope' }}>Spiritual Content Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => {
              const items = data?.categories?.[key] || [];
              return (
                <div key={key} className="bg-white rounded-xl border border-[#E8E4E1] p-6 hover:shadow-md hover:-translate-y-1 transition-all">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: info.color + '12' }}>
                    <info.icon size={22} style={{ color: info.color }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{info.title}</h3>
                  <p className="text-sm text-[#7A8690] mt-1 mb-4">{info.desc}</p>
                  {items.length > 0 && (
                    <div className="space-y-1.5">
                      {items.slice(0, 3).map(item => (
                        <div key={item._id} className="flex items-center gap-2 text-sm">
                          <ChevronRight size={14} className="text-[#E95A34]" />
                          <span className="text-[#374652]">{item.title_en}</span>
                          <span className="text-xs text-[#989EA4]">({item.total_verses})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sacred Texts */}
      <section id="scriptures" className="py-16 px-6 bg-white border-y border-[#E8E4E1]">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-2">Sacred Texts</p>
          <h2 className="text-3xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Manrope' }}>Divya Granth & Vedas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Divya Granth</h3>
              <div className="space-y-3">
                {(data?.granths || []).map(g => (
                  <div key={g._id} className="bg-[#FEF0EC] rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#E95A34] rounded-lg flex items-center justify-center text-white font-bold">{g.title_en?.[0]}</div>
                    <div>
                      <p className="text-base font-semibold">{g.title_en}</p>
                      <p className="text-sm text-[#E95A34]">{g.title_hi}</p>
                      <p className="text-xs text-[#7A8690]">{g.total_chapters} Chapters | {g.total_verses?.toLocaleString()} Verses</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Vedas</h3>
              <div className="space-y-3">
                {(data?.vedas || []).map(v => (
                  <div key={v._id} className="bg-[#F0F9FF] rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0369A1] rounded-lg flex items-center justify-center text-white font-bold">{v.title_en?.[0]}</div>
                    <div>
                      <p className="text-base font-semibold">{v.title_en}</p>
                      <p className="text-sm text-[#0369A1]">{v.title_hi}</p>
                      <p className="text-xs text-[#7A8690]">{v.total_chapters} Chapters | {v.description_en}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ask Anything (VedaChat Widget) */}
      <section id="ask" className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-2 text-center">VedaChat AI</p>
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-center" style={{ fontFamily: 'Manrope' }}>Ask Anything About Scriptures</h2>
          <p className="text-sm text-[#7A8690] text-center mb-8">Get AI-powered answers with scripture references. {remaining} free questions remaining.</p>

          <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6 shadow-sm" data-testid="vedachat-widget">
            {answer && (
              <div className="mb-6 p-5 bg-[#FEF0EC] rounded-xl border border-[#FDDDD4]">
                <p className="text-xs font-bold text-[#E95A34] mb-2">VedaChat Answer</p>
                <div className="text-sm text-[#374652] whitespace-pre-wrap leading-relaxed">{answer}</div>
              </div>
            )}
            <div className="flex gap-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
                placeholder={limited ? "Download the app for unlimited questions" : "Ask about Vedas, Gita, mantras, rituals..."}
                className="flex-1 px-4 py-3 bg-[#F8F3F1] border border-[#E8E4E1] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]"
                disabled={limited || chatLoading}
                data-testid="public-chat-input"
              />
              <button onClick={askQuestion} disabled={limited || chatLoading || !question.trim()} className="px-5 py-3 bg-[#E95A34] text-white rounded-xl font-medium hover:bg-[#D04A28] disabled:opacity-40 flex items-center gap-2" data-testid="public-chat-send">
                {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            {!limited && <p className="text-xs text-[#989EA4] mt-3 text-center">{remaining} questions remaining | Download app for unlimited access</p>}
          </div>
        </div>
      </section>

      {/* Blog */}
      {(data?.recent_blogs || []).length > 0 && (
        <section className="py-16 px-6 bg-white border-y border-[#E8E4E1]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-2">Knowledge</p>
                <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Latest from Our Blog</h2>
              </div>
              <Link to="/blog" className="text-sm font-medium text-[#E95A34] hover:underline flex items-center gap-1">View All <ArrowRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.recent_blogs.map(post => (
                <Link key={post._id} to={`/blog/${post.slug}`} className="bg-[#F8F3F1] rounded-xl border border-[#E8E4E1] overflow-hidden hover:shadow-md transition-all group">
                  <div className="h-40 bg-gradient-to-br from-[#FEF0EC] to-[#FDDDD4] flex items-center justify-center">
                    <BookOpen size={32} className="text-[#E95A34] opacity-30" />
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-[#E95A34] font-medium capitalize">{post.category}</p>
                    <h3 className="text-base font-semibold mt-1 group-hover:text-[#E95A34] transition-colors line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-[#7A8690] mt-2 line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Download CTA */}
      <section id="download" className="py-20 px-6 bg-[#E95A34]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Experience Sanatan Saathi on Your Phone
          </h2>
          <p className="text-lg text-white/80 mt-4">Daily mantras, verse-by-verse audio, personalized spiritual guidance, and more.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a href="#" className="px-8 py-4 bg-white text-[#E95A34] rounded-xl font-bold hover:bg-[#FEF0EC] transition-colors">Download for iOS</a>
            <a href="#" className="px-8 py-4 bg-white/10 border-2 border-white text-white rounded-xl font-bold hover:bg-white/20 transition-colors">Download for Android</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#374652] text-white/70">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#E95A34] rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">SS</span></div>
                <span className="text-white font-bold">Sanatan Saathi</span>
              </div>
              <p className="text-sm">Digital Spiritual Companion for Sanatan Dharma</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Content</h4>
              <div className="space-y-2 text-sm">
                <a href="#features" className="block hover:text-white">Vedic Mantras</a>
                <a href="#features" className="block hover:text-white">Chalisa</a>
                <a href="#scriptures" className="block hover:text-white">Bhagavad Gita</a>
                <a href="#scriptures" className="block hover:text-white">Vedas</a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Features</h4>
              <div className="space-y-2 text-sm">
                <a href="#ask" className="block hover:text-white">VedaChat AI</a>
                <Link to="/blog" className="block hover:text-white">Blog</Link>
                <a href="#download" className="block hover:text-white">Download App</a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Legal</h4>
              <div className="space-y-2 text-sm">
                {(data?.menu_pages || []).filter(p => p.menu_position === 'footer').map(p => (
                  <Link key={p.slug} to={`/page/${p.slug}`} className="block hover:text-white">{p.title}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 text-center text-xs">
            <p>Sanatan Saathi - Spreading Vedic Wisdom Through Technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
