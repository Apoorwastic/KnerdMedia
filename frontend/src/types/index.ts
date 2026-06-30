export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
export type Section = 'PERFORMANCE' | 'RETENTION' | 'CREATIVES';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskType = 'TASK' | 'EVENT' | 'MEETING';
export type EventType = 'CLIENT_CALL' | 'INTERNAL' | 'LAUNCH' | 'REMINDER';
export type RecurringPattern = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  clients?: { id: string; name: string }[];
}

export interface ClientSection {
  id: string;
  clientId: string;
  section: Section;
}

export interface ClientMember {
  id: string;
  userId: string;
  sections: string | null; // "PERFORMANCE,RETENTION" or null = all
  user: User;
}

export interface ClientLink {
  id: string;
  clientId: string;
  title: string;
  url: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  description?: string;
  color: string;
  founderName?: string;
  contactPerson?: string;
  industry?: string;
  website?: string;
  createdAt?: string;
  sections: ClientSection[];
  members: ClientMember[];
  links?: ClientLink[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  goal?: string;
  clientId: string;
  section: Section;
  status: TaskStatus;
  priority: Priority;
  type: TaskType;
  time?: string;
  creatorId: string;
  dueDate?: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  recurringDays?: string; // "MON,WED,FRI"
  recurringInterval?: number;
  department?: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; color: string };
  assignees: TaskAssignee[];
  creator: { id: string; name: string };
  comments: TaskComment[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  clientId?: string;
  date: string;
  time?: string;
  reminderBefore?: number;
  client?: { id: string; name: string };
}

export interface TimeEntryTask {
  id: string;
  timeEntryId: string;
  taskName: string;
  projectName?: string;
  hours: number;
  status: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  blockers?: string;
  notes?: string;
  tasks: TimeEntryTask[];
  user?: User;
}

export interface DashboardData {
  ongoing: number;
  inReview: number;
  blocked: number;
  overdue: number;
  done: number;
  todo: number;
  clients: number;
  deptCounts: Record<string, number>;
  upcoming: Task[];
}
