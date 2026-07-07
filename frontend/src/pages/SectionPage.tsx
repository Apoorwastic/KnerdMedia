import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import api from '../lib/api';
import { Client, Section } from '../types';

const sectionMeta: Record<Section, { label: string; description: string; route: string }> = {
  PERFORMANCE: { label: 'Performance Marketing', description: 'Paid media, acquisition campaigns, and growth initiatives', route: 'performance' },
  RETENTION: { label: 'Retention Marketing', description: 'Email, SMS, loyalty programs and customer lifetime value', route: 'retention' },
  CREATIVES: { label: 'Creatives', description: 'Ad creatives, brand assets, video production and design', route: 'creatives' },
};

const sectionAccent: Record<Section, string> = {
  PERFORMANCE: '#00d4c8',
  RETENTION: '#34d399',
  CREATIVES: '#f472b6',
};

export default function SectionPage({ section }: { section: Section }) {
  const navigate = useNavigate();
  const meta = sectionMeta[section];
  const accent = sectionAccent[section];

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients-section', section],
    queryFn: () => api.get(`/clients/section/${section}`).then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-[#1e3a5f] border-t-[#00d4c8] rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{meta.label}</h1>
        <p className="text-sm text-[#8fa3b8] mt-0.5">{meta.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {clients.map((client) => (
          <button
            key={client.id}
            onClick={() => navigate(`/${meta.route}/${client.id}`)}
            className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-5 hover:border-[#00d4c8]/40 hover:bg-[#162032] transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: client.color }}>
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{client.name}</h3>
                  {client.description && <p className="text-xs text-[#4a6278]">{client.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-[#4a6278]">
                  <Users size={13} />
                  {client.members?.length || 0} member{client.members?.length !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1">
                  {client.sections?.map((s) => (
                    <span key={s.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={s.section === section ? { backgroundColor: accent + '20', color: accent } : { backgroundColor: '#162032', color: '#4a6278' }}>
                      {s.section.charAt(0) + s.section.slice(1).toLowerCase()}
                    </span>
                  ))}
                </div>
                <ArrowRight size={16} className="text-[#4a6278] group-hover:text-[#00d4c8] transition-colors" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {clients.length === 0 && (
        <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-12 text-center">
          <p className="text-[#4a6278] text-sm">No accounts assigned to this section yet.</p>
        </div>
      )}
    </div>
  );
}
