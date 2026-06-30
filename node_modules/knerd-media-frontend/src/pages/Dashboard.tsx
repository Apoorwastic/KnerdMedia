import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, ArrowRight, Briefcase } from 'lucide-react';
import api from '../lib/api';
import { DashboardData, Client } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuthStore } from '../stores/authStore';
import AddProjectModal from '../components/AddProjectModal';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/tasks/dashboard').then(r => r.data)
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then(r => r.data),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full" /></div>;
  if (!data) return null;

  const statCards = [
    { label: 'Ongoing',   value: data.ongoing,   color: 'text-blue-600' },
    { label: 'In review', value: data.inReview,   color: 'text-amber-700' },
    { label: 'Blocked',   value: data.blocked,    color: 'text-red-600' },
    { label: 'Clients',   value: data.clients,    color: 'text-gray-700' },
    { label: 'Overdue',   value: data.overdue,    color: 'text-red-700' },
  ];

  const taskStatusData = [
    { name: 'To do',       value: data.todo,      color: '#9ca3af' },
    { name: 'In progress', value: data.ongoing,   color: '#3b82f6' },
    { name: 'In review',   value: data.inReview,  color: '#d97706' },
    { name: 'Blocked',     value: data.blocked,   color: '#dc2626' },
    { name: 'Done',        value: data.done,      color: '#16a34a' },
  ];
  const totalTasks = taskStatusData.reduce((s, d) => s + d.value, 0) || 1;

  const deptData = Object.entries(data.deptCounts || {}).map(([name, value]) => ({ name, value }));
  const maxDept = Math.max(...deptData.map(d => d.value), 1);
  const deptColors: Record<string, string> = { Performance: '#8b5cf6', Retention: '#10b981', Creatives: '#f43f5e' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Across {data.clients} active clients today</p>
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setAddProjectOpen(true)}
            className="flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus size={15} /> Add account
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Tasks by status</h3>
          <div className="space-y-2.5">
            {taskStatusData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24 flex-shrink-0">{name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                  <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max((value / totalTasks) * 100, 5)}%`, backgroundColor: color }}>
                    <span className="text-white text-xs font-medium">{value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Workload by department</h3>
          <div className="space-y-3">
            {deptData.length === 0 && <p className="text-sm text-gray-400">No data yet</p>}
            {deptData.map(({ name, value }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-28 flex-shrink-0">{name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(value / maxDept) * 100}%`, backgroundColor: deptColors[name] || '#6b7280' }} />
                </div>
                <span className="text-sm font-medium text-gray-700 w-4">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming deadlines */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Upcoming deadlines</h3>
        </div>
        <table className="w-full">
          <tbody className="divide-y divide-gray-50">
            {data.upcoming?.slice(0, 8).map((task) => (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-400">{task.client?.name} · {task.section?.charAt(0) + task.section?.slice(1).toLowerCase()}</p>
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={task.status} /></td>
                <td className="px-4 py-3.5 text-sm text-gray-600 text-right pr-5">
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data.upcoming || data.upcoming.length === 0) && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No upcoming deadlines</div>
        )}
      </div>

      {/* Projects section — Super Admin only */}
      {user?.role === 'SUPER_ADMIN' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase size={15} className="text-gray-500" /> Accounts
            </h3>
            <button onClick={() => navigate('/accounts')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="p-5">
            {clients.length === 0 ? (
              <p className="text-sm text-gray-400">No projects yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {clients.slice(0, 8).map(c => (
                  <button key={c.id} onClick={() => navigate(`/accounts/${c.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all text-left group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: c.color }}>
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700">{c.name}</p>
                      {c.industry && <p className="text-xs text-gray-400 truncate">{c.industry}</p>}
                    </div>
                  </button>
                ))}
                {clients.length > 8 && (
                  <button onClick={() => navigate('/accounts')} className="flex items-center justify-center p-3 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all">
                    +{clients.length - 8} more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <AddProjectModal open={addProjectOpen} onClose={() => setAddProjectOpen(false)} />
    </div>
  );
}
