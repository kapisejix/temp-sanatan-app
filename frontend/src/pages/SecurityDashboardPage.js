import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldCheck, AlertTriangle, Lock, Unlock, Clock, Users, Ban,
  CheckCircle, XCircle, Loader2, Eye, Trash2, Activity
} from 'lucide-react';

export default function SecurityDashboardPage() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [blockIpInput, setBlockIpInput] = useState('');

  const fetchAll = async () => {
    try {
      const [sec, audit, blocked] = await Promise.all([
        api.get('/admin/security/dashboard'),
        api.get('/admin/audit-trail?limit=50'),
        api.get('/admin/security/blocked-ips'),
      ]);
      setData(sec.data);
      setAuditTrail(audit.data);
      setBlockedIps(blocked.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleBlockIp = async () => {
    if (!blockIpInput.trim()) return;
    try {
      await api.post('/admin/security/block-ip', { ip: blockIpInput.trim(), reason: 'Manual block from admin' });
      setBlockIpInput('');
      fetchAll();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleUnblockIp = async (ip) => {
    try { await api.delete(`/admin/security/blocked-ips/${ip}`); fetchAll(); }
    catch (err) { alert('Error'); }
  };

  const StatCard = ({ icon: Icon, label, value, color, danger }) => (
    <div className={`bg-white rounded-xl border p-5 ${danger && value > 0 ? 'border-red-200 bg-red-50/30' : 'border-[#E8E4E1]'}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{value}</p>
          <p className="text-xs text-[#7A8690]">{label}</p>
        </div>
      </div>
    </div>
  );

  const getActionColor = (action) => {
    if (action.includes('success') || action === 'logout') return 'text-green-700 bg-green-50';
    if (action.includes('failed') || action.includes('blocked')) return 'text-red-700 bg-red-50';
    if (action.includes('updated') || action.includes('created')) return 'text-blue-700 bg-blue-50';
    return 'text-[#7A8690] bg-[#F3EDEA]';
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[#E95A34]" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="security-dashboard-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Security</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Security Dashboard</h1>
        <p className="text-sm text-[#7A8690] mt-1">Monitor authentication, suspicious activity, and admin actions</p>
      </div>

      {/* Auth Stats - Last 24h */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <StatCard icon={CheckCircle} label="Successful Logins (24h)" value={data?.last_24h?.login_success || 0} color="#166534" />
        <StatCard icon={XCircle} label="Failed Logins (24h)" value={data?.last_24h?.login_failed || 0} color="#991B1B" danger />
        <StatCard icon={Ban} label="Rate Limited (24h)" value={data?.last_24h?.rate_limited || 0} color="#B45309" danger />
        <StatCard icon={Lock} label="Blacklisted Tokens" value={data?.blacklisted_tokens || 0} color="#4338CA" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F3EDEA] rounded-lg p-1 w-fit animate-fade-in">
        {[
          { key: 'overview', label: 'Overview', icon: ShieldCheck },
          { key: 'audit', label: 'Audit Trail', icon: Clock },
          { key: 'threats', label: 'Threats', icon: AlertTriangle },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-[#374652] shadow-sm' : 'text-[#7A8690]'}`}
            data-testid={`security-tab-${tab.key}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Hourly Auth Trend */}
          {(data?.hourly_auth_trend || []).length > 0 && (
            <div className="bg-white rounded-xl border border-[#E8E4E1] p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Auth Activity (24h)</h3>
              <div className="flex items-end gap-1 h-24">
                {data.hourly_auth_trend.map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 flex-1" title={`${h.hour}:00 - ${h.success} ok, ${h.failed} fail`}>
                    <div className="w-full flex flex-col gap-0.5">
                      {h.failed > 0 && <div className="bg-red-400 rounded-t w-full" style={{ height: `${Math.max(h.failed * 8, 2)}px` }} />}
                      {h.success > 0 && <div className="bg-green-400 rounded-t w-full" style={{ height: `${Math.max(h.success * 8, 2)}px` }} />}
                    </div>
                    <span className="text-[8px] text-[#989EA4]">{h.hour}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-[#7A8690]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded" /> Success</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded" /> Failed</span>
              </div>
            </div>
          )}

          {/* Active Admins */}
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-[#E95A34]" />
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Active Admins (24h)</h3>
            </div>
            {(data?.active_admins || []).length === 0 ? (
              <p className="text-xs text-[#989EA4]">No recent admin activity</p>
            ) : data.active_admins.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#F3EDEA] last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-[#7A8690]">{a.email} - {a.role}</p>
                </div>
                <span className="text-xs text-[#989EA4]">{a.last_login_at?.split('T')[1]?.substring(0, 5)}</span>
              </div>
            ))}
          </div>

          {/* Recent Admin Actions */}
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-[#E95A34]" />
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Recent Admin Actions</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(data?.recent_admin_actions || []).map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#F3EDEA] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getActionColor(a.action)}`}>
                      {a.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-[#7A8690]">{a.admin_email || 'system'}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#989EA4]">{a.timestamp?.split('T')[0]} {a.timestamp?.split('T')[1]?.substring(0, 5)}</p>
                    {a.ip_address && <p className="text-[10px] text-[#989EA4]">{a.ip_address}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F3EDEA]">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Action</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">IP</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Status</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Time</th>
              </tr>
            </thead>
            <tbody>
              {auditTrail.map((a, i) => (
                <tr key={i} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1]" data-testid={`audit-row-${i}`}>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getActionColor(a.action)}`}>
                      {a.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#7A8690]">{a.admin_email || '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#7A8690]">{a.ip_address || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs ${a.status === 'success' ? 'text-green-600' : a.status === 'failed' ? 'text-red-600' : 'text-amber-600'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[#989EA4]">{a.timestamp?.replace('T', ' ').substring(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'threats' && (
        <div className="space-y-6 animate-fade-in">
          {/* Suspicious IPs */}
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Suspicious IPs (3+ failed attempts in 7 days)</h3>
            </div>
            {(data?.suspicious_ips || []).length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck size={32} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm text-green-700">No suspicious activity detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.suspicious_ips.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="text-sm font-mono font-medium text-red-800">{s.ip}</p>
                      <p className="text-xs text-red-600">{s.attempts} failed attempts</p>
                    </div>
                    <button onClick={() => handleBlockIp(s.ip)} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">
                      Block IP
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* IP Block Management */}
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Blocked IPs</h3>
            <div className="flex gap-2 mb-4">
              <input value={blockIpInput} onChange={(e) => setBlockIpInput(e.target.value)} placeholder="Enter IP to block..." className="flex-1 px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm" data-testid="block-ip-input" />
              <button onClick={handleBlockIp} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700" data-testid="block-ip-btn">Block</button>
            </div>
            {blockedIps.length === 0 ? (
              <p className="text-xs text-[#989EA4]">No blocked IPs</p>
            ) : blockedIps.map((ip, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#F3EDEA] last:border-0">
                <div>
                  <p className="text-sm font-mono">{ip.ip}</p>
                  <p className="text-xs text-[#7A8690]">{ip.reason} - {ip.blocked_at?.split('T')[0]}</p>
                </div>
                <button onClick={() => handleUnblockIp(ip.ip)} className="p-1 hover:bg-green-50 rounded text-[#7A8690] hover:text-green-600">
                  <Unlock size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Security Events */}
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Recent Security Events</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(data?.security_events || []).length === 0 ? (
                <p className="text-xs text-[#989EA4]">No security events</p>
              ) : data.security_events.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#F3EDEA] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 font-medium">{e.event_type}</span>
                    <span className="text-xs font-mono text-[#7A8690]">{e.ip_address}</span>
                    <span className="text-xs text-[#7A8690]">{e.path}</span>
                  </div>
                  <span className="text-xs text-[#989EA4]">{e.timestamp?.split('T')[1]?.substring(0, 8)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
