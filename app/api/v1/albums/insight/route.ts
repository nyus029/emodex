import { prisma } from '@/lib/prisma';
import {
  calculateAlbumEmo,
  calculateDayOverDayChange,
  type StorageParams,
} from '@/lib/emo-value';
import { requireAuth, jsonSuccess, roundEmo } from '@/lib/api-utils';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

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
  const allStorages: StorageParams[] = allAlbums.flatMap(
    (a) => a.photoStorages,
  );

  const totalEmoValue = roundEmo(calculateAlbumEmo(allStorages));
  const totalDayOverDayChange = calculateDayOverDayChange(allStorages);

  const albums = allAlbums.map((album) => {
    const storages: StorageParams[] = album.photoStorages;

    return {
      id: album.id,
      name: album.name,
      albumType: album.albumType,
      groupName: album.group?.groupName ?? null,
      emoValue: roundEmo(calculateAlbumEmo(storages)),
      dayOverDayChange: calculateDayOverDayChange(storages),
    };
  });

  return jsonSuccess({ totalEmoValue, totalDayOverDayChange, albums });
}
