import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' }
    });
    const usersWithClients = await Promise.all(users.map(async (u) => {
      const clients = await prisma.clientMember.findMany({
        where: { userId: u.id },
        include: { client: { select: { id: true, name: true } } }
      });
      return { ...u, clients: clients.map((c) => c.client) };
    }));
    res.json(usersWithClients);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, email, password, role } = req.body;
  try {
    if (role === 'SUPER_ADMIN' && req.userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admin can create super admins' });
    }
    const hashed = await bcrypt.hash(password || 'knerd123', 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'MEMBER' },
      select: { id: true, name: true, email: true, role: true }
    });
    res.status(201).json(user);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, email, role, password } = req.body;
  if (req.userId !== req.params.id && req.userRole === 'MEMBER') {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (role && req.userRole !== 'SUPER_ADMIN' && req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Cannot change roles' });
  }
  try {
    const data: Record<string, unknown> = { name, email };
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true }
    });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.userRole !== 'SUPER_ADMIN' && req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
