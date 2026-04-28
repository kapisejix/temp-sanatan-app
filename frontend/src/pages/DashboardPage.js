import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText, Users, BookOpen, Music, Flame, Library, BookMarked,
  MessageCircle, TrendingUp, ArrowUpRight
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <div className={`bg-white rounded-xl border border-[#E8E4E1] p-5 hover:shadow-sm hover:-translate-y-[1px] transition-all duration-200 animate-fade-in stagger-${delay}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: color + '15' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <ArrowUpRight size={16} className="text-[#989EA4]" />
    </div>
    <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{value}</p>
    <p className="text-sm text-[#7A8690] mt-0.5">{label}</p>
  </div>
);

export default function DashboardPage() {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        setStats(data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [api]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#E8E4E1] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: FileText, label: 'Total Content', value: stats?.total_content || 0, color: '#E95A34' },
    { icon: TrendingUp, label: 'Published', value: stats?.published || 0, color: '#166534' },
    { icon: FileText, label: 'Drafts', value: stats?.draft || 0, color: '#B45309' },
    { icon: Flame, label: 'Kathas', value: stats?.kathas || 0, color: '#991B1B' },
    { icon: Music, label: 'Artis', value: stats?.artis || 0, color: '#7C3AED' },
    { icon: Library, label: 'Granths', value: stats?.granths || 0, color: '#0369A1' },
    { icon: BookMarked, label: 'Vedas', value: stats?.vedas || 0, color: '#0F766E' },
    { icon: Users, label: 'App Users', value: stats?.users || 0, color: '#4338CA' },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Overview</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Dashboard</h1>
        <p className="text-sm text-[#7A8690] mt-1">Welcome to Sanatan Saathi Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i + 1} />
        ))}
      </div>

      {/* Category Breakdown + Recent Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
          <h3 className="text-lg font-semibold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }}>Content Categories</h3>
          <div className="space-y-3">
            {(stats?.categories || []).map((cat) => {
              const total = stats?.total_content || 1;
              const pct = Math.round((cat.count / total) * 100);
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-sm text-[#7A8690] w-32 truncate capitalize">{cat.name.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-2 bg-[#F3EDEA] rounded-full overflow-hidden">
                    <div className="h-full bg-[#E95A34] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{cat.count}</span>
                </div>
              );
            })}
            {(!stats?.categories || stats.categories.length === 0) && (
              <p className="text-sm text-[#989EA4]">No categories yet. Start uploading content!</p>
            )}
          </div>
        </div>

        {/* Recent Content */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
          <h3 className="text-lg font-semibold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }}>Recent Content</h3>
          <div className="space-y-3">
            {(stats?.recent_content || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between py-2 border-b border-[#F3EDEA] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#374652]">{item.title_en}</p>
                  <p className="text-xs text-[#7A8690] capitalize">{item.category?.replace(/_/g, ' ')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.status === 'published' ? 'bg-green-50 text-green-700' :
                  item.status === 'draft' ? 'bg-amber-50 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{item.status}</span>
              </div>
            ))}
            {(!stats?.recent_content || stats.recent_content.length === 0) && (
              <p className="text-sm text-[#989EA4]">No content yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center">
              <MessageCircle size={20} className="text-[#E95A34]" />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>{stats?.chats || 0}</p>
              <p className="text-xs text-[#7A8690]">VedaChat Sessions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-[#E95A34]" />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>{(stats?.categories || []).length}</p>
              <p className="text-xs text-[#7A8690]">Active Categories</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FEF0EC] rounded-lg flex items-center justify-center">
              <Users size={20} className="text-[#E95A34]" />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>{stats?.admins || 0}</p>
              <p className="text-xs text-[#7A8690]">Active Admins</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
