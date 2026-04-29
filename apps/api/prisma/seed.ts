import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@zskills.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'Admin12345!';
  const fullName = process.env.ADMIN_FULL_NAME ?? 'Главный администратор';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role: UserRole.ADMIN,
      passwordHash,
    },
    create: {
      email,
      fullName,
      role: UserRole.ADMIN,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Admin ensured: ${admin.email} (${admin.fullName}) role=${admin.role}`);
}

main()
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
