import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const leaderboardRouter = Router();

/**
 * GET /leaderboard?limit=10
 * Public top high scores. Only players who have finished at least one game
 * (gamesPlayed > 0) and have a high score > 0 make the board.
 */
leaderboardRouter.get('/', async (req, res) => {
  let limit = parseInt(String(req.query.limit ?? '10'), 10);
  
  // Validate and sanitize input
  if (isNaN(limit)) {
    limit = 10;
  }
  limit = Math.min(Math.max(limit || 10, 1), 100);

  try {
    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        stats: { gamesPlayed: { gt: 0 }, highScore: { gt: 0 } }
      },
      orderBy: { stats: { highScore: 'desc' } },
      take: limit,
      select: {
        id: true,
        stats: {
          select: { displayName: true, highScore: true, gamesPlayed: true, updatedAt: true }
        }
      }
    });

    res.json(users.flatMap((u) => u.stats ? [{
        id: u.id,
        displayName: u.stats.displayName,
        highScore: u.stats.highScore,
        gamesPlayed: u.stats.gamesPlayed,
        updatedAt: u.stats.updatedAt
      }] : []));
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
