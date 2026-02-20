import { prisma } from '@/lib/prisma';
import { MembershipRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, normalizeEmail, requireUser } from './common';

const createGroupSchema = z.object({
  groupName: z.string().trim().min(1),
  memberEmails: z.array(z.string().trim().email()).optional(),
});

export async function GET(request: NextRequest) {
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: currentUser.user.id },
    include: { group: true },
  });

  const groups = memberships.map((membership) => ({
    groupId: membership.groupId,
    groupName: membership.group.groupName,
    adminUserId: membership.group.adminUserId,
    myRole: membership.role,
  }));

  return NextResponse.json(groups, { status: 200 });
}

export async function POST(request: NextRequest) {
  const currentUser = await requireUser(request);
  if ('error' in currentUser) {
    return currentUser.error;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createGroupSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError('Invalid request body', 400);
  }

  const { groupName } = parsed.data;
  const memberEmails =
    parsed.data.memberEmails?.map(normalizeEmail).filter(Boolean) ?? [];

  const uniqueMemberEmails = Array.from(
    new Set(
      memberEmails.filter(
        (email) => email !== currentUser.user.email.toLowerCase(),
      ),
    ),
  );

  const membersToAdd =
    uniqueMemberEmails.length > 0
      ? await prisma.user.findMany({
          where: { email: { in: uniqueMemberEmails } },
          select: { id: true, email: true },
        })
      : [];

  const foundEmailSet = new Set(membersToAdd.map((member) => member.email));
  const missingEmails = uniqueMemberEmails.filter(
    (email) => !foundEmailSet.has(email),
  );

  if (missingEmails.length > 0) {
    return jsonError(
      `Users not found for emails: ${missingEmails.join(', ')}`,
      400,
    );
  }

  const group = await prisma.$transaction(async (tx) => {
    const createdGroup = await tx.group.create({
      data: { groupName, adminUserId: currentUser.user.id },
    });

    await tx.membership.create({
      data: {
        userId: currentUser.user.id,
        groupId: createdGroup.id,
        role: MembershipRole.ADMIN,
      },
    });

    if (membersToAdd.length > 0) {
      await tx.membership.createMany({
        data: membersToAdd.map((member) => ({
          userId: member.id,
          groupId: createdGroup.id,
          role: MembershipRole.MEMBER,
        })),
        skipDuplicates: true,
      });
    }

    return createdGroup;
  });

  return NextResponse.json(
    {
      groupId: group.id,
      groupName: group.groupName,
      adminUserId: group.adminUserId,
    },
    { status: 201 },
  );
}
