import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { PoolConfig } from 'mariadb';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPoolConfig(): PoolConfig | string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'mysql://user:password@localhost:3306/db';

  const parsed = new URL(url);
  const isTiDB =
    parsed.hostname.includes('tidbcloud') ||
    parsed.hostname.includes('tidb') ||
    parsed.searchParams.get('ssl') === 'true';

  if (!isTiDB) return url;

  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 4000,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace('/', ''),
    ssl: { rejectUnauthorized: true },
    connectTimeout: 5000,
    acquireTimeout: 10000,
    connectionLimit: 3,
    idleTimeout: 60,
    keepAliveDelay: 30000,
  };
}

const adapter = new PrismaMariaDb(buildPoolConfig());

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
  if (typeof existingPrisma.$disconnect === 'function') {
    void existingPrisma.$disconnect().catch(() => undefined);
  }
}

export const prisma =
  existingPrisma && hasSystemAdministratorDelegate
    ? existingPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
