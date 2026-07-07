import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Repeat } from 'lucide-react';
import Modal from '../ui/Modal';
import { User, TaskStatus, Priority, RecurringPattern, Section, TaskType, DAYS_OF_WEEK, DayOfWeek } from '../../types';
import api from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  section: Section;
}

const TYPE_OPTIONS: { value: TaskType; label: string; icon: string; desc: string }[] = [
  { value: 'TASK',    label: 'Task',    icon: '✓', desc: 'A work item to complete' },
  { value: 'EVENT',   label: 'Event',   icon: '📅', desc: 'An event or deadline' },
  { value: 'MEETING', label: 'Meeting', icon: '👥', desc: 'A meeting with attendees' },
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'M', TUE: 'T', WED: 'W', THU: 'T', FRI: 'F', SAT: 'S', SUN: 'S'
};

export default function AddTaskModal({ open, onClose, clientId, section }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', goal: '',
    type: 'TASK' as TaskType,
    status: 'TODO' as TaskStatus, priority: 'MEDIUM' as Priority,
    dueDate: '', time: '',
    isRecurring: false, recurringPattern: 'WEEKLY' as RecurringPattern, recurringDays: [] as DayOfWeek[],
    department: section === 'PERFORMANCE' ? 'Performance' : section === 'RETENTION' ? 'Retention' : 'Creatives',
  });
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const createTask = useMutation({
    mutationFn: () => api.post('/tasks', {
      ...form,
      time: form.time || undefined,
      recurringDays: form.recurringDays.join(',') || undefined,
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
      dueDate: '', time: '', isRecurring: false, recurringPattern: 'WEEKLY', recurringDays: [],
      department: form.department,
    });
    setAssigneeIds([]);
    setApiError(null);
    onClose();
  };

  const toggleDay = (day: DayOfWeek) =>
    setForm(f => ({
      ...f,
      recurringDays: f.recurringDays.includes(day)
        ? f.recurringDays.filter(d => d !== day)
        : [...f.recurringDays, day]
    }));

  const toggleAssignee = (id: string) =>
    setAssigneeIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  const isEventOrMeeting = form.type === 'EVENT' || form.type === 'MEETING';
  const assigneeLabel = form.type === 'MEETING' ? 'Attendees' : 'Assign to';

  return (
    <Modal open={open} onClose={resetAndClose} title="Add new task" size="lg">
      <div className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Type</label>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl border-2 text-sm transition-all ${form.type === opt.value ? 'border-[#00d4c8] bg-[#00d4c8]/10' : 'border-[#1e3a5f] hover:border-[#8fa3b8]'}`}>
                <span className="text-base">{opt.icon}</span>
                <span className={`font-medium ${form.type === opt.value ? 'text-[#00d4c8]' : 'text-white'}`}>{opt.label}</span>
                <span className="text-xs text-[#4a6278] hidden sm:block">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            {form.type === 'MEETING' ? 'Meeting title' : form.type === 'EVENT' ? 'Event title' : 'Task title'} *
          </label>
          <input className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none" placeholder={form.type === 'MEETING' ? 'e.g. Q3 planning call' : form.type === 'EVENT' ? 'e.g. Brand launch' : 'Task description'} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>

        {/* Goal (task only) */}
        {form.type === 'TASK' && (
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Goal / Objective</label>
            <textarea className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-3 py-2.5 text-sm resize-none focus:border-[#00d4c8] focus:outline-none" rows={2} placeholder="What's the desired outcome?" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
          </div>
        )}

        {/* Agenda (event/meeting) */}
        {isEventOrMeeting && (
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              {form.type === 'MEETING' ? 'Agenda / Notes' : 'Description'}
            </label>
            <textarea className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-3 py-2.5 text-sm resize-none focus:border-[#00d4c8] focus:outline-none" rows={2} placeholder={form.type === 'MEETING' ? 'Meeting agenda or notes...' : 'Event description...'} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        )}

        {/* Date + Time row (always visible) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">{isEventOrMeeting ? 'Date *' : 'Due date'}</label>
            <input type="date" className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Time <span className="text-[#4a6278] font-normal">(optional)</span></label>
            <input type="time" className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
        </div>

        {/* Status + Priority (task only) */}
        {form.type === 'TASK' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Status</label>
              <select className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
                {(['TODO','IN_PROGRESS','IN_REVIEW','BLOCKED','DONE'] as TaskStatus[]).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Priority</label>
              <select className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                {(['LOW','MEDIUM','HIGH','URGENT'] as Priority[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Assignees / Attendees */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">{assigneeLabel}</label>
          <div className="flex flex-wrap gap-2">
            {users.map(u => {
              const selected = assigneeIds.includes(u.id);
              return (
                <button key={u.id} onClick={() => toggleAssignee(u.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all ${selected ? 'bg-[#00d4c8] text-[#0a1628] border-[#00d4c8]' : 'border-[#1e3a5f] text-gray-300 hover:border-[#8fa3b8]'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${selected ? 'bg-[#0a1628] text-[#00d4c8]' : 'bg-[#1e3a5f] text-gray-300'}`}>{u.name.charAt(0)}</span>
                  {u.name.split(' ')[0]}
                  {selected && <X size={11} />}
                </button>
              );
            })}
          </div>
          {assigneeIds.length > 0 && (
            <p className="text-xs text-[#4a6278] mt-1">{assigneeIds.length} {form.type === 'MEETING' ? 'attendee' : 'assignee'}{assigneeIds.length !== 1 ? 's' : ''} selected</p>
          )}
        </div>

        {/* Recurring toggle */}
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
              {/* Days of week picker */}
              <div>
                <p className="text-xs font-medium text-[#8fa3b8] mb-2">Repeat on</p>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map(day => (
                    <button key={day} onClick={() => toggleDay(day)}
                      className={`w-9 h-9 rounded-full text-xs font-semibold transition-all ${form.recurringDays.includes(day) ? 'bg-[#00d4c8] text-[#0a1628]' : 'bg-[#162032] text-[#8fa3b8] hover:bg-[#1e3a5f]'}`}>
                      {DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
                {form.recurringDays.length > 0 && (
                  <p className="text-xs text-[#4a6278] mt-1.5">Every {form.recurringDays.join(', ')}</p>
                )}
              </div>

              {/* Recurrence pattern */}
              <div>
                <p className="text-xs font-medium text-[#8fa3b8] mb-2">Frequency</p>
                <div className="flex gap-2">
                  {(['DAILY','WEEKLY','BIWEEKLY','MONTHLY'] as RecurringPattern[]).map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, recurringPattern: p }))}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${form.recurringPattern === p ? 'bg-[#00d4c8] text-[#0a1628] border-[#00d4c8]' : 'border-[#1e3a5f] text-gray-300 hover:border-[#8fa3b8]'}`}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        {apiError && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-3 py-2">
            {apiError}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { setApiError(null); createTask.mutate(); }}
            disabled={!form.title.trim() || createTask.isPending}
            className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-medium hover:bg-[#00b8ac] disabled:opacity-50 transition-colors"
          >
            {createTask.isPending ? 'Creating...' : `Create ${form.type.toLowerCase()}`}
          </button>
          <button onClick={resetAndClose} className="px-4 border border-[#1e3a5f] rounded-xl text-sm text-gray-200 hover:bg-[#162032]">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
