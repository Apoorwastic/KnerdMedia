import { TaskStatus, Priority, EventType } from '../../types';

const statusConfig: Record<string, { label: string; className: string }> = {
  TODO: { label: 'To do', className: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-blue-100 text-blue-700' },
  IN_REVIEW: { label: 'In review', className: 'bg-amber-100 text-amber-800' },
  BLOCKED: { label: 'Blocked', className: 'bg-red-100 text-red-700' },
  DONE: { label: 'Done', className: 'bg-green-100 text-green-700' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-gray-100 text-gray-500' },
  MEDIUM: { label: 'Medium', className: 'bg-amber-50 text-amber-700' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent', className: 'bg-pink-100 text-pink-700' },
};

const eventTypeConfig: Record<string, { label: string; className: string }> = {
  CLIENT_CALL: { label: 'Client call', className: 'bg-blue-100 text-blue-700' },
  INTERNAL: { label: 'Internal', className: 'bg-purple-100 text-purple-700' },
  LAUNCH: { label: 'Launch', className: 'bg-green-100 text-green-700' },
  REMINDER: { label: 'Reminder', className: 'bg-gray-100 text-gray-600' },
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
