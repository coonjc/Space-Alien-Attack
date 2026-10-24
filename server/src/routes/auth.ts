import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';

export const authRouter = Router();

const SALT_ROUNDS = 10;

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

  if (!isValidEmail(normalizedEmail) || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'A valid email and a password of at least 8 characters are required' });
    return;
  }
  if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length > 32)) {
    res.status(400).json({ error: 'displayName must be a string of at most 32 characters' });
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
  });
  if (existing) {
    res.status(409).json({ error: 'An account with that email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      stats: { create: { displayName: typeof displayName === 'string' ? displayName.trim() || 'Anonymous' : 'Anonymous' } }
    }
  });

  const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

  res.status(201).json({ token, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

  if (!isValidEmail(normalizedEmail) || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
  });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: 'This account has been banned' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

  res.json({ token, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
});
