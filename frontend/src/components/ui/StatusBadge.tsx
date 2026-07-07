import { TaskStatus, Priority, EventType } from '../../types';

const statusConfig: Record<string, { label: string; className: string }> = {
  TODO: { label: 'To do', className: 'bg-[#162032] text-[#8fa3b8]' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-blue-900/30 text-blue-400' },
  IN_REVIEW: { label: 'In review', className: 'bg-amber-900/30 text-amber-400' },
  BLOCKED: { label: 'Blocked', className: 'bg-red-900/30 text-red-400' },
  DONE: { label: 'Done', className: 'bg-[#00d4c8]/10 text-[#00d4c8]' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-[#162032] text-[#4a6278]' },
  MEDIUM: { label: 'Medium', className: 'bg-amber-900/20 text-amber-400' },
  HIGH: { label: 'High', className: 'bg-orange-900/20 text-orange-400' },
  URGENT: { label: 'Urgent', className: 'bg-pink-900/20 text-pink-400' },
};

const eventTypeConfig: Record<string, { label: string; className: string }> = {
  CLIENT_CALL: { label: 'Client call', className: 'bg-blue-900/30 text-blue-400' },
  INTERNAL: { label: 'Internal', className: 'bg-purple-900/30 text-purple-400' },
  LAUNCH: { label: 'Launch', className: 'bg-[#00d4c8]/10 text-[#00d4c8]' },
  REMINDER: { label: 'Reminder', className: 'bg-[#162032] text-[#8fa3b8]' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = statusConfig[status] || statusConfig.TODO;
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = priorityConfig[priority] || priorityConfig.MEDIUM;
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

export function EventTypeBadge({ type }: { type: EventType }) {
  const cfg = eventTypeConfig[type] || eventTypeConfig.INTERNAL;
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}
