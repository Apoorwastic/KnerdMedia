import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Bell, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { Event, EventType, Client } from '../types';
import { EventTypeBadge } from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { useAuthStore } from '../stores/authStore';

const reminderOptions = [
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export default function Operations() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'CLIENT_CALL' as EventType, clientId: '', date: '', time: '', reminderBefore: 30 });

  const { data: events = [] } = useQuery<Event[]>({ queryKey: ['events'], queryFn: () => api.get('/events').then(r => r.data) });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ['clients'], queryFn: () => api.get('/clients').then(r => r.data) });

  const [eventError, setEventError] = useState<string | null>(null);

  const createEvent = useMutation({
    mutationFn: () => api.post('/events', {
      ...form,
      clientId: form.clientId || undefined,
      time: form.time || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      setAddOpen(false);
      setEventError(null);
      setForm({ title: '', description: '', type: 'CLIENT_CALL', clientId: '', date: '', time: '', reminderBefore: 30 });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setEventError(msg || 'Something went wrong. Please try again.');
    },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] })
  });

  const canManage = user?.role !== 'MEMBER';

  const thisWeek = events.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    const weekAhead = new Date(); weekAhead.setDate(now.getDate() + 7);
    return d >= now && d <= weekAhead;
  });

  const clientCalls = events.filter(e => e.type === 'CLIENT_CALL').length;
  const launches = events.filter(e => e.type === 'LAUNCH').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations</h1>
          <p className="text-sm text-[#8fa3b8] mt-0.5">Events, meetings, launches and reminders</p>
        </div>
        {canManage && (
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 bg-[#00d4c8] text-[#0a1628] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#00b8ac]">
            <Plus size={15} /> Add event
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total events', value: events.length, color: 'text-white' },
          { label: 'This week', value: thisWeek.length, color: 'text-blue-400' },
          { label: 'Client calls', value: clientCalls, color: 'text-white' },
          { label: 'Launches', value: launches, color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-4">
            <p className="text-sm text-[#8fa3b8]">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Events list */}
      <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[#1e3a5f]">
          {events.map((event) => (
            <div key={event.id} className="px-5 py-4 hover:bg-[#162032] transition-colors group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-center">
                  <div className="w-12 bg-[#162032] rounded-xl px-2 py-2 text-center">
                    <p className="text-xs text-[#8fa3b8] uppercase font-medium">{format(new Date(event.date), 'MMM')}</p>
                    <p className="text-xl font-bold text-white leading-tight">{format(new Date(event.date), 'd')}</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{event.title}</p>
                      {event.description && <p className="text-sm text-[#8fa3b8] mt-0.5">{event.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <EventTypeBadge type={event.type} />
                      {event.client && <span className="text-xs px-2 py-1 bg-[#162032] rounded-full text-gray-300">{event.client.name}</span>}
                      {canManage && (
                        <button onClick={() => deleteEvent.mutate(event.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/20 rounded-lg text-red-400 transition-all">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#4a6278]">
                    {event.time && <span className="flex items-center gap-1">⏰ {event.time}</span>}
                    {event.reminderBefore && <span className="flex items-center gap-1"><Bell size={11} /> {reminderOptions.find(r => r.value === event.reminderBefore)?.label || `${event.reminderBefore} min before`}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && <div className="px-5 py-12 text-center text-sm text-[#4a6278]">No events scheduled</div>}
        </div>
      </div>

      {/* Add event modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEventError(null); }} title="Add event" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Title *</label>
            <input className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-lg px-3 py-2 text-sm" placeholder="Event title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Description</label>
            <textarea className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Type</label>
              <select className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}>
                <option value="CLIENT_CALL">Client call</option>
                <option value="INTERNAL">Internal</option>
                <option value="LAUNCH">Launch</option>
                <option value="REMINDER">Reminder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Client (optional)</label>
              <select className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-3 py-2 text-sm" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Date *</label>
              <input type="date" className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-3 py-2 text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Time</label>
              <input type="time" className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-3 py-2 text-sm" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Reminder</label>
            <select className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-3 py-2 text-sm" value={form.reminderBefore} onChange={e => setForm(f => ({ ...f, reminderBefore: Number(e.target.value) }))}>
              {reminderOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {eventError && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              {eventError}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => { setEventError(null); createEvent.mutate(); }} disabled={!form.title || !form.date || createEvent.isPending} className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-lg py-2.5 text-sm font-medium hover:bg-[#00b8ac] disabled:opacity-50">
              {createEvent.isPending ? 'Creating...' : 'Create event'}
            </button>
            <button onClick={() => setAddOpen(false)} className="px-4 border border-[#1e3a5f] rounded-lg text-sm text-gray-200 hover:bg-[#162032]">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
