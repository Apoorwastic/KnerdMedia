import { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, RefreshCw, Palette,
  Calendar, ClipboardList, Users, Shield, LogOut, Zap, ChevronRight, Settings
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSidebarStore } from '../../stores/sidebarStore';
import { Section } from '../../types';

const SECTION_ROUTES: Record<Section, string> = {
  PERFORMANCE: 'performance',
  RETENTION: 'retention',
  CREATIVES: 'creatives',
};

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSection, setActiveSection, toggle } = useSidebarStore();

  useEffect(() => {
    if (location.pathname.startsWith('/performance')) setActiveSection('PERFORMANCE');
    else if (location.pathname.startsWith('/retention')) setActiveSection('RETENTION');
    else if (location.pathname.startsWith('/creatives')) setActiveSection('CREATIVES');
  }, [location.pathname]);

  const canSeeAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const handleSectionClick = (section: Section) => {
    if (activeSection === section) {
      toggle(section);
    } else {
      setActiveSection(section);
      navigate(`/${SECTION_ROUTES[section]}`);
    }
  };

  const sectionItems: { section: Section; label: string; icon: React.ElementType }[] = [
    { section: 'PERFORMANCE', label: 'Performance', icon: TrendingUp },
    { section: 'RETENTION',   label: 'Retention',   icon: RefreshCw },
    { section: 'CREATIVES',   label: 'Creatives',   icon: Palette },
  ];

  const navClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-[#00d4c8] text-[#0a1628]'
        : 'text-[#8fa3b8] hover:bg-[#162032] hover:text-white'
    }`;

  return (
    <aside className="w-56 flex-shrink-0 bg-[#0d1f38] border-r border-[#1e3a5f] flex flex-col h-screen sticky top-0 z-20">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1e3a5f]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#00d4c8] rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-[#0a1628]" />
          </div>
          <div>
            <span className="font-semibold text-white text-sm block leading-tight">Knerd Media</span>
            <span className="text-[10px] text-[#4a6278] leading-tight">Performance First</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
          <LayoutDashboard size={17} /> Dashboard
        </NavLink>

        <NavLink to="/tracker" className={({ isActive }) => navClass(isActive)}>
          <ClipboardList size={17} /> My tracker
        </NavLink>

        {canSeeAdmin && (
          <NavLink to="/team-tracker" className={({ isActive }) => navClass(isActive)}>
            <Users size={17} /> Team tracker
          </NavLink>
        )}

        {canSeeAdmin && (
          <NavLink to="/admin" className={({ isActive }) => navClass(isActive)}>
            <Shield size={17} /> Admin panel
          </NavLink>
        )}

        <div className="pt-3 pb-1">
          <p className="text-xs font-semibold text-[#4a6278] uppercase tracking-wider px-3 py-1">Accounts</p>
        </div>

        {sectionItems.map(({ section, label, icon: Icon }) => {
          const isActive = activeSection === section;
          const routeActive = location.pathname.startsWith(`/${SECTION_ROUTES[section]}`);
          return (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive || routeActive
                  ? 'bg-[#00d4c8] text-[#0a1628]'
                  : 'text-[#8fa3b8] hover:bg-[#162032] hover:text-white'
              }`}
            >
              <Icon size={17} />
              <span className="flex-1 text-left">{label}</span>
              <ChevronRight size={14} className={`transition-transform ${isActive ? 'rotate-90' : ''}`} />
            </button>
          );
        })}

        <NavLink to="/operations" className={({ isActive }) => navClass(isActive)}>
          <Calendar size={17} /> Operations
        </NavLink>
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[#1e3a5f]">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-[#162032] border border-[#1e3a5f] flex items-center justify-center text-xs font-semibold text-[#00d4c8] flex-shrink-0">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-[#4a6278] capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
          <button onClick={() => navigate('/settings')} className="text-[#4a6278] hover:text-[#00d4c8] transition-colors">
            <Settings size={14} />
          </button>
          <button onClick={() => { clearAuth(); navigate('/login'); }} className="text-[#4a6278] hover:text-[#00d4c8] transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
