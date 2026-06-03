import { PrismaClient } from '@prisma/client';
import {
  ensureAdmin,
  findAnyAdmin,
  findUserByEmail,
  readDefaultAdminEmailFromEnv,
  readDefaultAdminInputFromEnv,
} from './admin-utils';
import { loadLocalEnv } from './load-env';

loadLocalEnv();

const prisma = new PrismaClient();

async function main() {
  const input = readDefaultAdminInputFromEnv();
  if (!input) {
    const email = readDefaultAdminEmailFromEnv();
    const existing = await findUserByEmail(prisma, email);
    if (existing?.role === 'ADMIN') {
      // eslint-disable-next-line no-console
      console.log(`Default administrator already exists: ${existing.email}`);
      return;
    }

    const anyAdmin = await findAnyAdmin(prisma);
    if (anyAdmin) {
      // eslint-disable-next-line no-console
      console.log(`Administrator already exists: ${anyAdmin.email}`);
      return;
    }

    throw new Error(
      'ADMIN_PASSWORD must be set in apps/api/.env before creating the default administrator.',
    );
  }

  const result = await ensureAdmin(prisma, input);

  if (result.status === 'email_taken') {
    throw new Error(
      `User ${result.email} already exists with role ${result.role}. Default administrator was not created.`,
    );
  }

  if (result.status === 'exists') {
    // eslint-disable-next-line no-console
    console.log(`Default administrator already exists: ${result.email}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`Default administrator created: ${result.email}`);
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
