import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, ArrowLeft, Repeat, Search } from 'lucide-react';
import api from '../lib/api';
import { Task, Client, Section, TaskStatus } from '../types';
import { StatusBadge, PriorityBadge } from '../components/ui/StatusBadge';
import TaskModal from '../components/tasks/TaskModal';
import AddTaskModal from '../components/tasks/AddTaskModal';
import { useAuthStore } from '../stores/authStore';

const sectionRoutes: Record<Section, string> = { PERFORMANCE: 'performance', RETENTION: 'retention', CREATIVES: 'creatives' };

export default function ClientTasksPage({ section }: { section: Section }) {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [search, setSearch] = useState('');

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ['clients'], queryFn: () => api.get('/clients').then(r => r.data) });
  const client = clients.find(c => c.id === clientId);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', clientId, section],
    queryFn: () => api.get('/tasks', { params: { clientId, section } }).then(r => r.data),
    enabled: !!clientId,
  });

  const filtered = tasks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, task) => {
    const key = task.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const statusOrder: TaskStatus[] = ['BLOCKED', 'IN_PROGRESS', 'IN_REVIEW', 'TODO', 'DONE'];
  const canAdd = user?.role !== 'MEMBER';

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-[#1e3a5f] border-t-[#00d4c8] rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/${sectionRoutes[section]}`)} className="p-2 hover:bg-[#162032] rounded-xl transition-colors">
            <ArrowLeft size={16} className="text-[#8fa3b8]" />
          </button>
          <div className="flex items-center gap-2">
            {client && <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: client.color }}>{client.name.charAt(0)}</div>}
            <div>
              <h1 className="text-xl font-bold text-white">{client?.name}</h1>
              <p className="text-xs text-[#4a6278] capitalize">{section.toLowerCase()} · {tasks.length} tasks</p>
            </div>
          </div>
        </div>
        {canAdd && (
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 bg-[#00d4c8] text-[#0a1628] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00b8ac] transition-colors">
            <Plus size={15} /> Add task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6278]" />
          <input className="w-full border border-[#1e3a5f] bg-[#0d1f38] text-white placeholder:text-[#4a6278] rounded-xl pl-8 pr-3 py-2 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-[#1e3a5f] bg-[#0d1f38] text-white rounded-xl px-3 py-2 text-sm focus:border-[#00d4c8] focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value as TaskStatus | '')}>
          <option value="">All statuses</option>
          {(['TODO','IN_PROGRESS','IN_REVIEW','BLOCKED','DONE'] as TaskStatus[]).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {/* Task groups */}
      {statusOrder.filter(s => grouped[s]?.length).map(status => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={status as TaskStatus} />
            <span className="text-xs text-[#4a6278]">{grouped[status]?.length}</span>
          </div>
          <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e3a5f]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#4a6278]">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a6278]">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a6278]">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a6278]">Due date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {grouped[status]?.map((task) => (
                  <tr key={task.id} className="hover:bg-[#162032] cursor-pointer transition-colors" onClick={() => setSelectedTask(task)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{task.title}</span>
                        {task.isRecurring && <Repeat size={12} className="text-purple-400" />}
                      </div>
                      {task.goal && <p className="text-xs text-[#4a6278] mt-0.5 truncate max-w-sm">{task.goal}</p>}
                    </td>
                    <td className="px-4 py-3.5"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-4 py-3.5">
                      {task.assignees?.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {task.assignees.slice(0, 3).map(a => (
                            <div key={a.id} title={a.user.name} className="w-6 h-6 rounded-full bg-[#162032] border border-[#1e3a5f] flex items-center justify-center text-xs font-medium text-white">{a.user.name.charAt(0)}</div>
                          ))}
                          {task.assignees.length > 3 && <span className="text-xs text-[#4a6278]">+{task.assignees.length - 3}</span>}
                        </div>
                      ) : <span className="text-sm text-[#4a6278]">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#8fa3b8]">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-12 text-center">
          <p className="text-[#4a6278] text-sm">No tasks found.</p>
          {canAdd && <button onClick={() => setAddOpen(true)} className="mt-3 text-sm text-[#8fa3b8] hover:text-[#00d4c8] underline transition-colors">Add the first task</button>}
        </div>
      )}

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} clientId={clientId} section={section} />}
      {addOpen && clientId && <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} clientId={clientId} section={section} />}
    </div>
  );
}
