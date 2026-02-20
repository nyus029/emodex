import { prisma } from '@/lib/prisma';
import { MembershipRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  jsonError,
  membershipRoleSchema,
  normalizeEmail,
  parseGroupId,
  requireUser,
} from '../../common';

const addMemberSchema = z.object({
  email: z.string().email(),
  role: membershipRoleSchema.default(MembershipRole.MEMBER),
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

  const members = await prisma.membership.findMany({
    where: { groupId: parsed.groupId },
    include: { user: true },
  });

  return NextResponse.json(
    members.map((member) => ({
      userId: member.userId,
      email: member.user.email,
      role: member.role,
    })),
    { status: 200 },
  );
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

  const group = await prisma.group.findUnique({
    where: { id: parsed.groupId },
  });

  if (!group) {
    return jsonError('Group not found', 404);
  }

  if (group.adminUserId !== currentUser.user.id) {
    return jsonError('Forbidden', 403);
  }

  const targetEmail = normalizeEmail(validation.data.email);

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    return jsonError('User not found', 404);
  }

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_groupId: {
        userId: user.id,
        groupId: parsed.groupId,
      },
    },
  });

  if (existingMembership) {
    return jsonError('Membership already exists', 409);
  }

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      groupId: parsed.groupId,
      role: validation.data.role,
    },
  });

  return NextResponse.json(
    {
      userId: membership.userId,
      groupId: membership.groupId,
      role: membership.role,
    },
    { status: 201 },
  );
}
