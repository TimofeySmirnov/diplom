import { Prisma, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const DEFAULT_ADMIN_EMAIL = 'admin@zskills.local';

const adminSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  group: true,
} satisfies Prisma.UserSelect;

export type AdminInput = {
  email: string;
  password: string;
  fullName: string;
};

export type AdminResult =
  | {
      status: 'created' | 'exists';
      email: string;
      user: Prisma.UserGetPayload<{ select: typeof adminSelect }>;
    }
  | {
      status: 'email_taken';
      email: string;
      role: UserRole;
    };

export async function ensureAdmin(
  prisma: PrismaClient,
  input: AdminInput,
): Promise<AdminResult> {
  const email = normalizeEmail(input.email);
  const fullName = normalizeFullName(input.fullName);
  validateAdminInput({ email, fullName, password: input.password });

  const existing = await prisma.user.findUnique({
    where: { email },
    select: adminSelect,
  });

  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      return {
        status: 'email_taken',
        email,
        role: existing.role,
      };
    }

    return {
      status: 'exists',
      email,
      user: existing,
    };
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: UserRole.ADMIN,
      group: null,
    },
    select: adminSelect,
  });

  return {
    status: 'created',
    email,
    user,
  };
}

export async function findUserByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: adminSelect,
  });
}

export async function findAnyAdmin(prisma: PrismaClient) {
  return prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: adminSelect,
    orderBy: { createdAt: 'asc' },
  });
}

export function readDefaultAdminEmailFromEnv() {
  return (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim();
}

export function readDefaultAdminInputFromEnv(): AdminInput | null {
  const email = readDefaultAdminEmailFromEnv();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = (process.env.ADMIN_NAME ?? process.env.ADMIN_FULL_NAME)?.trim();

  if (!email || !password) {
    return null;
  }

  return {
    email,
    password,
    fullName: fullName || 'Administrator',
  };
}

function validateAdminInput(input: AdminInput) {
  if (!input.email || !input.email.includes('@')) {
    throw new Error('Admin email is required and must be a valid email address.');
  }

  if (!input.fullName || input.fullName.length < 2) {
    throw new Error('Admin name must contain at least 2 characters.');
  }

  if (!input.password || input.password.length < 6) {
    throw new Error('Admin password must contain at least 6 characters.');
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeFullName(fullName: string) {
  return fullName.trim().replace(/\s+/g, ' ');
}
