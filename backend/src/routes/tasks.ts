import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createMeetEvent, deleteMeetEvent } from '../services/googleCalendar';
import { format } from 'date-fns';

const router = Router();

const taskInclude = {
  client: { select: { id: true, name: true, color: true } },
  creator: { select: { id: true, name: true } },
  assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
  comments: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const }
  }
};

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { clientId, section, status, type } = req.query;
  try {
    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId as string;
    if (section) where.section = (section as string).toUpperCase();
    if (status) where.status = status as string;
    if (type) where.type = (type as string).toUpperCase();

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role === 'MEMBER') {
      const memberClients = await prisma.clientMember.findMany({ where: { userId: req.userId } });
      where.clientId = { in: memberClients.map(m => m.clientId) };
    }

    const tasks = await prisma.task.findMany({
      where, include: taskInclude, orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/my-assigned', authenticate, async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  try {
    const where: Record<string, unknown> = {
      assignees: { some: { userId: req.userId } },
      type: { in: ['EVENT', 'MEETING'] }
    };
    if (startDate && endDate) {
      where.dueDate = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }
    const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: { dueDate: 'asc' } });
    res.json(tasks);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    let clientFilter: Record<string, unknown> = {};
    if (user?.role === 'MEMBER') {
      const memberClients = await prisma.clientMember.findMany({ where: { userId: req.userId } });
      clientFilter = { clientId: { in: memberClients.map(m => m.clientId) } };
    }

    const [ongoing, inReview, blocked, overdue, done, todo, allTasks, clients] = await Promise.all([
      prisma.task.count({ where: { ...clientFilter, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { ...clientFilter, status: 'IN_REVIEW' } }),
      prisma.task.count({ where: { ...clientFilter, status: 'BLOCKED' } }),
      prisma.task.count({ where: { ...clientFilter, status: { notIn: ['DONE'] }, dueDate: { lt: new Date() } } }),
      prisma.task.count({ where: { ...clientFilter, status: 'DONE' } }),
      prisma.task.count({ where: { ...clientFilter, status: 'TODO' } }),
      prisma.task.findMany({ where: clientFilter, select: { department: true } }),
      user?.role === 'MEMBER'
        ? prisma.client.count({ where: { members: { some: { userId: req.userId } } } })
        : prisma.client.count()
    ]);

    const deptCounts: Record<string, number> = {};
    allTasks.forEach(t => {
      if (t.department) deptCounts[t.department] = (deptCounts[t.department] || 0) + 1;
    });

    const upcoming = await prisma.task.findMany({
      where: { ...clientFilter, status: { not: 'DONE' }, dueDate: { gte: new Date() } },
      include: { client: { select: { id: true, name: true } }, assignees: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    res.json({ ongoing, inReview, blocked, overdue, done, todo, clients, deptCounts, upcoming });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const {
    title, description, goal, clientId, section, status, priority, type, time,
    assigneeIds, externalEmails, dueDate, isRecurring, recurringPattern,
    recurringDays, recurringInterval, department, duration
  } = req.body;

  try {
    const taskType = (type || 'TASK').toUpperCase();

    const task = await prisma.task.create({
      data: {
        title, description, goal, clientId,
        section: section.toUpperCase(),
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        type: taskType,
        time,
        duration: duration ? Number(duration) : undefined,
        externalEmails: externalEmails || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        isRecurring: isRecurring || false,
        recurringPattern, recurringDays, recurringInterval, department,
        creatorId: req.userId!,
        assignees: assigneeIds?.length
          ? { create: (assigneeIds as string[]).map((id: string) => ({ userId: id })) }
          : undefined
      },
      include: taskInclude
    });

    // Auto-create Google Meet for MEETING type
    if (taskType === 'MEETING' && dueDate) {
      try {
        const internalEmails = task.assignees.map((a) => a.user.email).filter(Boolean);
        const extEmails = externalEmails
          ? (externalEmails as string).split(',').map((e: string) => e.trim()).filter(Boolean)
          : [];
        const allEmails = [...new Set([...internalEmails, ...extEmails])];

        const { meetLink, calendarEventId } = await createMeetEvent({
          taskId: task.id,
          title: task.title,
          description: task.description || undefined,
          date: format(new Date(dueDate), 'yyyy-MM-dd'),
          time: task.time || undefined,
          duration: duration ? Number(duration) : 60,
          attendeeEmails: allEmails,
        });

        if (meetLink) {
          const updated = await prisma.task.update({
            where: { id: task.id },
            data: { meetLink, calendarEventId },
            include: taskInclude,
          });
          return res.status(201).json(updated);
        }
      } catch (meetErr) {
        console.error('[Google Meet] failed to create event:', meetErr);
        // Still return the task even if Meet creation fails
      }
    }

    res.status(201).json(task);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const {
    title, description, goal, status, priority, type, time,
    assigneeIds, externalEmails, dueDate, isRecurring, recurringPattern,
    recurringDays, recurringInterval, department, duration
  } = req.body;

  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (assigneeIds !== undefined) {
      await prisma.taskAssignee.deleteMany({ where: { taskId: req.params.id } });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title, description, goal, status, priority, department,
        type: type ? type.toUpperCase() : undefined,
        time,
        duration: duration !== undefined ? Number(duration) : undefined,
        externalEmails: externalEmails !== undefined ? externalEmails : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        isRecurring, recurringPattern, recurringDays, recurringInterval,
        assignees: assigneeIds !== undefined
          ? { create: (assigneeIds as string[]).map((id: string) => ({ userId: id })) }
          : undefined
      },
      include: taskInclude
    });

    // Regenerate Meet link if it's a MEETING and date/time/attendees changed
    const isMeeting = (task.type || existing?.type) === 'MEETING';
    const dateChanged = dueDate && dueDate !== existing?.dueDate?.toISOString().split('T')[0];
    const timeChanged = time !== undefined && time !== existing?.time;
    const attendeesChanged = assigneeIds !== undefined || externalEmails !== undefined;

    if (isMeeting && task.dueDate && (dateChanged || timeChanged || attendeesChanged || !task.meetLink)) {
      try {
        // Delete old calendar event if exists
        if (existing?.calendarEventId) {
          await deleteMeetEvent(existing.calendarEventId);
        }

        const internalEmails = task.assignees.map((a) => a.user.email).filter(Boolean);
        const extRaw = task.externalEmails || externalEmails || '';
        const extEmails = extRaw ? extRaw.split(',').map((e: string) => e.trim()).filter(Boolean) : [];
        const allEmails = [...new Set([...internalEmails, ...extEmails])];

        const { meetLink, calendarEventId } = await createMeetEvent({
          taskId: task.id,
          title: task.title,
          description: task.description || undefined,
          date: format(new Date(task.dueDate), 'yyyy-MM-dd'),
          time: task.time || undefined,
          duration: task.duration || 60,
          attendeeEmails: allEmails,
        });

        if (meetLink) {
          const updated = await prisma.task.update({
            where: { id: task.id },
            data: { meetLink, calendarEventId },
            include: taskInclude,
          });
          return res.json(updated);
        }
      } catch (meetErr) {
        console.error('[Google Meet] failed to update event:', meetErr);
      }
    }

    res.json(task);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.userRole === 'MEMBER') return res.status(403).json({ error: 'Members cannot delete tasks' });
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (task?.calendarEventId) {
      await deleteMeetEvent(task.calendarEventId);
    }
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  try {
    const comment = await prisma.taskComment.create({
      data: { taskId: req.params.id, userId: req.userId!, content },
      include: { user: { select: { id: true, name: true } } }
    });
    res.status(201).json(comment);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
