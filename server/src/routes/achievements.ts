import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

export const achievementsRouter = Router();

const knownAchievementIds = new Set([
  'score_100',
  'score_500',
  'score_1000',
  'combo_5',
  'combo_10',
  'weapon_triple',
  'weapon_spread',
  'wave_5',
  'wave_10',
  'first_hit_taken'
]);

achievementsRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: req.userId },
      orderBy: { unlockedAt: 'asc' },
      select: { achievementId: true, unlockedAt: true }
    });
    res.json(achievements);
  } catch (error) {
    console.error('Failed to fetch player achievements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

achievementsRouter.post('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const ids: unknown = req.body?.ids;
  const validIds = Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string' && knownAchievementIds.has(id))
    : [];
  if (
    !Array.isArray(ids) ||
    ids.length > knownAchievementIds.size ||
    validIds.length !== ids.length
  ) {
    res.status(400).json({ error: 'ids must contain only known achievement identifiers' });
    return;
  }

  try {
    await prisma.userAchievement.createMany({
      data: [...new Set(validIds)].map((achievementId) => ({
        userId: req.userId!,
        achievementId
      })),
      skipDuplicates: true
    });
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: req.userId },
      orderBy: { unlockedAt: 'asc' },
      select: { achievementId: true, unlockedAt: true }
    });
    res.json(achievements);
  } catch (error) {
    console.error('Failed to save player achievements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
