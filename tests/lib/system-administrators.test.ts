import {
  getSystemAdministratorAccessByEmail,
  listSystemAdministrators,
} from '@/lib/system-administrators';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    systemAdministrator: {
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

describe('system-administrators helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SYSTEM_ADMIN_BOOTSTRAP_EMAILS = '';
  });

  it('returns registered admin access when user exists in SystemAdministrator', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 10,
      email: 'user@example.com',
      name: 'User',
    });
    (prisma.systemAdministrator.findUnique as jest.Mock).mockResolvedValue({
      userId: 10,
    });
    (prisma.systemAdministrator.count as jest.Mock).mockResolvedValue(3);

    const result =
      await getSystemAdministratorAccessByEmail('user@example.com');

    expect(result.hasAccess).toBe(true);
    expect(result.isRegisteredAdmin).toBe(true);
    expect(result.currentUser?.id).toBe(10);
  });

  it('allows bootstrap admin when no registered admins exist', async () => {
    process.env.SYSTEM_ADMIN_BOOTSTRAP_EMAILS = 'bootstrap@example.com';
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 11,
      email: 'bootstrap@example.com',
      name: 'Bootstrap User',
    });
    (prisma.systemAdministrator.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    (prisma.systemAdministrator.count as jest.Mock).mockResolvedValue(0);

    const result = await getSystemAdministratorAccessByEmail(
      'bootstrap@example.com',
    );

    expect(result.hasAccess).toBe(true);
    expect(result.isRegisteredAdmin).toBe(false);
    expect(result.isBootstrapAdmin).toBe(true);
  });

  it('maps system administrator list with user fields', async () => {
    (prisma.systemAdministrator.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'sa-1',
        userId: 7,
        user: { id: 7, email: 'admin@example.com', name: 'Admin' },
        createdByUser: { id: 1, email: 'owner@example.com' },
        createdAt: new Date('2026-02-20T10:00:00.000Z'),
      },
    ]);

    const result = await listSystemAdministrators();

    expect(result).toEqual([
      {
        id: 'sa-1',
        userId: 7,
        userEmail: 'admin@example.com',
        userName: 'Admin',
        createdByUserId: 1,
        createdByUserEmail: 'owner@example.com',
        createdAt: '2026-02-20T10:00:00.000Z',
      },
    ]);
  });
});
