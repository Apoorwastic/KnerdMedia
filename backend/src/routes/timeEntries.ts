import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { userId, startDate, endDate } = req.query;
  const targetUserId = (req.userRole === 'MEMBER' ? req.userId : userId as string) || req.userId;
  try {
    const where: Record<string, unknown> = { userId: targetUserId };
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }
    const entries = await prisma.timeEntry.findMany({
      where,
      include: { tasks: true },
      orderBy: { date: 'desc' }
    });
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/team', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.userRole === 'MEMBER') return res.status(403).json({ error: 'Access denied' });
  const { startDate, endDate } = req.query;
  try {
    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }
    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        tasks: true,
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { date, tasks, blockers, notes } = req.body;
  try {
    const existing = await prisma.timeEntry.findFirst({
      where: { userId: req.userId, date: new Date(date) }
    });

    if (existing) {
      await prisma.timeEntryTask.deleteMany({ where: { timeEntryId: existing.id } });
      const entry = await prisma.timeEntry.update({
        where: { id: existing.id },
        data: {
          blockers, notes,
          tasks: { create: tasks.map((t: { taskName: string; projectName: string; hours: number; status: string }) => ({
            taskName: t.taskName, projectName: t.projectName, hours: t.hours, status: t.status
          })) }
        },
        include: { tasks: true }
      });
      return res.json(entry);
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId: req.userId!, date: new Date(date), blockers, notes,
        tasks: { create: tasks.map((t: { taskName: string; projectName: string; hours: number; status: string }) => ({
          taskName: t.taskName, projectName: t.projectName, hours: t.hours, status: t.status
        })) }
      },
      include: { tasks: true }
    });
    res.status(201).json(entry);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
