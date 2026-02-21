import { prisma } from '@/lib/prisma';
import { MembershipRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  jsonError,
  membershipRoleSchema,
  parseGroupId,
  requireUser,
} from '../../../common';

const updateMemberSchema = z.object({
  role: membershipRoleSchema,
});

function parseUserId(raw?: string) {
  const userId = Number(raw);
  if (!raw || Number.isNaN(userId) || userId <= 0) {
    return { error: jsonError('Invalid user id', 400) };
  }
  return { userId };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ groupId: string; userId: string }> },
) {
  const params = await context.params;
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const parsedGroup = parseGroupId(params.groupId);
  if ('error' in parsedGroup) {
    return parsedGroup.error;
  }

  const parsedUser = parseUserId(params.userId);
  if ('error' in parsedUser) {
    return parsedUser.error;
  }

  const body = await request.json().catch(() => ({}));
  const validation = updateMemberSchema.safeParse(body);

  if (!validation.success) {
    return jsonError('Invalid request body', 400);
  }

  const group = await prisma.group.findUnique({
    where: { id: parsedGroup.groupId },
  });

  if (!group) {
    return jsonError('Group not found', 404);
  }

  if (group.adminUserId !== currentUser.user.id) {
    return jsonError('Forbidden', 403);
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: {
        userId: parsedUser.userId,
        groupId: parsedGroup.groupId,
      },
    },
  });

  if (!membership) {
    return jsonError('Membership not found', 404);
  }

  if (
    validation.data.role === MembershipRole.MEMBER &&
    parsedUser.userId === group.adminUserId
  ) {
    return jsonError(
      'Transfer admin role before demoting the current admin',
      400,
    );
  }

  const updatedMembership = await prisma.$transaction(async (tx) => {
    if (
      validation.data.role === MembershipRole.ADMIN &&
      parsedUser.userId !== group.adminUserId
    ) {
      await tx.membership.update({
        where: {
          userId_groupId: {
            userId: group.adminUserId,
            groupId: parsedGroup.groupId,
          },
        },
        data: { role: MembershipRole.MEMBER },
      });

      await tx.group.update({
        where: { id: parsedGroup.groupId },
        data: { adminUserId: parsedUser.userId },
      });
    }

    return tx.membership.update({
      where: {
        userId_groupId: {
          userId: parsedUser.userId,
          groupId: parsedGroup.groupId,
        },
      },
      data: { role: validation.data.role },
    });
  });

  return NextResponse.json(
    {
      userId: updatedMembership.userId,
      groupId: updatedMembership.groupId,
      role: updatedMembership.role,
    },
    { status: 200 },
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ groupId: string; userId: string }> },
) {
  const params = await context.params;
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const parsedGroup = parseGroupId(params.groupId);
  if ('error' in parsedGroup) {
    return parsedGroup.error;
  }

  const parsedUser = parseUserId(params.userId);
  if ('error' in parsedUser) {
    return parsedUser.error;
  }

  const group = await prisma.group.findUnique({
    where: { id: parsedGroup.groupId },
  });

  if (!group) {
    return jsonError('Group not found', 404);
  }

  if (group.adminUserId !== currentUser.user.id) {
    return jsonError('Forbidden', 403);
  }

  if (parsedUser.userId === group.adminUserId) {
    return jsonError('Cannot remove the group admin', 400);
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: {
        userId: parsedUser.userId,
        groupId: parsedGroup.groupId,
      },
    },
  });

  if (!membership) {
    return jsonError('Membership not found', 404);
  }

  await prisma.membership.delete({
    where: {
      userId_groupId: {
        userId: parsedUser.userId,
        groupId: parsedGroup.groupId,
      },
    },
  });

  return new NextResponse(null, { status: 204 });
}
