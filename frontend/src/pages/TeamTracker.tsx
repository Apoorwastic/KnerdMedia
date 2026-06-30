import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { TimeEntry, User } from '../types';

export default function TeamTracker() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{ userId: string; date: Date } | null>(null);
  const [projectFilter, setProjectFilter] = useState('');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const { data: teamEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ['team-entries', format(weekStart, 'yyyy-MM-dd')],
    queryFn: () => api.get('/time-entries/team', {
      params: {
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(addDays(weekStart, 6), 'yyyy-MM-dd')
      }
    }).then(r => r.data),
  });

  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const getHoursForUserDay = (userId: string, date: Date) => {
    const entry = teamEntries.find(e => e.userId === userId && isSameDay(new Date(e.date), date));
    return entry ? entry.tasks.reduce((s, t) => s + t.hours, 0) : 0;
  };

  const getUserWeekTotal = (userId: string) => weekDays.reduce((s, d) => s + getHoursForUserDay(userId, d), 0);

  const getTotalForDay = (date: Date) => users.reduce((s, u) => s + getHoursForUserDay(u.id, date), 0);

  const allWeekTotal = users.reduce((s, u) => s + getUserWeekTotal(u.id), 0);

  const getHeatColor = (hours: number) => {
    if (hours === 0) return '#f3f4f6';
    if (hours <= 2) return '#bbf7d0';
    if (hours <= 4) return '#86efac';
    if (hours <= 6) return '#4ade80';
    if (hours <= 8) return '#22c55e';
    return '#15803d';
  };

  const getTextColor = (hours: number) => hours > 3 ? '#fff' : '#166534';

  // Project breakdown
  const projectHours: Record<string, number> = {};
  teamEntries.forEach(e => {
    e.tasks.forEach(t => {
      const p = t.projectName || '—';
      projectHours[p] = (projectHours[p] || 0) + t.hours;
    });
  });

  const selectedEntry = selectedCell
    ? teamEntries.find(e => e.userId === selectedCell.userId && isSameDay(new Date(e.date), selectedCell.date))
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Team tracker · Weekly</h1>
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={15} /></button>
              <span className="text-sm font-medium">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 4), 'MMM d, yyyy')}</span>
              <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={15} /></button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Hours logged per member per day · darker = more hours · click a cell to see tasks</p>
        </div>
      </div>

      {/* Heat map grid */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-sm font-medium text-gray-500 w-40"></th>
              {weekDays.map(d => (
                <th key={d.toISOString()} className="py-3.5 text-center text-sm font-medium text-gray-500">{format(d, 'EEE')}</th>
              ))}
              <th className="px-5 py-3.5 text-right text-sm font-medium text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(user => {
              const weekTotal = getUserWeekTotal(user.id);
              return (
                <tr key={user.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{user.name}</span>
                    </div>
                  </td>
                  {weekDays.map(d => {
                    const h = getHoursForUserDay(user.id, d);
                    const isSelected = selectedCell?.userId === user.id && isSameDay(d, selectedCell.date);
                    return (
                      <td key={d.toISOString()} className="py-3 text-center px-2">
                        <button
                          onClick={() => setSelectedCell(isSelected ? null : { userId: user.id, date: d })}
                          className={`w-16 h-10 rounded-xl text-sm font-semibold transition-all ${isSelected ? 'ring-2 ring-gray-800' : ''}`}
                          style={{ backgroundColor: getHeatColor(h), color: getTextColor(h) }}
                        >
                          {h > 0 ? h : 0}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 text-right">
                    <span className={`text-sm font-bold ${weekTotal > 0 ? 'text-gray-900' : 'text-red-400'}`}>{weekTotal}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected cell tasks */}
      {selectedEntry && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            {users.find(u => u.id === selectedCell?.userId)?.name} · {selectedCell && format(selectedCell.date, 'EEEE, MMM d')}
          </h3>
          <div className="space-y-2">
            {selectedEntry.tasks.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-700">{t.taskName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{t.projectName}</span>
                  <span className="text-sm font-medium">{t.hours}h</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom panels */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Team capacity</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">Logged this week</span>
                <span className="font-medium">{allWeekTotal} / {users.length * 40} h</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((allWeekTotal / (users.length * 40)) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avg / member</span>
              <span className="font-medium">{users.length ? (allWeekTotal / users.length).toFixed(1) : 0} h</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Hours by project</h3>
          <div className="space-y-2.5">
            {Object.entries(projectHours).slice(0, 5).map(([p, h]) => {
              const maxH = Math.max(...Object.values(projectHours));
              return (
                <div key={p} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24 truncate flex-shrink-0">{p}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-700" style={{ width: `${(h / maxH) * 100}%` }} />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{h}h</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
