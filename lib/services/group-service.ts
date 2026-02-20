import { prisma } from '@/lib/prisma';
import { MembershipRole } from '@prisma/client';

export type GroupListItem = {
  groupId: number;
  groupName: string;
  adminUserId: number;
  myRole: MembershipRole;
};

export async function listUserGroups(userId: number): Promise<GroupListItem[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { group: true },
  });

  return memberships.map((membership) => ({
    groupId: membership.groupId,
    groupName: membership.group.groupName,
    adminUserId: membership.group.adminUserId,
    myRole: membership.role,
  }));
}

export type CreateGroupInput = {
  groupName: string;
  memberEmails?: string[];
};

export type CreateGroupError = { kind: 'MEMBERS_NOT_FOUND'; emails: string[] };

export type GroupData = {
  groupId: number;
  groupName: string;
  adminUserId: number;
};

export type CreateGroupResult =
  | { success: true; data: GroupData }
  | { success: false; error: CreateGroupError };

export async function createGroup(
  adminUserId: number,
  adminEmail: string,
  input: CreateGroupInput,
): Promise<CreateGroupResult> {
  const { groupName } = input;
  const memberEmails =
    input.memberEmails?.map((e) => e.trim().toLowerCase()).filter(Boolean) ??
    [];

  const uniqueMemberEmails = Array.from(
    new Set(memberEmails.filter((email) => email !== adminEmail.toLowerCase())),
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
    return {
      success: false,
      error: { kind: 'MEMBERS_NOT_FOUND', emails: missingEmails },
    };
  }

  const group = await prisma.$transaction(async (tx) => {
    const createdGroup = await tx.group.create({
      data: { groupName, adminUserId },
    });

    await tx.membership.create({
      data: {
        userId: adminUserId,
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

  return {
    success: true,
    data: {
      groupId: group.id,
      groupName: group.groupName,
      adminUserId: group.adminUserId,
    },
  };
}

export async function getGroup(groupId: number, userId: number) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return { error: 'NOT_FOUND' as const };

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: { userId, groupId },
    },
  });

  if (!membership) return { error: 'FORBIDDEN' as const };

  return {
    data: {
      groupId: group.id,
      groupName: group.groupName,
      adminUserId: group.adminUserId,
    },
  };
}

export async function updateGroup(
  groupId: number,
  userId: number,
  groupName: string,
) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return { error: 'NOT_FOUND' as const };
  if (group.adminUserId !== userId) return { error: 'FORBIDDEN' as const };

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: { groupName },
  });

  return {
    data: {
      groupId: updated.id,
      groupName: updated.groupName,
      adminUserId: updated.adminUserId,
    },
  };
}

export async function deleteGroup(groupId: number, userId: number) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return { error: 'NOT_FOUND' as const };
  if (group.adminUserId !== userId) return { error: 'FORBIDDEN' as const };

  await prisma.group.delete({ where: { id: groupId } });

  return { success: true as const };
}
