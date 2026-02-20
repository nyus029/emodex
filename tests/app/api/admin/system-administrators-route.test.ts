import { DELETE, GET, POST } from '@/app/api/admin/system-administrators/route';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import {
  countSystemAdministrators,
  createSystemAdministrator,
  deleteSystemAdministratorByUserId,
  findSystemAdministratorByUserId,
  getSystemAdministratorAccessByEmail,
  listSystemAdministrators,
} from '@/lib/system-administrators';

jest.mock('@/lib/auth0', () => ({
  auth0: { getSession: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/system-administrators', () => ({
  countSystemAdministrators: jest.fn(),
  createSystemAdministrator: jest.fn(),
  deleteSystemAdministratorByUserId: jest.fn(),
  findSystemAdministratorByUserId: jest.fn(),
  getSystemAdministratorAccessByEmail: jest.fn(),
  listSystemAdministrators: jest.fn(),
}));

describe('system-administrators route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns 401 when not logged in', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('POST creates a system administrator by userId', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (getSystemAdministratorAccessByEmail as jest.Mock).mockResolvedValue({
      hasAccess: true,
      currentUser: { id: 1, email: 'admin@example.com' },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (findSystemAdministratorByUserId as jest.Mock).mockResolvedValue(null);
    (createSystemAdministrator as jest.Mock).mockResolvedValue({
      id: 'sa-2',
      userId: 2,
      userEmail: 'u2@example.com',
      userName: 'User 2',
      createdAt: '2026-02-20T10:00:00.000Z',
    });

    const request = new Request(
      'http://localhost/api/admin/system-administrators',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 2 }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.systemAdministrator.userId).toBe(2);
  });

  it('DELETE prevents deleting last admin', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (getSystemAdministratorAccessByEmail as jest.Mock).mockResolvedValue({
      isRegisteredAdmin: true,
      currentUser: { id: 1, email: 'admin@example.com' },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (countSystemAdministrators as jest.Mock).mockResolvedValue(1);

    const request = new Request(
      'http://localhost/api/admin/system-administrators',
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 1 }),
      },
    );
    const response = await DELETE(request);

    expect(response.status).toBe(400);
    expect(deleteSystemAdministratorByUserId).not.toHaveBeenCalled();
  });

  it('GET returns administrators list for admin user', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (getSystemAdministratorAccessByEmail as jest.Mock).mockResolvedValue({
      hasAccess: true,
      isRegisteredAdmin: true,
      isBootstrapAdmin: false,
      currentUser: { id: 1, email: 'admin@example.com' },
    });
    (listSystemAdministrators as jest.Mock).mockResolvedValue([
      {
        id: 'sa-1',
        userId: 1,
        userEmail: 'admin@example.com',
        userName: 'Admin',
        createdByUserId: null,
        createdByUserEmail: null,
        createdAt: '2026-02-20T10:00:00.000Z',
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.systemAdministrators).toHaveLength(1);
  });
});
