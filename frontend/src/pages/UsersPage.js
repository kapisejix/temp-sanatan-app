import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Loader2 } from 'lucide-react';

export default function UsersPage() {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/admin/users');
        setUsers(data.users || []);
        setTotal(data.total || 0);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [api]);

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-1">App Users</p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Users</h1>
        <p className="text-sm text-[#7A8690] mt-1">{total} registered users</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E4E1] p-8 text-center animate-fade-in">
        <Users size={48} className="mx-auto mb-4 text-[#989EA4]" />
        <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope' }}>
          {total > 0 ? `${total} Users` : 'No Users Yet'}
        </h3>
        <p className="text-sm text-[#7A8690]">
          {total > 0 ? 'Users who have registered via the mobile app' : 'Users will appear here when they register via the mobile app'}
        </p>
      </div>
    </div>
  );
}
