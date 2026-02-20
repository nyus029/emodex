import { MembershipRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  jsonError,
  membershipRoleSchema,
  parseGroupId,
  requireUser,
} from '../../common';
import {
  listGroupMembers,
  addGroupMember,
} from '@/lib/services/member-service';

const addMemberSchema = z.object({
  email: z.string().email(),
  role: membershipRoleSchema.default(MembershipRole.MEMBER),
});

const memberErrorToHttp = {
  NOT_FOUND: { message: 'Group not found', status: 404 },
  FORBIDDEN: { message: 'Forbidden', status: 403 },
  GROUP_NOT_FOUND: { message: 'Group not found', status: 404 },
  USER_NOT_FOUND: { message: 'User not found', status: 404 },
  ALREADY_EXISTS: { message: 'Membership already exists', status: 409 },
} as const;

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

  const result = await listGroupMembers(parsed.groupId, currentUser.user.id);
  if ('error' in result) {
    const { message, status } = memberErrorToHttp[result.error];
    return jsonError(message, status);
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function POST(
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
  const validation = addMemberSchema.safeParse(body);

  if (!validation.success) {
    return jsonError('Invalid request body', 400);
  }

  const result = await addGroupMember(
    parsed.groupId,
    currentUser.user.id,
    validation.data,
  );
  if ('error' in result) {
    const { message, status } = memberErrorToHttp[result.error];
    return jsonError(message, status);
  }

  return NextResponse.json(result.data, { status: 201 });
}
