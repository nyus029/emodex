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

  type AlbumWithChange = {
    id: string;
    name: string;
    emoValue: number;
    changePercentage: number;
  };

  const albumsWithChange: AlbumWithChange[] = allAlbums
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
        emoValue,
        changePercentage: dayOverDayChange.percentage,
      };
    })
    .filter((a) => a.emoValue > 0);

  const risers = albumsWithChange
    .filter((a) => a.changePercentage > 0)
    .sort((a, b) => b.changePercentage - a.changePercentage)
    .slice(0, 3);

  const fallers = albumsWithChange
    .filter((a) => a.changePercentage < 0)
    .sort((a, b) => a.changePercentage - b.changePercentage)
    .slice(0, 3);

  const moverIds = [...risers, ...fallers].map((a) => a.id);

  if (moverIds.length === 0) {
    return jsonSuccess({ risers: [], fallers: [] });
  }

  // Fetch 1-week snapshots for mover albums
  const oneWeekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const rawSnapshots = await prisma.emoSnapshot.findMany({
    where: {
      photoStorage: { albumId: { in: moverIds } },
      snapshotDate: { gte: oneWeekAgo },
    },
    select: {
      snapshotDate: true,
      emoValue: true,
      photoStorage: { select: { albumId: true } },
    },
    orderBy: { snapshotDate: 'asc' },
  });

  // Aggregate snapshots per album per date
  const albumSnapshots = new Map<string, Map<string, number>>();
  for (const snap of rawSnapshots) {
    const albumId = snap.photoStorage.albumId;
    const dateStr = snap.snapshotDate.toISOString().split('T')[0];
    if (!albumSnapshots.has(albumId)) {
      albumSnapshots.set(albumId, new Map());
    }
    const dateMap = albumSnapshots.get(albumId)!;
    dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + snap.emoValue);
  }

  // Fetch shock events for chart rendering
  const shockRecords = await prisma.emoShockEvent.findMany({
    where: {
      albumId: { in: moverIds },
      shockedAt: { gte: oneWeekAgo },
    },
    select: {
      albumId: true,
      shockRate: true,
      shockedAt: true,
      recoveryDays: true,
    },
    orderBy: { shockedAt: 'asc' },
  });

  const albumShockEvents = new Map<
    string,
    { shockRate: number; shockedAt: Date; recoveryDays: number }[]
  >();
  for (const r of shockRecords) {
    const existing = albumShockEvents.get(r.albumId) ?? [];
    existing.push({
      shockRate: r.shockRate,
      shockedAt: r.shockedAt,
      recoveryDays: r.recoveryDays,
    });
    albumShockEvents.set(r.albumId, existing);
  }

  function buildChartData(albumId: string): { time: string; value: number }[] {
    const dateMap = albumSnapshots.get(albumId) ?? new Map<string, number>();
    const events = albumShockEvents.get(albumId) ?? [];

    const data = Array.from(dateMap.entries()).map(([time, value]) => {
      const dateObj = new Date(time + 'T12:00:00Z');
      const shockMul = calculateShockMultiplier(events, dateObj);
      return { time, value: roundEmo(value * shockMul) };
    });

    // Add today's realtime value
    const album = allAlbums.find((a) => a.id === albumId);
    if (album) {
      const storages: StorageParams[] = album.photoStorages;
      const boost = boostScores.get(albumId) ?? 0;
      const activeEvents = shockEventsMap.get(albumId) ?? [];
      const todayShockMul = calculateShockMultiplier(activeEvents, now);
      const todayStr = now.toISOString().split('T')[0];
      const todayValue = roundEmo(
        calculateAlbumEmoWithBoostAndShock(storages, boost, todayShockMul, now),
      );
      const lastEntry = data[data.length - 1];
      if (!lastEntry || lastEntry.time !== todayStr) {
        data.push({ time: todayStr, value: todayValue });
      } else {
        lastEntry.value = todayValue;
      }
    }

    return data;
  }

  const risersResult = risers.map((a) => ({
    ...a,
    chartData: buildChartData(a.id),
  }));

  const fallersResult = fallers.map((a) => ({
    ...a,
    chartData: buildChartData(a.id),
  }));

  return jsonSuccess({ risers: risersResult, fallers: fallersResult });
}
