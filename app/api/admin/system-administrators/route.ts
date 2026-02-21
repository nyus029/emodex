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
