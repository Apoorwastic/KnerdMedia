import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { X, Plus, Users } from 'lucide-react';
import api from '../../lib/api';
import { Client, Section } from '../../types';
import { useSidebarStore } from '../../stores/sidebarStore';

const SECTION_META: Record<Section, { label: string; route: string; accent: string }> = {
  PERFORMANCE: { label: 'Performance', route: 'performance', accent: '#3b82f6' },
  RETENTION:   { label: 'Retention',   route: 'retention',   accent: '#10b981' },
  CREATIVES:   { label: 'Creatives',   route: 'creatives',   accent: '#ec4899' },
};

export default function SubSidebar({ section }: { section: Section }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveSection } = useSidebarStore();
  const meta = SECTION_META[section];

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients-section', section],
    queryFn: () => api.get(`/clients/section/${section}`).then(r => r.data),
  });

  const activeClientId = location.pathname.split('/')[2]; // e.g. /performance/client-id

  return (
    <aside className="w-52 flex-shrink-0 bg-[#fafafa] border-r border-gray-200 flex flex-col h-screen sticky top-0 z-10">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: meta.accent }} />
          <span className="font-semibold text-sm text-gray-800">{meta.label}</span>
        </div>
        <button
          onClick={() => setActiveSection(null)}
          className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Brand list */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && clients.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8 px-4">No accounts in this section</p>
        )}

        <div className="px-2 space-y-0.5">
          {clients.map((client) => {
            const isActive = activeClientId === client.id;
            return (
              <button
                key={client.id}
                onClick={() => navigate(`/${meta.route}/${client.id}`)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-white shadow-sm border border-gray-200'
                    : 'hover:bg-white/70 hover:shadow-sm'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: client.color }}
                >
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                    {client.name}
                  </p>
                  {client.members?.length > 0 && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Users size={9} /> {client.members.length}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {clients.length} account{clients.length !== 1 ? 's' : ''}
        </p>
      </div>
    </aside>
  );
}
