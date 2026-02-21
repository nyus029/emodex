import { GET } from '@/app/api/admin/overview/route';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import {
  getSystemAdministratorAccessByEmail,
  listSystemAdministrators,
} from '@/lib/system-administrators';

jest.mock('@/lib/auth0', () => ({
  auth0: { getSession: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: jest.fn() },
    group: { findMany: jest.fn() },
    album: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/system-administrators', () => ({
  getSystemAdministratorAccessByEmail: jest.fn(),
  listSystemAdministrators: jest.fn(),
}));

describe('GET /api/admin/overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session has no email', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue({ user: {} });

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('returns 403 when requester is not admin', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue({
      user: { email: 'u@example.com' },
    });
    (getSystemAdministratorAccessByEmail as jest.Mock).mockResolvedValue({
      hasAccess: false,
      currentUser: { id: 1, email: 'u@example.com', name: 'U' },
    });

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it('returns aggregated overview payload', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (getSystemAdministratorAccessByEmail as jest.Mock).mockResolvedValue({
      hasAccess: true,
      isRegisteredAdmin: true,
      isBootstrapAdmin: false,
      currentUser: { id: 1, email: 'admin@example.com', name: 'Admin' },
    });
    (listSystemAdministrators as jest.Mock).mockResolvedValue([
      {
        id: 'sa-1',
        userId: 1,
        userName: 'Admin',
        userEmail: 'admin@example.com',
        createdByUserId: 1,
        createdByUserEmail: 'admin@example.com',
        createdAt: '2026-02-20T10:00:00.000Z',
      },
    ]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Admin',
        email: 'admin@example.com',
        memberships: [],
      },
    ]);
    (prisma.group.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.album.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'album-1',
        name: 'Album 1',
        userId: 'auth0|x',
        rootPath: 'album-1',
        createdAt: new Date('2026-02-20T10:00:00.000Z'),
        photoStorages: [],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.currentUser.email).toBe('admin@example.com');
    expect(body.systemAdministrators).toHaveLength(1);
    expect(body.albums[0].photoStorageCount).toBe(0);
  });
});
