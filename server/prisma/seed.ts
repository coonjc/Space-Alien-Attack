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
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — skipping admin seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isAdmin: true, isBanned: false },
    create: {
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
