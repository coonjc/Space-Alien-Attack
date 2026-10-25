import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

export const statsRouter = Router();

statsRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await prisma.playerStats.findUnique({ where: { userId: req.userId! } });
    if (!stats) {
      res.status(404).json({ error: 'No stats found for this user' });
      return;
    }

    res.json(stats);
  } catch (err) {
    console.error('Failed to fetch player stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

statsRouter.post('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { highScore, gamesPlayed, displayName, submissionId } = req.body ?? {};
  const maxInt = 2_147_483_647;

  if (highScore !== undefined && (!Number.isInteger(highScore) || highScore < 0 || highScore > maxInt)) {
    res.status(400).json({ error: 'highScore must be a non-negative integer' });
    return;
  }
  if (gamesPlayed !== undefined && (!Number.isInteger(gamesPlayed) || gamesPlayed < 0 || gamesPlayed > maxInt)) {
    res.status(400).json({ error: 'gamesPlayed must be a non-negative integer' });
    return;
  }
  if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length > 32)) {
    res.status(400).json({ error: 'displayName must be a string of at most 32 characters' });
    return;
  }
  if (submissionId !== undefined && (
    typeof submissionId !== 'string' ||
    submissionId.length < 1 ||
    submissionId.length > 100 ||
    !/^[a-zA-Z0-9-]+$/.test(submissionId)
  )) {
    res.status(400).json({ error: 'submissionId must be a valid identifier of at most 100 characters' });
    return;
  }
  if (highScore === undefined && gamesPlayed === undefined && displayName === undefined) {
    res.status(400).json({ error: 'At least one stat must be provided' });
    return;
  }

  try {
    const score = highScore as number | undefined;
    const games = gamesPlayed as number | undefined;
    const normalizedName = typeof displayName === 'string' ? displayName.trim() || 'Anonymous' : undefined;

    const stats = await prisma.$transaction(async (transaction) => {
      if (score !== undefined) {
        const recorded = await transaction.scoreSubmission.createMany({
          data: [{
            userId: req.userId!,
            submissionId: submissionId ?? randomUUID()
          }],
          skipDuplicates: true
        });
        if (recorded.count === 0) {
          return transaction.playerStats.findUnique({ where: { userId: req.userId! } });
        }
      }

      const existing = await transaction.playerStats.findUnique({ where: { userId: req.userId! } });
      return transaction.playerStats.upsert({
        where: { userId: req.userId! },
        create: {
          userId: req.userId!,
          highScore: score ?? 0,
          totalScore: score ?? 0,
          gamesPlayed: games ?? (score !== undefined ? 1 : 0),
          ...(normalizedName !== undefined ? { displayName: normalizedName } : {})
        },
        update: {
          highScore: Math.max(existing?.highScore ?? 0, score ?? 0),
          ...(score !== undefined ? { totalScore: { increment: score } } : {}),
          gamesPlayed: (existing?.gamesPlayed ?? 0) + (games ?? (score !== undefined ? 1 : 0)),
          ...(normalizedName !== undefined ? { displayName: normalizedName } : {})
        }
      });
    });

    if (!stats) {
      res.status(404).json({ error: 'No stats found for this user' });
      return;
    }
    res.json(stats);
  } catch (err) {
    console.error('Failed to update player stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
