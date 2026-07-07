import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Send, Repeat, Trash2, X, Clock, Users, CalendarDays, Video, Plus, ExternalLink } from 'lucide-react';
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
const TYPE_ICONS: Record<string, string> = { TASK: '✓', EVENT: '📅', MEETING: '📹' };
const TYPE_COLORS: Record<string, string> = {
  TASK:    'bg-[#162032] text-[#8fa3b8]',
  EVENT:   'bg-blue-900/30 text-blue-400',
  MEETING: 'bg-purple-900/30 text-purple-400',
};
const DURATION_OPTIONS = [
  { value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' }, { value: 90, label: '1.5 hrs' }, { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

const inputClass = 'w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-3 py-2 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors';
const selectClass = 'w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-xl px-3 py-2 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors';
const labelClass = 'block text-xs font-medium text-[#8fa3b8] mb-1';

function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

export default function TaskModal({ task, onClose }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const emailRef = useRef<HTMLInputElement>(null);

  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignees?.map(a => a.userId) || []);
  const [externalEmails, setExternalEmails] = useState<string[]>(
    task?.externalEmails ? task.externalEmails.split(',').map(e => e.trim()).filter(Boolean) : []
  );
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState('');

  const [form, setForm] = useState({
    title:            task?.title || '',
    description:      task?.description || '',
    goal:             task?.goal || '',
    type:             (task?.type || 'TASK') as TaskType,
    status:           (task?.status || 'TODO') as TaskStatus,
    priority:         (task?.priority || 'MEDIUM') as Priority,
    dueDate:          task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    time:             task?.time || '',
    duration:         task?.duration || 60,
    isRecurring:      task?.isRecurring || false,
    recurringPattern: (task?.recurringPattern || 'WEEKLY') as RecurringPattern,
    recurringDays:    task?.recurringDays ? task.recurringDays.split(',') as DayOfWeek[] : [] as DayOfWeek[],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const updateTask = useMutation({
    mutationFn: () => api.put(`/tasks/${task!.id}`, {
      ...form,
      duration: form.duration,
      recurringDays: form.recurringDays.join(',') || undefined,
      externalEmails: externalEmails.join(',') || undefined,
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
  const isMeeting = task.type === 'MEETING';

  const toggleAssignee = (id: string) =>
    setAssigneeIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  const toggleDay = (day: DayOfWeek) =>
    setForm(f => ({ ...f, recurringDays: f.recurringDays.includes(day) ? f.recurringDays.filter(d => d !== day) : [...f.recurringDays, day] }));

  const addEmail = () => {
    const email = emailDraft.trim();
    if (!email) return;
    if (!isValidEmail(email)) { setEmailError('Invalid email'); return; }
    if (externalEmails.includes(email)) { setEmailError('Already added'); return; }
    setExternalEmails(prev => [...prev, email]);
    setEmailDraft(''); setEmailError('');
    emailRef.current?.focus();
  };

  const endTime = (() => {
    if (!task.time || !task.duration) return null;
    const [h, m] = task.time.split(':').map(Number);
    const total = h * 60 + m + (task.duration || 60);
    return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
  })();

  return (
    <Modal open={true} onClose={onClose} title={editing ? 'Edit' : 'Details'} size="lg">
      {editing ? (
        <div className="space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {(['TASK','EVENT','MEETING'] as TaskType[]).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border-2 transition-all ${form.type === t ? 'border-[#00d4c8] bg-[#00d4c8]/10 text-[#00d4c8]' : 'border-[#1e3a5f] text-[#8fa3b8] hover:border-[#8fa3b8]'}`}>
                {TYPE_ICONS[t]} {t}
              </button>
            ))}
          </div>

          <div>
            <label className={labelClass}>Title</label>
            <input className={inputClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          {form.type === 'TASK' && (
            <div>
              <label className={labelClass}>Goal</label>
              <textarea className={inputClass + ' resize-none'} rows={2} value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
            </div>
          )}
          <div>
            <label className={labelClass}>{form.type === 'MEETING' ? 'Agenda' : 'Description'}</label>
            <textarea className={inputClass + ' resize-none'} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select className={selectClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
                {(['TODO','IN_PROGRESS','IN_REVIEW','BLOCKED','DONE'] as TaskStatus[]).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select className={selectClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                {(['LOW','MEDIUM','HIGH','URGENT'] as Priority[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" className={inputClass} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Time</label>
              <input type="time" className={inputClass} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Duration</label>
              <select className={selectClass} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}>
                {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className={labelClass + ' mb-2'}>{form.type === 'MEETING' ? 'Team attendees' : 'Assigned to'}</label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => {
                const sel = assigneeIds.includes(u.id);
                return (
                  <button key={u.id} onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs transition-all ${sel ? 'bg-[#00d4c8] text-[#0a1628] border-[#00d4c8]' : 'border-[#1e3a5f] text-[#8fa3b8] hover:border-[#00d4c8]/40'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${sel ? 'bg-[#0a1628] text-[#00d4c8]' : 'bg-[#162032]'}`}>{u.name.charAt(0)}</span>
                    {u.name.split(' ')[0]}
                    {sel && <X size={10} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* External emails for meetings */}
          {form.type === 'MEETING' && (
            <div>
              <label className={labelClass + ' mb-2'}>External attendees</label>
              {externalEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {externalEmails.map(email => (
                    <span key={email} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0d1f38] border border-[#1e3a5f] rounded-full text-xs text-gray-200">
                      {email}
                      <button onClick={() => setExternalEmails(prev => prev.filter(e => e !== email))} className="text-[#4a6278] hover:text-red-400"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input ref={emailRef} className={inputClass + ' flex-1'} placeholder="external@email.com" value={emailDraft}
                  onChange={e => { setEmailDraft(e.target.value); setEmailError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} />
                <button onClick={addEmail} className="px-3 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] rounded-xl text-[#00d4c8]"><Plus size={14} /></button>
              </div>
              {emailError && <p className="text-xs text-red-400 mt-1">{emailError}</p>}
            </div>
          )}

          {/* Recurring (task only) */}
          {form.type === 'TASK' && (
            <div className="border border-[#1e3a5f] rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
                  className={`w-8 h-4 rounded-full relative flex-shrink-0 transition-colors ${form.isRecurring ? 'bg-[#00d4c8]' : 'bg-[#162032]'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${form.isRecurring ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-200 font-medium flex items-center gap-1"><Repeat size={13} /> Recurring</span>
              </div>
              {form.isRecurring && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-1">
                    {DAYS_OF_WEEK.map(day => (
                      <button key={day} onClick={() => toggleDay(day)}
                        className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${form.recurringDays.includes(day) ? 'bg-[#00d4c8] text-[#0a1628]' : 'bg-[#162032] text-[#4a6278] hover:bg-[#1e3a5f]'}`}>
                        {DAY_LABELS[day]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    {(['DAILY','WEEKLY','BIWEEKLY','MONTHLY'] as RecurringPattern[]).map(p => (
                      <button key={p} onClick={() => setForm(f => ({ ...f, recurringPattern: p }))}
                        className={`flex-1 py-1 text-xs font-medium rounded-lg border transition-all ${form.recurringPattern === p ? 'bg-[#00d4c8] text-[#0a1628] border-[#00d4c8]' : 'border-[#1e3a5f] text-[#8fa3b8] hover:border-[#8fa3b8]'}`}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => updateTask.mutate()} disabled={updateTask.isPending}
              className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-bold hover:bg-[#00b8ac] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {updateTask.isPending ? <><span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin" /> Saving...</> : 'Save changes'}
            </button>
            <button onClick={() => setEditing(false)} className="px-4 border border-[#1e3a5f] rounded-xl text-sm text-[#8fa3b8] hover:bg-[#162032] transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-white text-lg leading-snug">{task.title}</h3>
            {canEdit && (
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-[#1e3a5f] rounded-lg text-xs text-[#8fa3b8] hover:bg-[#162032] transition-colors">Edit</button>
                <button onClick={() => deleteTask.mutate()} className="p-1.5 border border-red-900/40 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400">
                <Repeat size={10} />
                {task.recurringDays ? task.recurringDays.split(',').map(d => d.slice(0,2)).join(' ') : task.recurringPattern}
              </span>
            )}
          </div>

          {/* Meet link — prominent for meetings */}
          {isMeeting && task.meetLink && (
            <a href={task.meetLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-purple-900/20 border border-purple-900/40 hover:border-purple-500/60 rounded-xl transition-all group">
              <div className="w-9 h-9 rounded-xl bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                <Video size={17} className="text-purple-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-purple-300">Join Google Meet</p>
                <p className="text-xs text-purple-400/70 truncate">{task.meetLink}</p>
              </div>
              <ExternalLink size={14} className="text-purple-400/60 group-hover:text-purple-300 flex-shrink-0 transition-colors" />
            </a>
          )}

          {isMeeting && !task.meetLink && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#162032] border border-[#1e3a5f] rounded-xl">
              <Video size={16} className="text-[#4a6278]" />
              <p className="text-sm text-[#4a6278]">Google Meet link not configured — add Google credentials to enable</p>
            </div>
          )}

          {/* Goal */}
          {task.goal && (
            <div className="bg-[#00d4c8]/10 border border-[#00d4c8]/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-[#00d4c8] uppercase tracking-wide mb-1">Goal</p>
              <p className="text-sm text-gray-200">{task.goal}</p>
            </div>
          )}

          {/* Description / Agenda */}
          {task.description && (
            <div>
              <p className="text-xs font-semibold text-[#4a6278] uppercase tracking-wide mb-1">{isMeeting ? 'Agenda' : 'Description'}</p>
              <p className="text-sm text-gray-200">{task.description}</p>
            </div>
          )}

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#4a6278] mb-1 flex items-center gap-1"><CalendarDays size={11} /> {isMeeting ? 'Meeting date' : 'Date'}</p>
              <p className="font-medium text-white">{task.dueDate ? format(new Date(task.dueDate), 'EEE, MMM d yyyy') : '—'}</p>
            </div>
            {(task.time || task.duration) && (
              <div>
                <p className="text-xs text-[#4a6278] mb-1 flex items-center gap-1"><Clock size={11} /> Time</p>
                <p className="font-medium text-white">
                  {task.time || '—'}
                  {endTime && <span className="text-[#8fa3b8]"> – {endTime}</span>}
                  {task.duration && <span className="ml-1.5 text-xs text-[#4a6278]">({DURATION_OPTIONS.find(d => d.value === task.duration)?.label || `${task.duration}m`})</span>}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#4a6278] mb-1">Client</p>
              <p className="font-medium text-white">{task.client?.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#4a6278] mb-1">Created by</p>
              <p className="font-medium text-white">{task.creator?.name}</p>
            </div>
          </div>

          {/* Attendees */}
          {(task.assignees?.length > 0 || (task.externalEmails && task.externalEmails.length > 0)) && (
            <div>
              <p className="text-xs text-[#4a6278] mb-2 flex items-center gap-1">
                <Users size={11} /> {isMeeting ? 'Attendees' : 'Assigned to'}
                {' '}({task.assignees.length + (task.externalEmails ? task.externalEmails.split(',').filter(Boolean).length : 0)})
              </p>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map(a => (
                  <span key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#162032] rounded-full text-xs font-medium text-gray-200">
                    <span className="w-4 h-4 rounded-full bg-[#1e3a5f] flex items-center justify-center text-xs font-bold text-[#00d4c8]">{a.user.name.charAt(0)}</span>
                    {a.user.name}
                  </span>
                ))}
                {task.externalEmails && task.externalEmails.split(',').filter(Boolean).map(email => (
                  <span key={email} className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-900/20 border border-purple-900/30 rounded-full text-xs font-medium text-purple-300">
                    <span className="w-4 h-4 rounded-full bg-purple-900/40 flex items-center justify-center text-xs font-bold">{email.trim()[0].toUpperCase()}</span>
                    {email.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="border-t border-[#1e3a5f] pt-4">
            <p className="text-xs font-semibold text-[#4a6278] uppercase tracking-wide mb-3">Comments ({task.comments?.length || 0})</p>
            <div className="space-y-2.5 mb-3 max-h-36 overflow-y-auto">
              {task.comments?.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#162032] border border-[#1e3a5f] flex items-center justify-center text-xs font-semibold flex-shrink-0 text-[#00d4c8]">{c.user.name.charAt(0)}</div>
                  <div className="flex-1 bg-[#162032] rounded-xl px-3 py-2">
                    <p className="text-xs font-medium text-gray-200">{c.user.name}</p>
                    <p className="text-xs text-[#8fa3b8] mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-3 py-2 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors"
                placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) addComment.mutate(); }} />
              <button onClick={() => addComment.mutate()} disabled={!comment.trim()}
                className="p-2 bg-[#00d4c8] text-[#0a1628] rounded-xl disabled:opacity-40 hover:bg-[#00b8ac] transition-colors">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
