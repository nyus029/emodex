import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  jsonError,
  membershipRoleSchema,
  parseGroupId,
  requireUser,
} from '../../../common';
import {
  updateMemberRole,
  removeGroupMember,
} from '@/lib/services/member-service';

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

const memberErrorToHttp = {
  GROUP_NOT_FOUND: { message: 'Group not found', status: 404 },
  FORBIDDEN: { message: 'Forbidden', status: 403 },
  MEMBERSHIP_NOT_FOUND: { message: 'Membership not found', status: 404 },
  CANNOT_DEMOTE_ADMIN: {
    message: 'Transfer admin role before demoting the current admin',
    status: 400,
  },
  CANNOT_REMOVE_ADMIN: {
    message: 'Cannot remove the group admin',
    status: 400,
  },
} as const;

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

  const result = await updateMemberRole(
    parsedGroup.groupId,
    currentUser.user.id,
    parsedUser.userId,
    validation.data.role,
  );
  if ('error' in result) {
    const { message, status } = memberErrorToHttp[result.error];
    return jsonError(message, status);
  }

  return NextResponse.json(result.data, { status: 200 });
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

  const result = await removeGroupMember(
    parsedGroup.groupId,
    currentUser.user.id,
    parsedUser.userId,
  );
  if ('error' in result) {
    const { message, status } = memberErrorToHttp[result.error];
    return jsonError(message, status);
  }

  return new NextResponse(null, { status: 204 });
}
