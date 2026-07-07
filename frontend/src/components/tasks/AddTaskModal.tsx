import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Repeat, Video, Plus, Clock, CalendarDays, Users, Target, AlignLeft } from 'lucide-react';
import Modal from '../ui/Modal';
import { User, TaskStatus, Priority, RecurringPattern, Section, TaskType, DAYS_OF_WEEK, DayOfWeek } from '../../types';
import api from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  section: Section;
}

const TYPE_OPTIONS: { value: TaskType; label: string; icon: string; color: string }[] = [
  { value: 'TASK',    label: 'Task',    icon: '✓',  color: 'text-[#8fa3b8]' },
  { value: 'EVENT',   label: 'Event',   icon: '📅', color: 'text-blue-400' },
  { value: 'MEETING', label: 'Meeting', icon: '📹', color: 'text-purple-400' },
];

const DURATION_OPTIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hrs' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

const DAY_LABELS: Record<DayOfWeek, string> = { MON: 'M', TUE: 'T', WED: 'W', THU: 'T', FRI: 'F', SAT: 'S', SUN: 'S' };

const inputClass = 'w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors';
const selectClass = 'w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors';
const labelClass = 'block text-xs font-semibold text-[#4a6278] uppercase tracking-wide mb-1.5';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AddTaskModal({ open, onClose, clientId, section }: Props) {
  const qc = useQueryClient();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', description: '', goal: '',
    type: 'TASK' as TaskType,
    status: 'TODO' as TaskStatus,
    priority: 'MEDIUM' as Priority,
    dueDate: '', time: '',
    duration: 60,
    isRecurring: false,
    recurringPattern: 'WEEKLY' as RecurringPattern,
    recurringDays: [] as DayOfWeek[],
    department: section === 'PERFORMANCE' ? 'Performance' : section === 'RETENTION' ? 'Retention' : 'Creatives',
  });

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const createTask = useMutation({
    mutationFn: () => api.post('/tasks', {
      ...form,
      time: form.time || undefined,
      duration: form.duration,
      recurringDays: form.recurringDays.join(',') || undefined,
      externalEmails: externalEmails.join(',') || undefined,
      clientId, section, assigneeIds,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      resetAndClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(msg || 'Something went wrong. Please try again.');
    },
  });

  const resetAndClose = () => {
    setForm({
      title: '', description: '', goal: '', type: 'TASK', status: 'TODO', priority: 'MEDIUM',
      dueDate: '', time: '', duration: 60, isRecurring: false, recurringPattern: 'WEEKLY', recurringDays: [],
      department: form.department,
    });
    setAssigneeIds([]);
    setExternalEmails([]);
    setEmailDraft('');
    setEmailError('');
    setApiError(null);
    setValidationError(null);
    onClose();
  };

  const handleSubmit = () => {
    setValidationError(null);
    setApiError(null);
    if (!form.title.trim()) { setValidationError('Please enter a title.'); return; }
    if (isMeeting && !form.dueDate) { setValidationError('Please pick a date for the meeting.'); return; }
    createTask.mutate();
  };

  const addEmail = () => {
    const email = emailDraft.trim();
    if (!email) return;
    if (!isValidEmail(email)) { setEmailError('Invalid email address'); return; }
    if (externalEmails.includes(email)) { setEmailError('Already added'); return; }
    setExternalEmails(prev => [...prev, email]);
    setEmailDraft('');
    setEmailError('');
    emailInputRef.current?.focus();
  };

  const removeEmail = (email: string) => setExternalEmails(prev => prev.filter(e => e !== email));
  const toggleAssignee = (id: string) => setAssigneeIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  const toggleDay = (day: DayOfWeek) => setForm(f => ({
    ...f, recurringDays: f.recurringDays.includes(day) ? f.recurringDays.filter(d => d !== day) : [...f.recurringDays, day]
  }));

  const isMeeting = form.type === 'MEETING';
  const isEvent = form.type === 'EVENT';
  const totalAttendees = assigneeIds.length + externalEmails.length;

  return (
    <Modal open={open} onClose={resetAndClose} title="" size="lg">
      <div className="space-y-0">

        {/* Type selector tabs */}
        <div className="flex gap-1 p-1 bg-[#162032] rounded-xl mb-5">
          {TYPE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setForm(f => ({ ...f, type: opt.value }))}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${form.type === opt.value ? 'bg-[#0d1f38] text-white shadow' : 'text-[#4a6278] hover:text-[#8fa3b8]'}`}>
              <span className="text-base leading-none">{opt.icon}</span>
              <span className={form.type === opt.value ? opt.color : ''}>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Meet banner */}
        {isMeeting && (
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-900/20 border border-purple-900/40 rounded-xl mb-5">
            <Video size={16} className="text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-300">Google Meet link will be generated automatically</p>
              <p className="text-xs text-purple-400/70 mt-0.5">All attendees will receive a calendar invite with the Meet link</p>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="mb-4">
          <input
            className="w-full bg-transparent text-white text-xl font-semibold placeholder:text-[#4a6278] border-b border-[#1e3a5f] pb-3 focus:outline-none focus:border-[#00d4c8] transition-colors"
            placeholder={isMeeting ? 'Meeting title' : isEvent ? 'Event title' : 'Task title'}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
        </div>

        {/* ─── MEETING layout ─── */}
        {isMeeting && (
          <div className="space-y-5">

            {/* Scheduling card */}
            <div className="bg-[#162032] border border-[#1e3a5f] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-[#4a6278] uppercase tracking-wide flex items-center gap-1.5"><CalendarDays size={11} /> Schedule</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" className={inputClass} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Start time</label>
                  <input type="time" className={inputClass} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Duration</label>
                  <select className={selectClass} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}>
                    {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>
              {form.dueDate && form.time && (
                <p className="text-xs text-[#00d4c8] flex items-center gap-1.5">
                  <Clock size={11} />
                  {(() => {
                    const [h, m] = form.time.split(':').map(Number);
                    const endH = Math.floor((h * 60 + m + form.duration) / 60);
                    const endM = (h * 60 + m + form.duration) % 60;
                    return `${form.time} – ${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')} · ${DURATION_OPTIONS.find(d => d.value === form.duration)?.label}`;
                  })()}
                </p>
              )}
            </div>

            {/* Attendees card */}
            <div className="bg-[#162032] border border-[#1e3a5f] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-[#4a6278] uppercase tracking-wide flex items-center gap-1.5">
                <Users size={11} /> Attendees {totalAttendees > 0 && <span className="bg-[#00d4c8] text-[#0a1628] text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">{totalAttendees}</span>}
              </p>

              {/* Internal team members */}
              <div>
                <p className="text-xs text-[#4a6278] mb-2">Team members</p>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => {
                    const sel = assigneeIds.includes(u.id);
                    return (
                      <button key={u.id} onClick={() => toggleAssignee(u.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${sel ? 'bg-[#00d4c8] text-[#0a1628] border-[#00d4c8]' : 'border-[#1e3a5f] text-[#8fa3b8] hover:border-[#00d4c8]/40'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${sel ? 'bg-[#0a1628] text-[#00d4c8]' : 'bg-[#0d1f38]'}`}>{u.name.charAt(0)}</span>
                        {u.name.split(' ')[0]}
                        {sel && <X size={10} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* External emails */}
              <div>
                <p className="text-xs text-[#4a6278] mb-2">External attendees (by email)</p>
                {externalEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {externalEmails.map(email => (
                      <span key={email} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0d1f38] border border-[#1e3a5f] rounded-full text-xs text-gray-200">
                        <span className="w-4 h-4 rounded-full bg-purple-900/40 flex items-center justify-center text-purple-300 text-xs font-bold">{email[0].toUpperCase()}</span>
                        {email}
                        <button onClick={() => removeEmail(email)} className="text-[#4a6278] hover:text-red-400 transition-colors"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={emailInputRef}
                    className={inputClass + ' flex-1'}
                    placeholder="name@company.com"
                    value={emailDraft}
                    onChange={e => { setEmailDraft(e.target.value); setEmailError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                  />
                  <button onClick={addEmail} className="px-3 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] rounded-xl text-[#00d4c8] transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                {emailError && <p className="text-xs text-red-400 mt-1">{emailError}</p>}
                <p className="text-xs text-[#4a6278] mt-1.5">They'll get a Google Calendar invite with the Meet link</p>
              </div>
            </div>

            {/* Agenda */}
            <div>
              <label className={labelClass + ' flex items-center gap-1.5'}><AlignLeft size={11} /> Agenda / Notes</label>
              <textarea className={inputClass + ' resize-none'} rows={3} placeholder="Meeting agenda, notes, or context..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

          </div>
        )}

        {/* ─── EVENT layout ─── */}
        {isEvent && (
          <div className="space-y-4">
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
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={inputClass + ' resize-none'} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass + ' flex items-center gap-1.5'}><Users size={11} /> Assign to</label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => {
                  const sel = assigneeIds.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleAssignee(u.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${sel ? 'bg-[#00d4c8] text-[#0a1628] border-[#00d4c8]' : 'border-[#1e3a5f] text-[#8fa3b8] hover:border-[#00d4c8]/40'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${sel ? 'bg-[#0a1628] text-[#00d4c8]' : 'bg-[#162032]'}`}>{u.name.charAt(0)}</span>
                      {u.name.split(' ')[0]}
                      {sel && <X size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TASK layout ─── */}
        {form.type === 'TASK' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass + ' flex items-center gap-1.5'}><Target size={11} /> Goal / objective</label>
              <textarea className={inputClass + ' resize-none'} rows={2} placeholder="What's the desired outcome?" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass + ' flex items-center gap-1.5'}><AlignLeft size={11} /> Description</label>
              <textarea className={inputClass + ' resize-none'} rows={2} placeholder="Additional details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Due date</label>
                <input type="date" className={inputClass} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
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
            <div>
              <label className={labelClass + ' flex items-center gap-1.5'}><Users size={11} /> Assign to</label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => {
                  const sel = assigneeIds.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleAssignee(u.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${sel ? 'bg-[#00d4c8] text-[#00d4c8]/10 border-[#00d4c8]' : 'border-[#1e3a5f] text-[#8fa3b8] hover:border-[#00d4c8]/40'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${sel ? 'bg-[#00d4c8] text-[#0a1628]' : 'bg-[#162032] text-[#4a6278]'}`}>{u.name.charAt(0)}</span>
                      <span className={sel ? 'text-[#00d4c8]' : ''}>{u.name.split(' ')[0]}</span>
                      {sel && <X size={10} className="text-[#00d4c8]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recurring */}
            <div className="border border-[#1e3a5f] rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.isRecurring ? 'bg-[#00d4c8]' : 'bg-[#1e3a5f]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isRecurring ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <label className="text-sm text-gray-200 flex items-center gap-1.5 cursor-pointer font-medium" onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))}>
                  <Repeat size={14} className="text-purple-400" /> Recurring
                </label>
              </div>
              {form.isRecurring && (
                <div className="space-y-3 pt-1">
                  <div className="flex gap-1.5">
                    {DAYS_OF_WEEK.map(day => (
                      <button key={day} onClick={() => toggleDay(day)}
                        className={`w-9 h-9 rounded-full text-xs font-semibold transition-all ${form.recurringDays.includes(day) ? 'bg-[#00d4c8] text-[#0a1628]' : 'bg-[#162032] text-[#4a6278] hover:bg-[#1e3a5f]'}`}>
                        {DAY_LABELS[day]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {(['DAILY','WEEKLY','BIWEEKLY','MONTHLY'] as RecurringPattern[]).map(p => (
                      <button key={p} onClick={() => setForm(f => ({ ...f, recurringPattern: p }))}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${form.recurringPattern === p ? 'bg-[#00d4c8] text-[#0a1628] border-[#00d4c8]' : 'border-[#1e3a5f] text-[#8fa3b8] hover:border-[#8fa3b8]'}`}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        {(validationError || apiError) && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-3 py-2 mt-4">
            {validationError || apiError}
          </div>
        )}
        <div className="flex gap-2 pt-5">
          <button
            onClick={handleSubmit}
            disabled={createTask.isPending}
            className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-bold hover:bg-[#00b8ac] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {createTask.isPending ? (
              <><span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin" /> {isMeeting ? 'Creating Meet...' : 'Creating...'}</>
            ) : (
              <>{isMeeting && <Video size={15} />} {isMeeting ? 'Create meeting + Google Meet' : isEvent ? 'Create event' : 'Create task'}</>
            )}
          </button>
          <button onClick={resetAndClose} className="px-4 border border-[#1e3a5f] rounded-xl text-sm text-[#8fa3b8] hover:bg-[#162032] transition-colors">Cancel</button>
        </div>

      </div>
    </Modal>
  );
}
