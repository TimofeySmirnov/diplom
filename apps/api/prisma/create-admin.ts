import { PrismaClient } from '@prisma/client';
import { ensureAdmin } from './admin-utils';
import { loadLocalEnv } from './load-env';

loadLocalEnv();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.LAUNCHER_ADMIN_EMAIL?.trim();
  const password = process.env.LAUNCHER_ADMIN_PASSWORD;
  const fullName = process.env.LAUNCHER_ADMIN_NAME?.trim();

  if (!email || !password || !fullName) {
    throw new Error(
      'LAUNCHER_ADMIN_EMAIL, LAUNCHER_ADMIN_PASSWORD and LAUNCHER_ADMIN_NAME must be provided.',
    );
  }

  const result = await ensureAdmin(prisma, {
    email,
    password,
    fullName,
  });

  if (result.status === 'email_taken') {
    // eslint-disable-next-line no-console
    console.log(
      `ADMIN_EMAIL_TAKEN: user ${result.email} already exists with role ${result.role}.`,
    );
    process.exitCode = 2;
    return;
  }

  if (result.status === 'exists') {
    // eslint-disable-next-line no-console
    console.log(`ADMIN_EXISTS: administrator ${result.email} already exists.`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`ADMIN_CREATED: administrator ${result.email} created.`);
}

main()
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
