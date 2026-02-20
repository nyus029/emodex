import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaMariaDb(
  process.env.DATABASE_URL ?? 'mysql://user:password@localhost:3306/db',
);

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
}

const existingPrisma = globalForPrisma.prisma;
const hasSystemAdministratorDelegate = Boolean(
  existingPrisma &&
  'systemAdministrator' in
    (existingPrisma as unknown as Record<string, unknown>),
);

if (existingPrisma && !hasSystemAdministratorDelegate) {
  void existingPrisma.$disconnect().catch(() => undefined);
}

export const prisma =
  existingPrisma && hasSystemAdministratorDelegate
    ? existingPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
