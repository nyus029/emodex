import { prisma } from '@/lib/prisma';
import { MembershipRole } from '@prisma/client';

export type MemberListItem = {
  userId: number;
  email: string;
  role: MembershipRole;
};

export async function listGroupMembers(
  groupId: number,
  userId: number,
): Promise<{ error: 'NOT_FOUND' | 'FORBIDDEN' } | { data: MemberListItem[] }> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return { error: 'NOT_FOUND' };

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: { userId, groupId },
    },
  });

  if (!membership) return { error: 'FORBIDDEN' };

  const members = await prisma.membership.findMany({
    where: { groupId },
    include: { user: true },
  });

  return {
    data: members.map((member) => ({
      userId: member.userId,
      email: member.user.email,
      role: member.role,
    })),
  };
}

export type AddMemberInput = {
  email: string;
  role: MembershipRole;
};

export type AddMemberError =
  | 'GROUP_NOT_FOUND'
  | 'FORBIDDEN'
  | 'USER_NOT_FOUND'
  | 'ALREADY_EXISTS';

export type MemberData = {
  userId: number;
  groupId: number;
  role: MembershipRole;
};

export async function addGroupMember(
  groupId: number,
  adminUserId: number,
  input: AddMemberInput,
): Promise<{ error: AddMemberError } | { data: MemberData }> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return { error: 'GROUP_NOT_FOUND' };
  if (group.adminUserId !== adminUserId) return { error: 'FORBIDDEN' };

  const targetEmail = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) return { error: 'USER_NOT_FOUND' };

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_groupId: { userId: user.id, groupId },
    },
  });

  if (existingMembership) return { error: 'ALREADY_EXISTS' };

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      groupId,
      role: input.role,
    },
  });

  return {
    data: {
      userId: membership.userId,
      groupId: membership.groupId,
      role: membership.role,
    },
  };
}

export type UpdateMemberError =
  | 'GROUP_NOT_FOUND'
  | 'FORBIDDEN'
  | 'MEMBERSHIP_NOT_FOUND'
  | 'CANNOT_DEMOTE_ADMIN';

export async function updateMemberRole(
  groupId: number,
  adminUserId: number,
  targetUserId: number,
  role: MembershipRole,
): Promise<{ error: UpdateMemberError } | { data: MemberData }> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return { error: 'GROUP_NOT_FOUND' };
  if (group.adminUserId !== adminUserId) return { error: 'FORBIDDEN' };

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: { userId: targetUserId, groupId },
    },
  });

  if (!membership) return { error: 'MEMBERSHIP_NOT_FOUND' };

  if (role === MembershipRole.MEMBER && targetUserId === group.adminUserId) {
    return { error: 'CANNOT_DEMOTE_ADMIN' };
  }

  const updatedMembership = await prisma.$transaction(async (tx) => {
    if (role === MembershipRole.ADMIN && targetUserId !== group.adminUserId) {
      await tx.membership.update({
        where: {
          userId_groupId: { userId: group.adminUserId, groupId },
        },
        data: { role: MembershipRole.MEMBER },
      });

      await tx.group.update({
        where: { id: groupId },
        data: { adminUserId: targetUserId },
      });
    }

    return tx.membership.update({
      where: {
        userId_groupId: { userId: targetUserId, groupId },
      },
      data: { role },
    });
  });

  return {
    data: {
      userId: updatedMembership.userId,
      groupId: updatedMembership.groupId,
      role: updatedMembership.role,
    },
  };
}

export type RemoveMemberError =
  | 'GROUP_NOT_FOUND'
  | 'FORBIDDEN'
  | 'CANNOT_REMOVE_ADMIN'
  | 'MEMBERSHIP_NOT_FOUND';

export async function removeGroupMember(
  groupId: number,
  adminUserId: number,
  targetUserId: number,
): Promise<{ error: RemoveMemberError } | { success: true }> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return { error: 'GROUP_NOT_FOUND' };
  if (group.adminUserId !== adminUserId) return { error: 'FORBIDDEN' };
  if (targetUserId === group.adminUserId)
    return { error: 'CANNOT_REMOVE_ADMIN' };

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: { userId: targetUserId, groupId },
    },
  });

  if (!membership) return { error: 'MEMBERSHIP_NOT_FOUND' };

  await prisma.membership.delete({
    where: {
      userId_groupId: { userId: targetUserId, groupId },
    },
  });

  return { success: true };
}
