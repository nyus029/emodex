import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, parseGroupId, requireUser } from '../common';

const updateGroupSchema = z.object({
  groupName: z.string().trim().min(1),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const params = await context.params;
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const parsed = parseGroupId(params.groupId);
  if ('error' in parsed) {
    return parsed.error;
  }

  const group = await prisma.group.findUnique({
    where: { id: parsed.groupId },
  });

  if (!group) {
    return jsonError('Group not found', 404);
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: {
        userId: currentUser.user.id,
        groupId: parsed.groupId,
      },
    },
  });

  if (!membership) {
    return jsonError('Forbidden', 403);
  }

  return NextResponse.json(
    {
      groupId: group.id,
      groupName: group.groupName,
      adminUserId: group.adminUserId,
    },
    { status: 200 },
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const params = await context.params;
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const parsed = parseGroupId(params.groupId);
  if ('error' in parsed) {
    return parsed.error;
  }

  const body = await request.json().catch(() => ({}));
  const validation = updateGroupSchema.safeParse(body);

  if (!validation.success) {
    return jsonError('Invalid request body', 400);
  }

  const group = await prisma.group.findUnique({
    where: { id: parsed.groupId },
  });

  if (!group) {
    return jsonError('Group not found', 404);
  }

  if (group.adminUserId !== currentUser.user.id) {
    return jsonError('Forbidden', 403);
  }

  const updated = await prisma.group.update({
    where: { id: parsed.groupId },
    data: { groupName: validation.data.groupName },
  });

  return NextResponse.json(
    {
      groupId: updated.id,
      groupName: updated.groupName,
      adminUserId: updated.adminUserId,
    },
    { status: 200 },
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const params = await context.params;
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const parsed = parseGroupId(params.groupId);
  if ('error' in parsed) {
    return parsed.error;
  }

  const group = await prisma.group.findUnique({
    where: { id: parsed.groupId },
  });

  if (!group) {
    return jsonError('Group not found', 404);
  }

  if (group.adminUserId !== currentUser.user.id) {
    return jsonError('Forbidden', 403);
  }

  await prisma.group.delete({ where: { id: parsed.groupId } });

  return new NextResponse(null, { status: 204 });
}
