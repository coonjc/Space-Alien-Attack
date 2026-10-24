import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

const SALT_ROUNDS = 10;

/**
 * Creates (or promotes) a single admin account from ADMIN_EMAIL /
 * ADMIN_PASSWORD in .env. Safe to run repeatedly — it upserts, so re-running
 * after changing ADMIN_PASSWORD in .env will reset that admin's password.
 */
async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before running the admin seed.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const existingAdmin = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
  const admin = existingAdmin
    ? await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { passwordHash, isAdmin: true, isBanned: false }
    })
    : await prisma.user.create({
      data: {
        email,
        passwordHash,
        isAdmin: true,
        stats: { create: {} }
      }
    });

  console.log(`Admin account ready: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
