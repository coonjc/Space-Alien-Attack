import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

export const statsRouter = Router();

statsRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const stats = await prisma.playerStats.findUnique({ where: { userId: req.userId! } });

  if (!stats) {
    res.status(404).json({ error: 'No stats found for this user' });
    return;
  }

  res.json(stats);
});

statsRouter.post('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { highScore, gamesPlayed } = req.body ?? {};

  if (highScore !== undefined && typeof highScore !== 'number') {
    res.status(400).json({ error: 'highScore must be a number' });
    return;
  }
  if (gamesPlayed !== undefined && typeof gamesPlayed !== 'number') {
    res.status(400).json({ error: 'gamesPlayed must be a number' });
    return;
  }

  const existing = await prisma.playerStats.findUnique({ where: { userId: req.userId! } });

  const nextHighScore = Math.max(existing?.highScore ?? 0, highScore ?? 0);
  const nextGamesPlayed = (existing?.gamesPlayed ?? 0) + (gamesPlayed ?? (highScore !== undefined ? 1 : 0));

  const stats = await prisma.playerStats.upsert({
    where: { userId: req.userId! },
    create: {
      userId: req.userId!,
      highScore: highScore ?? 0,
      gamesPlayed: gamesPlayed ?? 0
    },
    update: {
      highScore: nextHighScore,
      gamesPlayed: nextGamesPlayed
    }
  });

  res.json(stats);
});
