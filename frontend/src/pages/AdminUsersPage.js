import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-50 text-red-700' },
  { value: 'content_admin', label: 'Content Admin', color: 'bg-blue-50 text-blue-700' },
  { value: 'moderator', label: 'Moderator', color: 'bg-amber-50 text-amber-700' },
];

export default function AdminUsersPage() {
  const { api, user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'content_admin' });
  const [saving, setSaving] = useState(false);

  const fetchAdmins = async () => {
    try {
      const { data } = await api.get('/admin/admins');
      setAdmins(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/auth/admin/register', form);
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'content_admin' });
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating admin');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (adminId, newRole) => {
    try {
      await api.put(`/admin/admins/${adminId}`, { role: newRole });
      fetchAdmins();
    } catch (err) {
      alert('Error updating role');
    }
  };

  const handleDeactivate = async (adminId) => {
    if (!window.confirm('Are you sure you want to deactivate this admin?')) return;
    try {
      await api.delete(`/admin/admins/${adminId}`);
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error deactivating');
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">Access Control</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Admin Users</h1>
          <p className="text-sm text-[#7A8690] mt-1">Manage admin accounts and permissions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white rounded-lg font-medium text-sm transition-colors" data-testid="add-admin-btn">
          <Plus size={18} /> Add Admin
        </button>
      </div>

      {/* Role Legend */}
      <div className="flex gap-4 animate-fade-in">
        {ROLES.map(r => (
          <div key={r.value} className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.color}`}>{r.label}</span>
          </div>
        ))}
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-xl border border-[#E8E4E1] overflow-hidden animate-fade-in">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F3EDEA]">
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Admin</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Email</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Role</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Status</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#7A8690]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-[#E8E4E1]">{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-[#F3EDEA] rounded animate-pulse" /></td>)}</tr>
              ))
            ) : admins.map(admin => {
              const role = ROLES.find(r => r.value === admin.role);
              return (
                <tr key={admin._id} className="border-b border-[#E8E4E1] hover:bg-[#F8F3F1] transition-colors" data-testid={`admin-row-${admin._id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#FDDDD4] rounded-full flex items-center justify-center">
                        <Shield size={14} className="text-[#E95A34]" />
                      </div>
                      <span className="text-sm font-medium">{admin.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#7A8690]">{admin.email}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={admin.role}
                      onChange={(e) => handleRoleChange(admin._id, e.target.value)}
                      disabled={admin._id === user?._id}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${role?.color || ''}`}
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${admin.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {admin.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {admin._id !== user?._id && (
                      <button onClick={() => handleDeactivate(admin._id)} className="p-1.5 hover:bg-red-50 rounded-md text-[#7A8690] hover:text-red-600 transition-colors" data-testid={`deactivate-admin-${admin._id}`}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" data-testid="create-admin-modal">
          <div className="bg-white rounded-xl border border-[#E8E4E1] w-full max-w-md shadow-xl animate-fade-in m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>Create Admin</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#F3EDEA] rounded-md"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="admin-name-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="admin-email-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="admin-password-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" data-testid="admin-role-select">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E4E1]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-[#7A8690] hover:bg-[#F3EDEA] rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-[#E95A34] hover:bg-[#D04A28] text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2" data-testid="create-admin-submit">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
