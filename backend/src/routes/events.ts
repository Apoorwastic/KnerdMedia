import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { createCalendarEvent, deleteCalendarEvent } from '../services/googleCalendar';
import { format } from 'date-fns';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: { client: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' }
    });
    res.json(events);
  } catch {
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

    // Add to Google Calendar (creator is the only attendee for operations events)
    try {
      const creator = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
      const { calendarEventId } = await createCalendarEvent({
        eventId: event.id,
        title: event.title,
        description: event.description || undefined,
        date: format(new Date(date), 'yyyy-MM-dd'),
        time: time || undefined,
        duration: 60,
        attendeeEmails: creator?.email ? [creator.email] : [],
      });
      if (calendarEventId) {
        const updated = await prisma.event.update({
          where: { id: event.id },
          data: { calendarEventId },
          include: { client: { select: { id: true, name: true } } },
        });
        return res.status(201).json(updated);
      }
    } catch (calErr) {
      console.error('[Google Calendar] failed for operations event:', calErr);
    }

    res.status(201).json(event);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, description, type, clientId, date, time, reminderBefore } = req.body;
  try {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (existing?.calendarEventId) await deleteCalendarEvent(existing.calendarEventId);

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { title, description, type, clientId, date: new Date(date), time, reminderBefore, calendarEventId: null },
      include: { client: { select: { id: true, name: true } } }
    });

    try {
      const creator = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
      const { calendarEventId } = await createCalendarEvent({
        eventId: event.id,
        title: event.title,
        description: event.description || undefined,
        date: format(new Date(date), 'yyyy-MM-dd'),
        time: time || undefined,
        duration: 60,
        attendeeEmails: creator?.email ? [creator.email] : [],
      });
      if (calendarEventId) {
        const updated = await prisma.event.update({
          where: { id: event.id },
          data: { calendarEventId },
          include: { client: { select: { id: true, name: true } } },
        });
        return res.json(updated);
      }
    } catch (calErr) {
      console.error('[Google Calendar] failed for operations event:', calErr);
    }

    res.json(event);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (event?.calendarEventId) await deleteCalendarEvent(event.calendarEventId);
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
