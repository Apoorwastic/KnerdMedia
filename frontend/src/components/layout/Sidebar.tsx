import { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, RefreshCw, Palette,
  Calendar, ClipboardList, Users, Shield, LogOut, Zap, ChevronRight
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

  // Sync active section from route
  useEffect(() => {
    if (location.pathname.startsWith('/performance')) setActiveSection('PERFORMANCE');
    else if (location.pathname.startsWith('/retention')) setActiveSection('RETENTION');
    else if (location.pathname.startsWith('/creatives')) setActiveSection('CREATIVES');
    // don't close when on other pages — keep last open
  }, [location.pathname]);

  const canSeeAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const handleSectionClick = (section: Section) => {
    if (activeSection === section) {
      toggle(section); // close sub-sidebar
    } else {
      setActiveSection(section);
      navigate(`/${SECTION_ROUTES[section]}`);
    }
  };

  const sectionItems: { section: Section; label: string; icon: React.ElementType }[] = [
    { section: 'PERFORMANCE', label: 'Performance', icon: TrendingUp },
    { section: 'RETENTION', label: 'Retention', icon: RefreshCw },
    { section: 'CREATIVES', label: 'Creatives', icon: Palette },
  ];

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-20">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1a4a1a] rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">Knerd Media</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {/* Top nav items */}
        <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#1a1a1a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          <LayoutDashboard size={17} /> Dashboard
        </NavLink>

        <NavLink to="/tracker" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#1a1a1a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          <ClipboardList size={17} /> My tracker
        </NavLink>

        {canSeeAdmin && (
          <NavLink to="/team-tracker" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#1a1a1a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Users size={17} /> Team tracker
          </NavLink>
        )}

        {canSeeAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#1a1a1a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Shield size={17} /> Admin panel
          </NavLink>
        )}

        {/* Accounts divider */}
        <div className="pt-3 pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-1">Accounts</p>
        </div>

        {/* Section nav items — click opens sub-sidebar */}
        {sectionItems.map(({ section, label, icon: Icon }) => {
          const isActive = activeSection === section;
          const routeActive = location.pathname.startsWith(`/${SECTION_ROUTES[section]}`);
          return (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive || routeActive ? 'bg-[#1a1a1a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={17} />
              <span className="flex-1 text-left">{label}</span>
              <ChevronRight size={14} className={`transition-transform ${isActive ? 'rotate-90' : ''}`} />
            </button>
          );
        })}

        {/* Operations at the bottom of the clients section */}
        <NavLink to="/operations" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#1a1a1a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          <Calendar size={17} /> Operations
        </NavLink>
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
          <button onClick={() => { clearAuth(); navigate('/login'); }} className="text-gray-400 hover:text-gray-600">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
