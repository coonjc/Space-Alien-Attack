import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

interface JwtPayload {
  userId: string;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * decoded user id (and current `isAdmin` flag) to the request. Structured
 * as standalone middleware so additional auth strategies (e.g. OAuth) can
 * populate `req.userId` the same way in the future without changing
 * downstream route handlers.
 *
 * The user's current ban/admin status is re-checked against the database
 * on every request (rather than trusting the JWT payload) so that a ban
 * applied by an admin takes effect immediately, without waiting for the
 * token to expire.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    res.status(401).json({ error: 'Account no longer exists' });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ error: 'This account has been banned' });
    return;
  }

  req.userId = user.id;
  req.isAdmin = user.isAdmin;
  next();
}

/** Chain after `requireAuth`. Rejects any request from a non-admin user. */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.isAdmin) {
    res.status(403).json({ error: 'Admin privileges required' });
    return;
  }
  next();
}
