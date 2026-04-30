import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Upload, FileText, BookOpen, Music, Flame,
  Library, BookMarked, Headphones, MessageCircle, Calendar,
  Users, Shield, Settings, User, LogOut, ChevronLeft, Menu,
  CalendarClock, Star, Image, Sparkles, Plug, BarChart3, ShieldCheck,
  ScrollText, BookHeart, Scroll, ChevronDown, ChevronRight, Search, Languages
} from 'lucide-react';

const bhaktiItems = [
  { to: '/admin/arti-manager', icon: Music, label: 'Aarti (11 types)' },
  { to: '/admin/chalisa-manager', icon: BookOpen, label: 'Chalisa (54)' },
  { to: '/admin/namavali-manager', icon: ScrollText, label: 'Namavali (108)' },
  { to: '/admin/sahasranama-manager', icon: Scroll, label: 'Sahasranama (1000)' },
  { to: '/admin/vedic-mantra-manager', icon: BookHeart, label: 'Vedic Mantras' },
  { to: '/admin/stotram-manager', icon: Scroll, label: 'Stotrams (22+)' },
  { to: '/admin/suktam-manager', icon: Scroll, label: 'Suktams (9)' },
  { to: '/admin/ashtakam-manager', icon: Scroll, label: 'Ashtakam (8v)' },
  { to: '/admin/shatkam-manager', icon: Scroll, label: 'Shatkam (6v)' },
  { to: '/admin/kavacham-manager', icon: Shield, label: 'Kavacham' },
  { to: '/admin/nam-ramayanam-manager', icon: BookOpen, label: 'Nam Ramayanam' },
];

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/content-upload', icon: Upload, label: 'Content Upload' },
  { to: '/admin/import-wizard', icon: Upload, label: 'Import Wizard' },
  { to: '/admin/search', icon: Search, label: 'Smart Search' },
  { to: '/admin/content-manager', icon: FileText, label: 'Content Manager' },
  { to: '/admin/multilingual-editor', icon: Languages, label: 'Multilingual Editor' },
  { to: '/admin/daily-scheduler', icon: CalendarClock, label: 'Daily Scheduler' },
  { section: 'bhakti', label: 'Bhakti Categories', icon: BookHeart },
  { to: '/admin/katha-manager', icon: Flame, label: 'Katha Manager' },
  { to: '/admin/granth-manager', icon: Library, label: 'Granth Manager' },
  { to: '/admin/vedas-manager', icon: BookMarked, label: 'Vedas & Puranas' },
  { to: '/admin/audio-manager', icon: Headphones, label: 'Audio Manager' },
  { to: '/admin/media-studio', icon: Image, label: 'Media Studio' },
  { to: '/admin/vedachat', icon: MessageCircle, label: 'VedaChat AI' },
  { to: '/admin/panchang', icon: Calendar, label: 'Panchang' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/admin-users', icon: Shield, label: 'Admin Users' },
  { to: '/admin/blog-manager', icon: FileText, label: 'Blog & Pages' },
  { to: '/admin/security', icon: ShieldCheck, label: 'Security' },
  { to: '/admin/integrations', icon: Plug, label: 'Integration Hub' },
  { to: '/admin/settings', icon: Settings, label: 'App Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [bhaktiExpanded, setBhaktiExpanded] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = {
    super_admin: 'Super Admin',
    content_admin: 'Content Admin',
    moderator: 'Moderator',
  };

  return (
    <aside
      className={`h-screen bg-white border-r border-[#E8E4E1] flex flex-col transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-72'} flex-shrink-0`}
      data-testid="sidebar"
    >
      {/* Header */}
      <div className="px-4 py-5 flex items-center justify-between border-b border-[#E8E4E1]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E95A34] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Manrope' }}>SS</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Sanatan Saathi</h1>
              <p className="text-[10px] text-[#7A8690]">Admin Panel</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-[#F3EDEA] rounded-md text-[#7A8690] transition-colors"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item, idx) => {
          // Bhakti Categories Section
          if (item.section === 'bhakti') {
            return (
              <div key="bhakti-section">
                <button
                  onClick={() => setBhaktiExpanded(!bhaktiExpanded)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    bhaktiExpanded ? 'bg-[#FEF0EC] text-[#D08465]' : 'text-[#7A8690] hover:bg-[#F3EDEA] hover:text-[#374652]'
                  }`}
                  data-testid="bhakti-categories-toggle"
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span>Bhakti Categories</span>}
                  </div>
                  {!collapsed && (bhaktiExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                </button>
                {bhaktiExpanded && !collapsed && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-[#E8E4E1] pl-2">
                    {bhaktiItems.map(({ to, icon: BIcon, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-[#FEF0EC] text-[#E95A34]'
                              : 'text-[#7A8690] hover:bg-[#F3EDEA] hover:text-[#374652]'
                          }`
                        }
                        data-testid={`nav-${to.slice(7)}`}
                      >
                        <BIcon size={14} className="flex-shrink-0" />
                        <span className="truncate">{label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          
          const { to, icon: Icon, label } = item;
          // Role-based visibility
          if (to === '/admin/admin-users' && user?.role !== 'super_admin') return null;
          if (to === '/admin/settings' && user?.role !== 'super_admin') return null;
          if (to === '/admin/integrations' && user?.role !== 'super_admin') return null;
          if (to === '/admin/security' && user?.role !== 'super_admin') return null;
          if (to === '/admin/users' && user?.role === 'moderator') return null;

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#FEF0EC] text-[#D08465] border-l-2 border-[#E95A34]'
                    : 'text-[#7A8690] hover:bg-[#F3EDEA] hover:text-[#374652]'
                }`
              }
              data-testid={`nav-${to.slice(1)}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#E8E4E1] p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 bg-[#FDDDD4] rounded-full flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-[#E95A34]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#374652] truncate">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-[#7A8690]">{roleLabel[user?.role] || user?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-[#7A8690] hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''}`}
          data-testid="logout-btn"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
