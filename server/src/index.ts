import express from 'express';
import type { RequestHandler } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './lib/env';
import { authRouter } from './routes/auth';
import { statsRouter } from './routes/stats';
import { adminRouter } from './routes/admin';
import { leaderboardRouter } from './routes/leaderboard';
import { achievementsRouter } from './routes/achievements';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

// Rate limiting for authentication endpoints to prevent brute force attacks
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: { error: 'Too many registration attempts. Please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: { error: 'Too many login attempts. Please try again later.' }
});

// express-rate-limit resolves a separate Express type version in this workspace.
const asExpressMiddleware = (handler: typeof registerLimiter): RequestHandler =>
  handler as unknown as RequestHandler;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth/register', asExpressMiddleware(registerLimiter));
app.use('/auth/login', asExpressMiddleware(loginLimiter));
app.use('/auth', authRouter);
app.use('/stats', statsRouter);
app.use('/achievements', achievementsRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/admin', adminRouter);

app.listen(env.port, () => {
  console.log(`Space Alien Attack server listening on port ${env.port}`);
});
