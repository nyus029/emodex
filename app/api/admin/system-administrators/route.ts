import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  countSystemAdministrators,
  createSystemAdministrator,
  deleteSystemAdministratorByUserId,
  findSystemAdministratorByUserId,
  listSystemAdministrators,
} from '@/lib/system-administrators';
import {
  requireAdminAuth,
  parseBody,
  jsonSuccess,
  jsonError,
} from '@/lib/api-utils';
import { DB_MOCK_SESSION, isDbMockEnabled } from '@/lib/db-mock';

const mutateSystemAdministratorSchema = z
  .object({
    userId: z.number().int().positive().optional(),
    email: z.string().trim().email().optional(),
  })
  .refine((value) => value.userId || value.email, {
    message: 'userId or email is required',
  });

async function resolveTargetUserId(input: {
  userId?: number;
  email?: string;
}): Promise<number | null> {
  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  if (!input.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function GET() {
  const admin = await requireAdminAuth();
  if (admin.error) return admin.error;

  if (isDbMockEnabled()) {
    return jsonSuccess({
      currentUser: {
        id: admin.currentUser.id,
        email: admin.currentUser.email,
        isRegisteredAdmin: true,
        isBootstrapAdmin: true,
      },
      systemAdministrators: [
        {
          id: 'mock-admin-1',
          userId: 1,
          userEmail: DB_MOCK_SESSION.userEmail ?? 'mock-admin@example.com',
          userName: 'Mock Admin',
          createdByUserId: 1,
          createdByUserEmail:
            DB_MOCK_SESSION.userEmail ?? 'mock-admin@example.com',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  const administrators = await listSystemAdministrators();

  return jsonSuccess({
    currentUser: {
      id: admin.currentUser.id,
      email: admin.currentUser.email,
      isRegisteredAdmin: admin.isRegisteredAdmin,
      isBootstrapAdmin: admin.isBootstrapAdmin,
    },
    systemAdministrators: administrators.map((a) => ({
      id: a.id,
      userId: a.userId,
      userEmail: a.userEmail,
      userName: a.userName,
      createdByUserId: a.createdByUserId,
      createdByUserEmail: a.createdByUserEmail,
      createdAt: a.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdminAuth();
  if (admin.error) return admin.error;

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, mutateSystemAdministratorSchema);
  if (parsed.error) return parsed.error;

  if (isDbMockEnabled()) {
    return jsonSuccess(
      {
        systemAdministrator: {
          id: 'mock-admin-2',
          userId: parsed.data.userId ?? 2,
          userEmail: parsed.data.email ?? 'new-admin@example.com',
          userName: 'Mock Added Admin',
          createdByUserId: admin.currentUser.id,
          createdByUserEmail: admin.currentUser.email,
          createdAt: new Date().toISOString(),
        },
      },
      201,
    );
  }

  const targetUserId = await resolveTargetUserId(parsed.data);
  if (!targetUserId) {
    return jsonError('User not found', 404);
  }

  const existingAdmin = await findSystemAdministratorByUserId(targetUserId);
  if (existingAdmin) {
    return jsonError('既に system administrator に登録されています', 409);
  }

  try {
    const created = await createSystemAdministrator(
      targetUserId,
      admin.currentUser.id,
    );

    return jsonSuccess({ systemAdministrator: created }, 201);
  } catch (error) {
    console.error('Failed to create system administrator', error);
    return jsonError('Internal server error', 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminAuth();
  if (admin.error) return admin.error;

  if (!admin.isRegisteredAdmin) {
    return jsonError(
      'Only registered system administrator can delete entries',
      403,
    );
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, mutateSystemAdministratorSchema);
  if (parsed.error) return parsed.error;

  if (isDbMockEnabled()) {
    return jsonSuccess({ deletedUserId: parsed.data.userId ?? 1 });
  }

  const targetUserId = await resolveTargetUserId(parsed.data);
  if (!targetUserId) {
    return jsonError('User not found', 404);
  }

  const totalAdmins = await countSystemAdministrators();
  if (totalAdmins <= 1) {
    return jsonError('最後の system administrator は削除できません', 400);
  }

  const target = await findSystemAdministratorByUserId(targetUserId);
  if (!target) {
    return jsonError('system administrator が見つかりません', 404);
  }

  await deleteSystemAdministratorByUserId(targetUserId);

  return jsonSuccess({ deletedUserId: targetUserId });
}
