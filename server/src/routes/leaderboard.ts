import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const leaderboardRouter = Router();

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_OFFSET = 1_000_000;

function readIntegerQuery(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** GET /leaderboard?limit=10&offset=0 */
leaderboardRouter.get('/', async (req, res) => {
  const limit = readIntegerQuery(req.query.limit, DEFAULT_LIMIT);
  const offset = readIntegerQuery(req.query.offset, 0);
  if (limit === null || limit < 1 || limit > MAX_LIMIT) {
    res.status(400).json({ error: `limit must be an integer between 1 and ${MAX_LIMIT}` });
    return;
  }
  if (offset === null || offset < 0 || offset > MAX_OFFSET) {
    res.status(400).json({ error: `offset must be an integer between 0 and ${MAX_OFFSET}` });
    return;
  }

  try {
    const where = {
      isBanned: false,
      stats: { gamesPlayed: { gt: 0 }, highScore: { gt: 0 } }
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { stats: { highScore: 'desc' } },
        take: limit,
        skip: offset,
        select: {
          id: true,
          stats: {
            select: { displayName: true, highScore: true, gamesPlayed: true, updatedAt: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      entries: users.flatMap((user) => user.stats ? [{
        id: user.id,
        displayName: user.stats.displayName,
        highScore: user.stats.highScore,
        gamesPlayed: user.stats.gamesPlayed,
        updatedAt: user.stats.updatedAt
      }] : []),
      total,
      limit,
      offset
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
