import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import SubSidebar from './SubSidebar';
import { useSidebarStore } from '../../stores/sidebarStore';

export default function Layout() {
  const { activeSection } = useSidebarStore();

  return (
    <div className="flex h-screen bg-[#0a1628] overflow-hidden">
      <Sidebar />
      {activeSection && <SubSidebar section={activeSection} />}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
