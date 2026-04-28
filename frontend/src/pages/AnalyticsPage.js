import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Users, Eye, Clock, MapPin, TrendingUp, Loader2, Flame } from 'lucide-react';

export default function AnalyticsPage() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [overview, streaks] = await Promise.all([
          api.get(`/admin/analytics/overview?days=${days}`),
          api.get('/admin/analytics/streaks'),
        ]);
        setData(overview.data);
        setStreakData(streaks.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [api, days]);

  const StatCard = ({ icon: Icon, label, value, color, sub }) => (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-5 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{value}</p>
          <p className="text-xs text-[#7A8690]">{label}</p>
          {sub && <p className="text-[10px] text-[#989EA4]">{sub}</p>}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#E8E4E1] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl border border-[#E8E4E1] animate-pulse" />)}
        </div>
      </div>
    );
  }

  const BADGES = {
    week_warrior: { label: '7-Day Warrior', emoji: '7' },
    month_master: { label: '30-Day Master', emoji: '30' },
    mala_complete: { label: '108-Day Mala', emoji: '108' },
    year_yogi: { label: '365-Day Yogi', emoji: '365' },
  };

  return (
    <div className="space-y-8" data-testid="analytics-page">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Insights</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Analytics</h1>
          <p className="text-sm text-[#7A8690] mt-1">Track user activity, content engagement, and growth</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="px-3 py-2 bg-white border border-[#E8E4E1] rounded-lg text-sm" data-testid="days-filter">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <StatCard icon={Eye} label="Total Events" value={data?.total_events || 0} color="#E95A34" sub={`Last ${days} days`} />
        <StatCard icon={Users} label="Total Users" value={data?.total_users || 0} color="#4338CA" />
        <StatCard icon={TrendingUp} label="Active Users" value={data?.active_users || 0} color="#166534" sub={`Last ${days} days`} />
        <StatCard icon={Flame} label="Active Streaks" value={streakData?.active_today || 0} color="#B45309" sub="Checked in today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Content */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Most Popular Content</h3>
          {(data?.popular_content || []).length === 0 ? (
            <p className="text-sm text-[#989EA4] text-center py-8">No content engagement data yet. Events will appear as users interact with the app.</p>
          ) : (
            <div className="space-y-3">
              {data.popular_content.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#F3EDEA] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-[#FEF0EC] rounded flex items-center justify-center text-xs font-bold text-[#E95A34]">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{item.title_en || 'Content'}</p>
                      <p className="text-xs text-[#7A8690] capitalize">{item.category?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{item.views}</p>
                    <p className="text-xs text-[#989EA4]">views</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event Types */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Activity Breakdown</h3>
          {(data?.event_types || []).length === 0 ? (
            <p className="text-sm text-[#989EA4] text-center py-8">No events tracked yet. Analytics data will populate as users interact with the app.</p>
          ) : (
            <div className="space-y-3">
              {data.event_types.map((et, i) => {
                const total = data.total_events || 1;
                const pct = Math.round((et.count / total) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{et.type.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{et.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#F3EDEA] rounded-full">
                      <div className="h-full bg-[#E95A34] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Locations */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={18} className="text-[#E95A34]" />
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>User Locations</h3>
          </div>
          {(data?.locations || []).length === 0 ? (
            <p className="text-sm text-[#989EA4] text-center py-8">Location data will appear when users share their location or when tracked via the mobile app.</p>
          ) : (
            <div className="space-y-2">
              {data.locations.map((loc, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm">{loc.country}</span>
                  <span className="text-sm font-medium">{loc.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Streaks & Gamification */}
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-[#E95A34]" />
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Streaks & Badges</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-[#FEF0EC] rounded-lg text-center">
              <p className="text-xl font-bold text-[#E95A34]">{streakData?.total_users_with_streaks || 0}</p>
              <p className="text-xs text-[#7A8690]">Total Streakers</p>
            </div>
            <div className="p-3 bg-[#FEF0EC] rounded-lg text-center">
              <p className="text-xl font-bold text-[#E95A34]">{streakData?.active_today || 0}</p>
              <p className="text-xs text-[#7A8690]">Active Today</p>
            </div>
          </div>

          {/* Badge Stats */}
          <h4 className="text-sm font-medium mb-2">Badges Earned</h4>
          {(streakData?.badge_counts || []).length === 0 ? (
            <p className="text-xs text-[#989EA4]">No badges earned yet</p>
          ) : (
            <div className="space-y-2">
              {streakData.badge_counts.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-xs font-bold text-amber-700">
                      {BADGES[b.badge]?.emoji || '?'}
                    </span>
                    <span className="text-sm">{BADGES[b.badge]?.label || b.badge}</span>
                  </div>
                  <span className="text-sm font-medium">{b.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Top Streakers */}
          {(streakData?.top_streakers || []).length > 0 && (
            <>
              <h4 className="text-sm font-medium mt-4 mb-2">Top Streakers</h4>
              {streakData.top_streakers.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-sm">
                  <span>{s.user_id?.substring(0, 12)}...</span>
                  <span className="font-medium text-[#E95A34]">{s.current_streak} days</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Daily Trend */}
      {(data?.daily_trend || []).length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Daily Activity Trend</h3>
          <div className="flex items-end gap-1 h-32 overflow-x-auto">
            {data.daily_trend.map((d, i) => {
              const maxEvents = Math.max(...data.daily_trend.map(x => x.events), 1);
              const height = Math.max((d.events / maxEvents) * 100, 4);
              return (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[24px]" title={`${d.date}: ${d.events} events, ${d.users} users`}>
                  <div className="bg-[#E95A34] rounded-t w-5 transition-all hover:bg-[#D04A28]" style={{ height: `${height}%` }} />
                  <span className="text-[8px] text-[#989EA4] rotate-45">{d.date?.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
