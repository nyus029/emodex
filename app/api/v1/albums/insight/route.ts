import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import {
  calculateAlbumEmo,
  calculateDayOverDayChange,
  type StorageParams,
} from '@/lib/emo-value';

export async function GET() {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownAlbums = await prisma.album.findMany({
    where: { userId },
    include: {
      group: true,
      photoStorages: {
        select: {
          photoCount: true,
          baseEmoPerPhoto: true,
          compoundStartDate: true,
          isCompoundActive: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let sharedAlbums: typeof ownAlbums = [];
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
        sharedAlbums = await prisma.album.findMany({
          where: {
            albumType: 'SHARED',
            groupId: { in: groupIds },
            NOT: { userId },
          },
          include: {
            group: true,
            photoStorages: {
              select: {
                photoCount: true,
                baseEmoPerPhoto: true,
                compoundStartDate: true,
                isCompoundActive: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }
  }

  const allAlbums = [...ownAlbums, ...sharedAlbums];
  const allStorages: StorageParams[] = allAlbums.flatMap((a) =>
    a.photoStorages.map((ps) => ({
      photoCount: ps.photoCount,
      baseEmoPerPhoto: ps.baseEmoPerPhoto,
      compoundStartDate: ps.compoundStartDate,
      isCompoundActive: ps.isCompoundActive,
    })),
  );

  const totalEmoValue = Math.round(calculateAlbumEmo(allStorages) * 100) / 100;
  const totalDayOverDayChange = calculateDayOverDayChange(allStorages);

  const albums = allAlbums.map((album) => {
    const storages: StorageParams[] = album.photoStorages.map((ps) => ({
      photoCount: ps.photoCount,
      baseEmoPerPhoto: ps.baseEmoPerPhoto,
      compoundStartDate: ps.compoundStartDate,
      isCompoundActive: ps.isCompoundActive,
    }));

    return {
      id: album.id,
      name: album.name,
      albumType: album.albumType,
      groupName: album.group?.groupName ?? null,
      emoValue: Math.round(calculateAlbumEmo(storages) * 100) / 100,
      dayOverDayChange: calculateDayOverDayChange(storages),
    };
  });

  return NextResponse.json(
    { totalEmoValue, totalDayOverDayChange, albums },
    { status: 200 },
  );
}
