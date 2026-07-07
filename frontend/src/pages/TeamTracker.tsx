import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { TimeEntry, User } from '../types';

export default function TeamTracker() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{ userId: string; date: Date } | null>(null);

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
    if (hours === 0) return '#162032';
    if (hours <= 2) return '#0d3a28';
    if (hours <= 4) return '#0a4a32';
    if (hours <= 6) return '#086040';
    if (hours <= 8) return '#00d4c8';
    return '#00b8ac';
  };

  const getTextColor = (hours: number) => hours === 0 ? '#4a6278' : hours > 4 ? '#0a1628' : '#fff';

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
            <h1 className="text-xl font-bold text-white">Team tracker · Weekly</h1>
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="p-1.5 hover:bg-[#162032] rounded-lg text-[#8fa3b8]"><ChevronLeft size={15} /></button>
              <span className="text-sm font-medium text-white">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 4), 'MMM d, yyyy')}</span>
              <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="p-1.5 hover:bg-[#162032] rounded-lg text-[#8fa3b8]"><ChevronRight size={15} /></button>
            </div>
          </div>
          <p className="text-xs text-[#4a6278] mt-0.5">Hours logged per member per day · darker = more hours · click a cell to see tasks</p>
        </div>
      </div>

      {/* Heat map grid */}
      <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e3a5f]">
              <th className="px-5 py-3.5 text-left text-sm font-medium text-[#8fa3b8] w-40"></th>
              {weekDays.map(d => (
                <th key={d.toISOString()} className="py-3.5 text-center text-sm font-medium text-[#8fa3b8]">{format(d, 'EEE')}</th>
              ))}
              <th className="px-5 py-3.5 text-right text-sm font-medium text-[#8fa3b8]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e3a5f]">
            {users.map(user => {
              const weekTotal = getUserWeekTotal(user.id);
              return (
                <tr key={user.id} className="hover:bg-[#162032]/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#162032] border border-[#1e3a5f] flex items-center justify-center text-xs font-semibold text-[#00d4c8]">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-gray-200">{user.name}</span>
                    </div>
                  </td>
                  {weekDays.map(d => {
                    const h = getHoursForUserDay(user.id, d);
                    const isSelected = selectedCell?.userId === user.id && isSameDay(d, selectedCell.date);
                    return (
                      <td key={d.toISOString()} className="py-3 text-center px-2">
                        <button
                          onClick={() => setSelectedCell(isSelected ? null : { userId: user.id, date: d })}
                          className={`w-16 h-10 rounded-xl text-sm font-semibold transition-all ${isSelected ? 'ring-2 ring-[#00d4c8]' : ''}`}
                          style={{ backgroundColor: getHeatColor(h), color: getTextColor(h) }}
                        >
                          {h > 0 ? h : '—'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 text-right">
                    <span className={`text-sm font-bold ${weekTotal > 0 ? 'text-white' : 'text-red-400'}`}>{weekTotal}</span>
                  </td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr className="border-t border-[#1e3a5f] bg-[#162032]/30">
              <td className="px-5 py-3 text-xs font-medium text-[#4a6278]">Daily total</td>
              {weekDays.map(d => (
                <td key={d.toISOString()} className="py-3 text-center text-xs font-medium text-[#8fa3b8]">{getTotalForDay(d)}</td>
              ))}
              <td className="px-5 py-3 text-right text-xs font-bold text-[#00d4c8]">{allWeekTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Selected cell tasks */}
      {selectedEntry && (
        <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-3">
            {users.find(u => u.id === selectedCell?.userId)?.name} · {selectedCell && format(selectedCell.date, 'EEEE, MMM d')}
          </h3>
          <div className="space-y-2">
            {selectedEntry.tasks.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-[#1e3a5f]">
                <span className="text-sm text-gray-200">{t.taskName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 bg-[#162032] rounded-full text-[#8fa3b8]">{t.projectName}</span>
                  <span className="text-sm font-medium text-white">{t.hours}h</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'Done' ? 'bg-[#00d4c8]/10 text-[#00d4c8]' : 'bg-amber-900/30 text-amber-400'}`}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom panels */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-4">Team capacity</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-[#8fa3b8]">Logged this week</span>
                <span className="font-medium text-white">{allWeekTotal} / {users.length * 40} h</span>
              </div>
              <div className="h-2.5 bg-[#162032] rounded-full overflow-hidden">
                <div className="h-full bg-[#00d4c8] rounded-full" style={{ width: `${Math.min((allWeekTotal / (users.length * 40)) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#4a6278]">Avg / member</span>
              <span className="font-medium text-white">{users.length ? (allWeekTotal / users.length).toFixed(1) : 0} h</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-4">Hours by project</h3>
          <div className="space-y-2.5">
            {Object.entries(projectHours).slice(0, 5).map(([p, h]) => {
              const maxH = Math.max(...Object.values(projectHours));
              return (
                <div key={p} className="flex items-center gap-3">
                  <span className="text-sm text-[#8fa3b8] w-24 truncate flex-shrink-0">{p}</span>
                  <div className="flex-1 h-5 bg-[#162032] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#00d4c8]" style={{ width: `${(h / maxH) * 100}%` }} />
                  </div>
                  <span className="text-sm text-[#8fa3b8] w-8 text-right">{h}h</span>
                </div>
              );
            })}
            {Object.keys(projectHours).length === 0 && <p className="text-sm text-[#4a6278]">No data this week</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
