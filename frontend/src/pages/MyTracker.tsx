import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays, subDays, addWeeks, subWeeks, startOfMonth, endOfMonth, isSameDay, isSameMonth, addMonths, subMonths, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Download, CalendarDays, Users, Video, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import { TimeEntry, Task, Client } from '../types';
import { useAuthStore } from '../stores/authStore';

type View = 'Daily' | 'Weekly' | 'Calendar';

const STATUS_OPTIONS = ['In prog', 'Done', 'Blocked'];

const EVENT_COLORS: Record<string, string> = {
  EVENT:   'bg-blue-900/20 text-blue-300 border-blue-700/40',
  MEETING: 'bg-purple-900/20 text-purple-300 border-purple-700/40',
};

export default function MyTracker() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [view, setView] = useState<View>('Daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [taskRows, setTaskRows] = useState<{ taskName: string; projectName: string; hours: number; status: string }[]>([{ taskName: '', projectName: '', hours: 0, status: 'In prog' }]);
  const [blockers, setBlockers] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: entries = [] } = useQuery<TimeEntry[]>({
    queryKey: ['time-entries', user?.id],
    queryFn: () => api.get('/time-entries', { params: { startDate: '2026-01-01', endDate: '2027-01-01' } }).then(r => r.data),
  });

  const { data: accounts = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then(r => r.data),
  });
  const accountOptions = accounts.map(c => c.name);

  // Events & meetings assigned to the current user
  const assignedStart = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
  const assignedEnd   = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');
  const { data: assignedTasks = [] } = useQuery<Task[]>({
    queryKey: ['my-assigned', assignedStart, assignedEnd],
    queryFn: () => api.get('/tasks/my-assigned', { params: { startDate: assignedStart, endDate: assignedEnd } }).then(r => r.data),
  });

  const getEventsForDate = (d: Date) =>
    assignedTasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), d));

  const saveEntry = useMutation({
    mutationFn: () => api.post('/time-entries', {
      date: format(currentDate, 'yyyy-MM-dd'),
      tasks: taskRows.filter(t => t.taskName.trim()),
      blockers, notes
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] })
  });

  const getEntryForDate = (d: Date) => entries.find(e => isSameDay(new Date(e.date), d));

  const dailyEntry = getEntryForDate(currentDate);
  const totalHours = (dailyEntry?.tasks || []).reduce((s, t) => s + t.hours, 0);

  // Weekly
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4);
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const weekTotal = weekDays.reduce((s, d) => {
    const e = getEntryForDate(d);
    return s + (e?.tasks || []).reduce((ss, t) => ss + t.hours, 0);
  }, 0);

  // Calendar
  const calStart = startOfMonth(currentMonth);
  const calEnd = endOfMonth(currentMonth);
  const calDays = eachDayOfInterval({ start: startOfWeek(calStart, { weekStartsOn: 0 }), end: endOfWeek(calEnd, { weekStartsOn: 0 }) });
  const calTotal = entries.filter(e => isSameMonth(new Date(e.date), currentMonth)).reduce((s, e) => s + e.tasks.reduce((ss, t) => ss + t.hours, 0), 0);
  const activeDays = entries.filter(e => isSameMonth(new Date(e.date), currentMonth) && e.tasks.length > 0).length;

  const getHeatColor = (hours: number) => {
    if (hours === 0) return '#162032';
    if (hours <= 2) return '#064e3b';
    if (hours <= 4) return '#065f46';
    if (hours <= 6) return '#047857';
    if (hours <= 8) return '#059669';
    return '#10b981';
  };

  const loadEntry = (entry: TimeEntry) => {
    setTaskRows(entry.tasks.map(t => ({ taskName: t.taskName, projectName: t.projectName || '', hours: t.hours, status: t.status })));
    setBlockers(entry.blockers || '');
    setNotes(entry.notes || '');
  };

  const handleSave = async () => {
    setSaving(true);
    await saveEntry.mutateAsync();
    setSaving(false);
  };

  const exportToExcel = () => {
    const rows: Record<string, string | number>[] = [];
    [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(entry => {
        const dateStr = format(new Date(entry.date), 'dd MMM yyyy');
        if (entry.tasks.length === 0) {
          rows.push({ Date: dateStr, Task: '', Project: '', Hours: 0, Status: '', Blockers: entry.blockers || '', Notes: entry.notes || '' });
        } else {
          entry.tasks.forEach((t, i) => {
            rows.push({
              Date: i === 0 ? dateStr : '',
              Task: t.taskName,
              Project: t.projectName || '',
              Hours: t.hours,
              Status: t.status,
              Blockers: i === 0 ? (entry.blockers || '') : '',
              Notes: i === 0 ? (entry.notes || '') : '',
            });
          });
        }
      });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 40 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'My Tracker');
    XLSX.writeFile(wb, `tracker-${user?.name?.replace(/\s+/g, '-').toLowerCase() ?? 'export'}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex bg-[#0d1f38] border border-[#1e3a5f] rounded-xl p-1 gap-1">
          {(['Weekly', 'Daily', 'Calendar'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-[#00d4c8] text-[#0a1628]' : 'text-gray-300 hover:bg-[#162032]'}`}>{v}</button>
          ))}
        </div>
        <button
          onClick={exportToExcel}
          disabled={entries.length === 0}
          className="flex items-center gap-2 border border-[#1e3a5f] bg-[#0d1f38] text-gray-200 px-4 py-2 rounded-xl text-sm hover:bg-[#162032] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={14} /> Export Excel
        </button>
      </div>

      {/* DAILY VIEW */}
      {view === 'Daily' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentDate(d => subDays(d, 1))} className="p-1.5 hover:bg-[#162032] rounded-lg text-gray-300"><ChevronLeft size={16} /></button>
              <h2 className="text-xl font-bold text-white">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
              <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="p-1.5 hover:bg-[#162032] rounded-lg text-gray-300"><ChevronRight size={16} /></button>
            </div>
            <span className="text-sm text-[#8fa3b8]">Total: {totalHours} hrs</span>
          </div>

          {/* Task table */}
          <div className="bg-[#0d1f38] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e3a5f]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#4a6278] w-10"><input type="checkbox" className="rounded" /></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a6278]">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a6278]">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a6278]">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a6278]">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {taskRows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><input type="checkbox" className="rounded" /></td>
                    <td className="px-4 py-2">
                      <input className="w-full text-sm border-0 focus:ring-0 bg-transparent text-white placeholder:text-[#4a6278]" placeholder="Task description" value={row.taskName} onChange={e => setTaskRows(rows => rows.map((r, j) => j === i ? { ...r, taskName: e.target.value } : r))} />
                    </td>
                    <td className="px-4 py-2">
                      <select className="text-sm border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-2 py-1.5" value={row.projectName} onChange={e => setTaskRows(rows => rows.map((r, j) => j === i ? { ...r, projectName: e.target.value } : r))}>
                        <option value="">Select account</option>
                        {accountOptions.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" max="24" step="0.5" className="w-16 text-sm border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-2 py-1.5 text-center" value={row.hours} onChange={e => setTaskRows(rows => rows.map((r, j) => j === i ? { ...r, hours: Number(e.target.value) } : r))} />
                    </td>
                    <td className="px-4 py-2">
                      <select className="text-sm border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-2 py-1.5" value={row.status} onChange={e => setTaskRows(rows => rows.map((r, j) => j === i ? { ...r, status: e.target.value } : r))}>
                        {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      {taskRows.length > 1 && <button onClick={() => setTaskRows(rows => rows.filter((_, j) => j !== i))} className="p-1 hover:bg-red-900/20 rounded text-red-400"><Trash2 size={13} /></button>}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={6} className="px-5 py-3">
                    <button onClick={() => setTaskRows(rows => [...rows, { taskName: '', projectName: '', hours: 0, status: 'In prog' }])} className="flex items-center gap-2 text-sm text-[#4a6278] hover:text-gray-300">
                      <input type="checkbox" className="rounded opacity-40" readOnly /> Add task
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Today's events & meetings */}
          {getEventsForDate(currentDate).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Events &amp; meetings today</h3>
              <div className="space-y-2">
                {getEventsForDate(currentDate).map(ev => (
                  <div key={ev.id} className={`flex items-start gap-3 p-3 rounded-xl border ${EVENT_COLORS[ev.type] || EVENT_COLORS.EVENT}`}>
                    <span className="text-base flex-shrink-0">{ev.type === 'MEETING' ? '📹' : '📅'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs opacity-70 mt-0.5">
                        {ev.time ? ev.time.slice(0, 5) : ''}
                        {ev.duration ? ` · ${ev.duration >= 60 ? `${ev.duration / 60}h` : `${ev.duration}m`}` : ''}
                        {ev.client?.name ? ` · ${ev.client.name}` : ''}
                        {ev.assignees?.length > 1 ? ` · ${ev.assignees.length} attendees` : ''}
                      </p>
                    </div>
                    {ev.type === 'MEETING' && ev.meetLink ? (
                      <a href={ev.meetLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 rounded-lg text-xs text-purple-300 font-medium transition-colors flex-shrink-0"
                        onClick={e => e.stopPropagation()}>
                        <Video size={12} /> Join
                      </a>
                    ) : ev.type === 'MEETING' ? (
                      <Users size={13} className="flex-shrink-0 mt-0.5 opacity-60" />
                    ) : (
                      <CalendarDays size={13} className="flex-shrink-0 mt-0.5 opacity-60" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockers */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Blockers</h3>
            <textarea className="w-full bg-red-900/10 border border-red-900/30 rounded-2xl px-4 py-3 text-sm resize-none focus:ring-1 focus:ring-[#00d4c8] text-white placeholder:text-[#4a6278]" rows={3} placeholder="Any blockers or impediments today?" value={blockers} onChange={e => setBlockers(e.target.value)} />
          </div>

          {/* Week at a glance */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">This week at a glance</h3>
            <div className="flex gap-2">
              {weekDays.map(d => {
                const e = getEntryForDate(d);
                const h = (e?.tasks || []).reduce((s, t) => s + t.hours, 0);
                const isToday = isSameDay(d, new Date());
                const isCurrent = isSameDay(d, currentDate);
                return (
                  <button key={d.toISOString()} onClick={() => { setCurrentDate(d); if (e) loadEntry(e); else { setTaskRows([{ taskName: '', projectName: '', hours: 0, status: 'In prog' }]); setBlockers(''); setNotes(''); }}} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full h-20 rounded-xl transition-all" style={{ backgroundColor: isCurrent ? '#00d4c8' : getHeatColor(h) }} />
                    <span className={`text-xs font-medium ${isToday ? 'text-[#00d4c8]' : isCurrent ? 'text-[#00b8ac]' : 'text-[#4a6278]'}`}>{format(d, 'EEE').slice(0,3)}</span>
                  </button>
                );
              })}
              <button className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full h-20 rounded-xl bg-[#162032]" />
                <span className="text-xs text-[#4a6278]">Fri</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Notes</h3>
            <textarea className="w-full bg-[#162032] border border-[#1e3a5f] rounded-2xl px-4 py-3 text-sm resize-none text-white placeholder:text-[#4a6278]" rows={3} placeholder="Any notes for today..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-medium hover:bg-[#00b8ac] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save entry'}
            </button>
            {dailyEntry && <button onClick={() => loadEntry(dailyEntry)} className="px-4 border border-[#1e3a5f] rounded-xl text-sm text-gray-200 hover:bg-[#162032]">Load saved</button>}
          </div>
        </div>
      )}

      {/* WEEKLY VIEW */}
      {view === 'Weekly' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="p-1.5 hover:bg-[#162032] rounded-lg text-gray-300"><ChevronLeft size={16} /></button>
              <h2 className="text-xl font-bold text-white">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</h2>
              <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="p-1.5 hover:bg-[#162032] rounded-lg text-gray-300"><ChevronRight size={16} /></button>
            </div>
            <span className="text-sm text-[#8fa3b8]">Total: {weekTotal} hrs / 40 expected</span>
          </div>

          {/* Day cards */}
          <div className="grid grid-cols-5 gap-3">
            {weekDays.map(d => {
              const e = getEntryForDate(d);
              const h = (e?.tasks || []).reduce((s, t) => s + t.hours, 0);
              const isToday = isSameDay(d, new Date());
              const summary = [...new Set(e?.tasks?.map(t => t.projectName?.split(' ')[0]).filter(Boolean) || [])].slice(0, 3).join(', ');
              return (
                <button key={d.toISOString()} onClick={() => { setView('Daily'); setCurrentDate(d); if (e) loadEntry(e); }} className={`bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-4 text-left transition-all hover:bg-[#162032] ${isToday ? 'ring-2 ring-[#00d4c8]' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${isToday ? 'text-[#00d4c8]' : 'text-gray-200'}`}>{format(d, 'EEE')}</span>
                    <span className={`text-sm font-bold ${h > 0 ? 'text-green-400' : 'text-[#4a6278]'}`}>{h}h</span>
                  </div>
                  <p className="text-xs text-[#4a6278] truncate">{summary || 'No entries'}</p>
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0d1f38] rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-white mb-4">Weekly summary</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Hours logged</span>
                    <span className="font-medium text-white">{weekTotal} / 40</span>
                  </div>
                  <div className="h-2 bg-[#162032] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00d4c8] rounded-full" style={{ width: `${Math.min((weekTotal / 40) * 100, 100)}%` }} />
                  </div>
                </div>
                {/* account breakdown */}
                {Object.entries(weekDays.flatMap(d => getEntryForDate(d)?.tasks || []).reduce((acc, t) => {
                  const p = t.projectName || '—';
                  acc[p] = (acc[p] || 0) + t.hours;
                  return acc;
                }, {} as Record<string, number>)).map(([p, h]) => (
                  <div key={p} className="flex justify-between text-sm">
                    <span className="text-gray-300">{p}</span>
                    <span className="font-medium text-white">{h}h</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#0d1f38] rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-white mb-4">Daily breakdown</h3>
              <div className="space-y-2.5">
                {weekDays.map(d => {
                  const e = getEntryForDate(d);
                  const h = (e?.tasks || []).reduce((s, t) => s + t.hours, 0);
                  const isToday = isSameDay(d, new Date());
                  return (
                    <div key={d.toISOString()} className="flex items-center gap-3">
                      <span className={`text-sm w-8 font-medium ${isToday ? 'text-[#00d4c8]' : 'text-gray-300'}`}>{format(d, 'EEE')}</span>
                      <div className="flex-1 h-5 bg-[#162032] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#00d4c8]" style={{ width: `${Math.min((h / 10) * 100, 100)}%` }} />
                      </div>
                      <span className="text-sm text-gray-300 w-10 text-right">{h}h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {view === 'Calendar' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 hover:bg-[#162032] rounded-lg text-gray-300"><ChevronLeft size={16} /></button>
              <h2 className="text-xl font-bold text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 hover:bg-[#162032] rounded-lg text-gray-300"><ChevronRight size={16} /></button>
            </div>
            <span className="text-sm text-[#8fa3b8]">{calTotal} hrs logged · {activeDays} active days</span>
          </div>

          <div className="bg-[#0d1f38] rounded-2xl shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[#1e3a5f]">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="py-3 text-center text-xs font-medium text-[#4a6278]">{d}</div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calDays.map((d, i) => {
                const e = getEntryForDate(d);
                const h = (e?.tasks || []).reduce((s, t) => s + t.hours, 0);
                const inMonth = isSameMonth(d, currentMonth);
                const isToday = isSameDay(d, new Date());
                const dayEvents = getEventsForDate(d);
                return (
                  <button key={i} onClick={() => { if (inMonth) { setView('Daily'); setCurrentDate(d); if (e) loadEntry(e); } }} className={`min-h-[90px] p-2 border-b border-r border-[#1e3a5f] text-left transition-colors hover:bg-[#162032] ${!inMonth ? 'opacity-30' : ''}`}>
                    <div className={`w-7 h-7 flex items-center justify-center text-sm font-medium rounded-full mb-1 ${isToday ? 'bg-[#00d4c8] text-[#0a1628]' : 'text-gray-200'}`}>{format(d, 'd')}</div>
                    {h > 0 && inMonth && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full block mb-1" style={{ backgroundColor: getHeatColor(h), color: h > 4 ? '#fff' : '#d1fae5' }}>
                        {h}h · {e?.tasks?.length} {e?.tasks?.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                    {inMonth && dayEvents.slice(0, 2).map(ev => (
                      ev.type === 'MEETING' && ev.meetLink ? (
                        <a key={ev.id} href={ev.meetLink} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 truncate border mb-0.5 ${EVENT_COLORS[ev.type]} hover:opacity-80 transition-opacity`}>
                          <Video size={9} className="flex-shrink-0" />
                          <span className="truncate">{ev.time ? ev.time.slice(0,5) + ' ' : ''}{ev.title}</span>
                        </a>
                      ) : (
                        <span key={ev.id} className={`text-xs px-1.5 py-0.5 rounded-full block truncate border mb-0.5 ${EVENT_COLORS[ev.type] || EVENT_COLORS.EVENT}`}>
                          {ev.time ? ev.time.slice(0, 5) + ' ' : ''}{ev.title}
                        </span>
                      )
                    ))}
                    {inMonth && dayEvents.length > 2 && (
                      <span className="text-xs text-[#4a6278]">+{dayEvents.length - 2} more</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Hours logged', value: Math.round(calTotal) },
              { label: 'Active days', value: activeDays },
              { label: 'Total tasks', value: entries.filter(e => isSameMonth(new Date(e.date), currentMonth)).flatMap(e => e.tasks).length },
              { label: 'Completed', value: entries.filter(e => isSameMonth(new Date(e.date), currentMonth)).flatMap(e => e.tasks).filter(t => t.status === 'Done').length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0d1f38] rounded-2xl p-4 shadow-sm">
                <p className="text-sm text-[#8fa3b8]">{label}</p>
                <p className="text-3xl font-bold text-white mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Heat legend */}
          <div className="flex items-center gap-2 text-xs text-[#4a6278]">
            <span>Less</span>
            {[0,2,4,6,8,10].map(h => (
              <div key={h} className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(h) }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
}
