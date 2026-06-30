import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Send, Repeat, Trash2, X, Clock, Users, CalendarDays } from 'lucide-react';
import Modal from '../ui/Modal';
import { StatusBadge, PriorityBadge } from '../ui/StatusBadge';
import { Task, User, TaskStatus, Priority, RecurringPattern, Section, TaskType, DAYS_OF_WEEK, DayOfWeek } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  task: Task | null;
  onClose: () => void;
  clientId?: string;
  section?: Section;
}

const DAY_LABELS: Record<string, string> = { MON:'M', TUE:'T', WED:'W', THU:'T', FRI:'F', SAT:'S', SUN:'S' };

const TYPE_ICONS: Record<string, string> = { TASK: '✓', EVENT: '📅', MEETING: '👥' };
const TYPE_COLORS: Record<string, string> = {
  TASK:    'bg-gray-100 text-gray-600',
  EVENT:   'bg-blue-100 text-blue-700',
  MEETING: 'bg-purple-100 text-purple-700',
};

export default function TaskModal({ task, onClose }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignees?.map(a => a.userId) || []);
  const [form, setForm] = useState({
    title:             task?.title || '',
    description:       task?.description || '',
    goal:              task?.goal || '',
    type:              (task?.type || 'TASK') as TaskType,
    status:            (task?.status || 'TODO') as TaskStatus,
    priority:          (task?.priority || 'MEDIUM') as Priority,
    dueDate:           task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    time:              task?.time || '',
    isRecurring:       task?.isRecurring || false,
    recurringPattern:  (task?.recurringPattern || 'WEEKLY') as RecurringPattern,
    recurringDays:     task?.recurringDays ? task.recurringDays.split(',') as DayOfWeek[] : [] as DayOfWeek[],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const updateTask = useMutation({
    mutationFn: () => api.put(`/tasks/${task!.id}`, {
      ...form,
      recurringDays: form.recurringDays.join(',') || undefined,
      assigneeIds,
    }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setEditing(false); }
  });

  const deleteTask = useMutation({
    mutationFn: () => api.delete(`/tasks/${task!.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose(); }
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/tasks/${task!.id}/comments`, { content: comment }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setComment(''); }
  });

  if (!task) return null;

  const canEdit = user?.role !== 'MEMBER';
  const toggleAssignee = (id: string) =>
    setAssigneeIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  const toggleDay = (day: DayOfWeek) =>
    setForm(f => ({ ...f, recurringDays: f.recurringDays.includes(day) ? f.recurringDays.filter(d => d !== day) : [...f.recurringDays, day] }));

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit task' : 'Details'} size="lg">
      {editing ? (
        <div className="space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {(['TASK','EVENT','MEETING'] as TaskType[]).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border-2 transition-all ${form.type === t ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
                {TYPE_ICONS[t]} {t}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Goal</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2} value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
                {(['TODO','IN_PROGRESS','IN_REVIEW','BLOCKED','DONE'] as TaskStatus[]).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                {(['LOW','MEDIUM','HIGH','URGENT'] as Priority[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
              <input type="time" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          {/* Assignees */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">{form.type === 'MEETING' ? 'Attendees' : 'Assigned to'}</label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => {
                const sel = assigneeIds.includes(u.id);
                return (
                  <button key={u.id} onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs transition-all ${sel ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${sel ? 'bg-white text-gray-900' : 'bg-gray-200'}`}>{u.name.charAt(0)}</span>
                    {u.name.split(' ')[0]}
                    {sel && <X size={10} />}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Recurring */}
          <div className="border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
                className={`w-8 h-4 rounded-full relative flex-shrink-0 transition-colors ${form.isRecurring ? 'bg-gray-900' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${form.isRecurring ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-gray-700 font-medium flex items-center gap-1"><Repeat size={13} /> Recurring</span>
            </div>
            {form.isRecurring && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {DAYS_OF_WEEK.map(day => (
                    <button key={day} onClick={() => toggleDay(day)}
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${form.recurringDays.includes(day) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {(['DAILY','WEEKLY','BIWEEKLY','MONTHLY'] as RecurringPattern[]).map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, recurringPattern: p }))}
                      className={`flex-1 py-1 text-xs font-medium rounded-lg border transition-all ${form.recurringPattern === p ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => updateTask.mutate()} disabled={updateTask.isPending} className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">Save changes</button>
            <button onClick={() => setEditing(false)} className="px-4 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-gray-900 text-lg leading-snug">{task.title}</h3>
            {canEdit && (
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Edit</button>
                <button onClick={() => deleteTask.mutate()} className="p-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[task.type]}`}>
              {TYPE_ICONS[task.type]} {task.type.charAt(0) + task.type.slice(1).toLowerCase()}
            </span>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.isRecurring && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                <Repeat size={10} />
                {task.recurringDays ? task.recurringDays.split(',').map(d => d.slice(0,2)).join(' ') : task.recurringPattern}
              </span>
            )}
          </div>

          {/* Goal */}
          {task.goal && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Goal</p>
              <p className="text-sm text-blue-900">{task.goal}</p>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-700">{task.description}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><CalendarDays size={11} /> Date</p>
              <p className="font-medium">{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}</p>
            </div>
            {task.time && (
              <div>
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock size={11} /> Time</p>
                <p className="font-medium">{task.time}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Client</p>
              <p className="font-medium">{task.client?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Created by</p>
              <p className="font-medium">{task.creator?.name}</p>
            </div>
          </div>

          {/* Assignees / Attendees */}
          {task.assignees?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <Users size={11} /> {task.type === 'MEETING' ? 'Attendees' : 'Assigned to'} ({task.assignees.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map(a => (
                  <span key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                    <span className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">{a.user.name.charAt(0)}</span>
                    {a.user.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Comments ({task.comments?.length || 0})</p>
            <div className="space-y-2.5 mb-3 max-h-36 overflow-y-auto">
              {task.comments?.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold flex-shrink-0">{c.user.name.charAt(0)}</div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-medium text-gray-700">{c.user.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) addComment.mutate(); }} />
              <button onClick={() => addComment.mutate()} disabled={!comment.trim()} className="p-2 bg-[#1a1a1a] text-white rounded-xl disabled:opacity-40 hover:bg-gray-800">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
