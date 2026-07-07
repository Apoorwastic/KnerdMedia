import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Globe, Users, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { Client, Section } from '../types';
import AddProjectModal from '../components/AddProjectModal';

const SECTION_LABELS: Record<Section, string> = { PERFORMANCE: 'Performance', RETENTION: 'Retention', CREATIVES: 'Creatives' };
const SECTION_COLORS: Record<Section, string> = {
  PERFORMANCE: 'bg-blue-900/30 text-blue-300',
  RETENTION:   'bg-emerald-900/30 text-emerald-300',
  CREATIVES:   'bg-pink-900/30 text-pink-300',
};

export default function Projects() {
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-[#1e3a5f] border-t-[#00d4c8] rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-sm text-[#8fa3b8] mt-0.5">{clients.length} account{clients.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-[#00d4c8] text-[#0a1628] px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#00b8ac] transition-colors"
        >
          <Plus size={15} /> Add account
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-[#0d1f38] rounded-2xl border border-dashed border-[#1e3a5f]">
          <p className="text-[#4a6278] text-sm mb-3">No accounts yet</p>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white border border-[#1e3a5f] px-4 py-2 rounded-xl hover:bg-[#162032]">
            <Plus size={14} /> Add first account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {clients.map(client => (
            <AccountCard key={client.id} client={client} onClick={() => navigate(`/accounts/${client.id}`)} />
          ))}
        </div>
      )}

      <AddProjectModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AccountCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const sectionList = client.sections.map(s => s.section as Section);

  return (
    <button
      onClick={onClick}
      className="bg-[#0d1f38] rounded-2xl shadow-sm hover:shadow-md hover:bg-[#162032] transition-all text-left overflow-hidden group border border-[#1e3a5f]"
    >
      {/* Color bar */}
      <div className="h-2 w-full" style={{ backgroundColor: client.color }} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: client.color }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{client.name}</h3>
            {client.industry && <p className="text-xs text-[#4a6278] mt-0.5">{client.industry}</p>}
          </div>
          <ExternalLink size={14} className="text-[#4a6278] group-hover:text-[#8fa3b8] flex-shrink-0 mt-0.5 transition-colors" />
        </div>

        {/* Description */}
        {client.description && (
          <p className="text-sm text-[#8fa3b8] line-clamp-2 leading-relaxed">{client.description}</p>
        )}

        {/* Sections */}
        {sectionList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sectionList.map(s => (
              <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${SECTION_COLORS[s]}`}>
                {SECTION_LABELS[s]}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1e3a5f] text-xs text-[#4a6278]">
          <span className="flex items-center gap-1">
            <Users size={11} /> {client.members.length} member{client.members.length !== 1 ? 's' : ''}
          </span>
          {client.website && (
            <span className="flex items-center gap-1 truncate max-w-[120px]">
              <Globe size={11} /> {client.website.replace(/^https?:\/\//, '')}
            </span>
          )}
          {client.founderName && !client.website && (
            <span className="truncate max-w-[120px]">{client.founderName}</span>
          )}
        </div>
      </div>
    </button>
  );
}
