import { prisma } from '@/lib/prisma';
import type { StorageParams } from '@/lib/emo-value';

export async function findUserAlbumsWithShared<
  T extends { userId: string; albumType: string; groupId: number | null },
>(
  userId: string,
  userEmail: string | undefined,
  queryFn: (where: {
    own: { userId: string };
    shared: {
      albumType: 'SHARED';
      groupId: { in: number[] };
      NOT: { userId: string };
    };
  }) => Promise<{ own: T[]; shared: T[] }>,
): Promise<T[]> {
  const ownWhere = { userId };
  let sharedWhere = null;

  if (userEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (dbUser) {
      const memberships = await prisma.membership.findMany({
        where: { userId: dbUser.id },
        select: { groupId: true },
      });
      const groupIds = memberships.map((m) => m.groupId);

      if (groupIds.length > 0) {
        sharedWhere = {
          albumType: 'SHARED' as const,
          groupId: { in: groupIds },
          NOT: { userId },
        };
      }
    }
  }

  const result = await queryFn({
    own: ownWhere,
    shared: sharedWhere ?? {
      albumType: 'SHARED' as const,
      groupId: { in: [] },
      NOT: { userId },
    },
  });

  return sharedWhere ? [...result.own, ...result.shared] : result.own;
}

export function toStorageParams(
  ps: Pick<
    StorageParams,
    'photoCount' | 'baseEmoPerPhoto' | 'compoundStartDate' | 'isCompoundActive'
  >,
): StorageParams {
  return {
    photoCount: ps.photoCount,
    baseEmoPerPhoto: ps.baseEmoPerPhoto,
    compoundStartDate: ps.compoundStartDate,
    isCompoundActive: ps.isCompoundActive,
  };
}
