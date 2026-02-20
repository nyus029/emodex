import { NextResponse } from 'next/server';
import { z } from 'zod';
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
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await getSystemAdministratorAccessByEmail(email);
  if (!access.currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const administrators = await listSystemAdministrators();

  return NextResponse.json(
    {
      currentUser: {
        id: access.currentUser.id,
        email: access.currentUser.email,
        isRegisteredAdmin: access.isRegisteredAdmin,
        isBootstrapAdmin: access.isBootstrapAdmin,
      },
      systemAdministrators: administrators.map((admin) => ({
        id: admin.id,
        userId: admin.userId,
        userEmail: admin.userEmail,
        userName: admin.userName,
        createdByUserId: admin.createdByUserId,
        createdByUserEmail: admin.createdByUserEmail,
        createdAt: admin.createdAt,
      })),
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await getSystemAdministratorAccessByEmail(email);
  if (!access.currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = mutateSystemAdministratorSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const targetUserId = await resolveTargetUserId(parsed.data);
  if (!targetUserId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const existingAdmin = await findSystemAdministratorByUserId(targetUserId);
  if (existingAdmin) {
    return NextResponse.json(
      { error: '既に system administrator に登録されています' },
      { status: 409 },
    );
  }

  try {
    const created = await createSystemAdministrator(
      targetUserId,
      access.currentUser.id,
    );

    return NextResponse.json({ systemAdministrator: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create system administrator', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await getSystemAdministratorAccessByEmail(email);
  if (!access.currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!access.isRegisteredAdmin) {
    return NextResponse.json(
      { error: 'Only registered system administrator can delete entries' },
      { status: 403 },
    );
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = mutateSystemAdministratorSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const targetUserId = await resolveTargetUserId(parsed.data);
  if (!targetUserId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const totalAdmins = await countSystemAdministrators();
  if (totalAdmins <= 1) {
    return NextResponse.json(
      { error: '最後の system administrator は削除できません' },
      { status: 400 },
    );
  }

  const target = await findSystemAdministratorByUserId(targetUserId);
  if (!target) {
    return NextResponse.json(
      { error: 'system administrator が見つかりません' },
      { status: 404 },
    );
  }

  await deleteSystemAdministratorByUserId(targetUserId);

  return NextResponse.json(
    {
      deletedUserId: targetUserId,
    },
    { status: 200 },
  );
}
