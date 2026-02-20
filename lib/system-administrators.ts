import { prisma } from '@/lib/prisma';

type PrismaWithSystemAdministrator = typeof prisma & {
  systemAdministrator: {
    findUnique: typeof prisma.systemAdministrator.findUnique;
    count: typeof prisma.systemAdministrator.count;
    findMany: typeof prisma.systemAdministrator.findMany;
    create: typeof prisma.systemAdministrator.create;
    delete: typeof prisma.systemAdministrator.delete;
  };
};

function hasSystemAdministratorDelegate(
  client: typeof prisma,
): client is PrismaWithSystemAdministrator {
  return 'systemAdministrator' in (client as Record<string, unknown>);
}

function readBootstrapEmails(): Set<string> {
  const raw = process.env.SYSTEM_ADMIN_BOOTSTRAP_EMAILS ?? '';
  const values = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set(values);
}

export async function getSystemAdministratorAccessByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const currentUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true },
  });
  if (!currentUser) {
    return {
      hasAccess: false,
      isRegisteredAdmin: false,
      isBootstrapAdmin: false,
      totalAdmins: 0,
      currentUser: null,
    };
  }

  const [existingAdmin, totalAdmins] = hasSystemAdministratorDelegate(prisma)
    ? await Promise.all([
        prisma.systemAdministrator.findUnique({
          where: { userId: currentUser.id },
          select: { userId: true },
        }),
        prisma.systemAdministrator.count(),
      ])
    : await Promise.all([
        prisma.$queryRaw<Array<{ userId: number }>>`
          SELECT userId FROM SystemAdministrator
          WHERE userId = ${currentUser.id}
          LIMIT 1
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) AS count FROM SystemAdministrator
        `,
      ]).then(([rows, countRows]) => [
        rows[0] ?? null,
        Number(countRows[0]?.count ?? 0n),
      ]);

  const isRegisteredAdmin = Boolean(existingAdmin);
  const isBootstrapAdmin = readBootstrapEmails().has(currentUser.email);
  const hasAccess =
    isRegisteredAdmin || (totalAdmins === 0 && isBootstrapAdmin);

  return {
    hasAccess,
    isRegisteredAdmin,
    isBootstrapAdmin,
    totalAdmins,
    currentUser,
  };
}

export type SystemAdministratorListItem = {
  id: string;
  userId: number;
  userEmail: string;
  userName: string;
  createdByUserId: number | null;
  createdByUserEmail: string | null;
  createdAt: string;
};

export async function listSystemAdministrators(): Promise<
  SystemAdministratorListItem[]
> {
  if (hasSystemAdministratorDelegate(prisma)) {
    const rows = await prisma.systemAdministrator.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.user.id,
      userEmail: row.user.email,
      userName: row.user.name,
      createdByUserId: row.createdByUser?.id ?? null,
      createdByUserEmail: row.createdByUser?.email ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: number;
      userEmail: string;
      userName: string;
      createdByUserId: number | null;
      createdByUserEmail: string | null;
      createdAt: Date;
    }>
  >`
    SELECT
      sa.id,
      sa.userId,
      u.email AS userEmail,
      u.name AS userName,
      sa.createdByUserId,
      cb.email AS createdByUserEmail,
      sa.createdAt
    FROM SystemAdministrator sa
    INNER JOIN User u ON u.id = sa.userId
    LEFT JOIN User cb ON cb.id = sa.createdByUserId
    ORDER BY sa.createdAt ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName,
    createdByUserId: row.createdByUserId,
    createdByUserEmail: row.createdByUserEmail,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function findSystemAdministratorByUserId(userId: number) {
  if (hasSystemAdministratorDelegate(prisma)) {
    return prisma.systemAdministrator.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; userId: number }>>`
    SELECT id, userId
    FROM SystemAdministrator
    WHERE userId = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function countSystemAdministrators(): Promise<number> {
  if (hasSystemAdministratorDelegate(prisma)) {
    return prisma.systemAdministrator.count();
  }

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count
    FROM SystemAdministrator
  `;
  return Number(rows[0]?.count ?? 0n);
}

export async function createSystemAdministrator(
  userId: number,
  createdByUserId: number,
) {
  if (hasSystemAdministratorDelegate(prisma)) {
    const created = await prisma.systemAdministrator.create({
      data: {
        userId,
        createdByUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    return {
      id: created.id,
      userId: created.user.id,
      userEmail: created.user.email,
      userName: created.user.name,
      createdAt: created.createdAt.toISOString(),
    };
  }

  await prisma.$executeRaw`
    INSERT INTO SystemAdministrator (id, userId, createdByUserId, createdAt)
    VALUES (REPLACE(UUID(), '-', ''), ${userId}, ${createdByUserId}, NOW(3))
  `;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: number;
      userEmail: string;
      userName: string;
      createdAt: Date;
    }>
  >`
    SELECT sa.id, sa.userId, u.email AS userEmail, u.name AS userName, sa.createdAt
    FROM SystemAdministrator sa
    INNER JOIN User u ON u.id = sa.userId
    WHERE sa.userId = ${userId}
    LIMIT 1
  `;
  const created = rows[0];
  if (!created) {
    throw new Error('Failed to create system administrator');
  }
  return {
    id: created.id,
    userId: created.userId,
    userEmail: created.userEmail,
    userName: created.userName,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function deleteSystemAdministratorByUserId(userId: number) {
  if (hasSystemAdministratorDelegate(prisma)) {
    await prisma.systemAdministrator.delete({
      where: { userId },
    });
    return;
  }

  await prisma.$executeRaw`
    DELETE FROM SystemAdministrator
    WHERE userId = ${userId}
  `;
}
