import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: { client: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' }
    });
    res.json(events);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, description, type, clientId, date, time, reminderBefore } = req.body;
  try {
    const event = await prisma.event.create({
      data: { title, description, type, clientId, date: new Date(date), time, reminderBefore },
      include: { client: { select: { id: true, name: true } } }
    });
    res.status(201).json(event);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, description, type, clientId, date, time, reminderBefore } = req.body;
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { title, description, type, clientId, date: new Date(date), time, reminderBefore },
      include: { client: { select: { id: true, name: true } } }
    });
    res.json(event);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
