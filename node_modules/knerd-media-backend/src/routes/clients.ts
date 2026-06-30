import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const clientInclude = {
  sections: true,
  links: { orderBy: { createdAt: 'asc' as const } },
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    }
  }
};

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const clients = user?.role === 'MEMBER'
      ? await prisma.client.findMany({ where: { members: { some: { userId: req.userId } } }, include: clientInclude })
      : await prisma.client.findMany({ include: clientInclude, orderBy: { createdAt: 'desc' } });
    res.json(clients);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Single client detail (super admin / admin only)
router.get('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: clientInclude
    });
    if (!client) return res.status(404).json({ error: 'Not found' });
    res.json(client);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Returns clients for a section, filtering by member's section-level access
router.get('/section/:section', authenticate, async (req: AuthRequest, res: Response) => {
  const section = req.params.section.toUpperCase();
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (user?.role === 'MEMBER') {
      const allClients = await prisma.client.findMany({
        where: { sections: { some: { section } } },
        include: clientInclude
      });
      const filtered = allClients.filter(c => {
        const membership = c.members.find(m => m.userId === req.userId);
        if (!membership) return false;
        if (!membership.sections) return true;
        return membership.sections.split(',').map(s => s.trim()).includes(section);
      });
      return res.json(filtered);
    }

    const clients = await prisma.client.findMany({
      where: { sections: { some: { section } } },
      include: clientInclude
    });
    res.json(clients);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, description, color, founderName, contactPerson, industry, website, sections, members } = req.body;
  try {
    const client = await prisma.client.create({
      data: {
        name, description, color: color || '#16a34a', founderName, contactPerson, industry, website,
        sections: { create: (sections as string[]).map(s => ({ section: s.toUpperCase() })) },
        members: members ? { create: (members as { userId: string; sections: string }[]).map(m => ({ userId: m.userId, sections: m.sections || null })) } : undefined
      },
      include: clientInclude
    });
    res.status(201).json(client);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, description, color, founderName, contactPerson, industry, website, sections, members } = req.body;
  try {
    await prisma.clientSection.deleteMany({ where: { clientId: req.params.id } });
    await prisma.clientMember.deleteMany({ where: { clientId: req.params.id } });

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        name, description, color, founderName, contactPerson, industry, website,
        sections: { create: (sections as string[]).map(s => ({ section: s.toUpperCase() })) },
        members: { create: (members as { userId: string; sections: string }[]).map(m => ({ userId: m.userId, sections: m.sections || null })) }
      },
      include: clientInclude
    });
    res.json(client);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.userRole !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Super admin only' });
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Links
router.post('/:id/links', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, url } = req.body;
  try {
    const link = await prisma.clientLink.create({ data: { clientId: req.params.id, title, url } });
    res.status(201).json(link);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/links/:linkId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.clientLink.delete({ where: { id: req.params.linkId } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
