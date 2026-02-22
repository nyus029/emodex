import { prisma } from '@/lib/prisma';
import {
  calculateAlbumEmoWithBoostAndShock,
  calculateDayOverDayFull,
  type StorageParams,
} from '@/lib/emo-value';
import { requireAuth, jsonSuccess, roundEmo } from '@/lib/api-utils';
import { getTodayBoostScores } from '@/lib/emo-boost';
import {
  getActiveShockEvents,
  calculateShockMultiplier,
} from '@/lib/emo-shock';

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
  const allAlbumIds = allAlbums.map((a) => a.id);
  const boostScores = await getTodayBoostScores(allAlbumIds);
  const shockEventsMap = await getActiveShockEvents(allAlbumIds);

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const allStorages: StorageParams[] = allAlbums.flatMap(
    (a) => a.photoStorages,
  );
  const totalBoost = Array.from(boostScores.values()).reduce(
    (sum, c) => sum + c,
    0,
  );

  const allShockEvents = allAlbumIds.flatMap(
    (id) => shockEventsMap.get(id) ?? [],
  );
  const totalShockMul = calculateShockMultiplier(allShockEvents, now);
  const totalShockMulYesterday = calculateShockMultiplier(
    allShockEvents,
    yesterday,
  );

  const totalEmoValue = roundEmo(
    calculateAlbumEmoWithBoostAndShock(allStorages, totalBoost, totalShockMul),
  );
  const totalDayOverDayChange = calculateDayOverDayFull(
    allStorages,
    totalBoost,
    totalShockMul,
    totalShockMulYesterday,
  );

  const albums = allAlbums
    .map((album) => {
      const storages: StorageParams[] = album.photoStorages;
      const boost = boostScores.get(album.id) ?? 0;
      const events = shockEventsMap.get(album.id) ?? [];
      const shockMul = calculateShockMultiplier(events, now);
      const shockMulYesterday = calculateShockMultiplier(events, yesterday);
      const emoValue = roundEmo(
        calculateAlbumEmoWithBoostAndShock(storages, boost, shockMul),
      );
      const dayOverDayChange = calculateDayOverDayFull(
        storages,
        boost,
        shockMul,
        shockMulYesterday,
      );
      return {
        id: album.id,
        name: album.name,
        albumType: album.albumType,
        groupName: album.group?.groupName ?? null,
        emoValue,
        dayOverDayChange,
        ...(boost > 0 ? { emoBoostCount: 1 } : {}),
        ...(dayOverDayChange.value < 0 ? { isDecline: true } : {}),
      };
    })
    .filter((a) => a.emoValue > 0);

  return jsonSuccess({ totalEmoValue, totalDayOverDayChange, albums });
}
