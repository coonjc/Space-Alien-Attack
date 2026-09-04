import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

export const adminRouter = Router();

// Every route below requires a valid, non-banned admin session.
adminRouter.use(requireAuth, requireAdmin);

/** List all player accounts with their stats, for the admin dashboard. */
adminRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      isAdmin: true,
      isBanned: true,
      createdAt: true,
      stats: {
        select: { highScore: true, gamesPlayed: true, updatedAt: true }
      }
    }
  });

  res.json(users);
});

/** Ban a player account. Banned users are rejected at /auth/login and on every authenticated request. */
adminRouter.post('/users/:id/ban', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  if (id === req.userId) {
    res.status(400).json({ error: 'You cannot ban your own account' });
    return;
  }

  try {
    const user = await prisma.user.update({ where: { id }, data: { isBanned: true } });
    res.json({ id: user.id, email: user.email, isBanned: user.isBanned });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

/** Lift a ban on a player account. */
adminRouter.post('/users/:id/unban', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.update({ where: { id }, data: { isBanned: false } });
    res.json({ id: user.id, email: user.email, isBanned: user.isBanned });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

/** Permanently delete a player account and its stats (cascades via the Prisma relation). */
adminRouter.delete('/users/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  if (id === req.userId) {
    res.status(400).json({ error: 'You cannot delete your own account' });
    return;
  }

  try {
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});
