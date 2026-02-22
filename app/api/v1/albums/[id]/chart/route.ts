import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import {
  calculateAlbumEmoWithBoostAndShock,
  type StorageParams,
} from '@/lib/emo-value';
import { requireAuth, jsonSuccess, jsonError, roundEmo } from '@/lib/api-utils';
import { getTodayBoostScores } from '@/lib/emo-boost';
import {
  calculateShockMultiplier,
  isInDecline,
  type ShockEvent,
} from '@/lib/emo-shock';
import type { RouteContext } from '@/types/api';

const PERIOD_DAYS: Record<string, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

export async function GET(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const { id } = await context.params;

  const album = await findAccessibleAlbum(id, userId, userEmail ?? '');
  if (!album) {
    return jsonError('Album not found', 404);
  }

  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? '1M';
  if (!['1W', '1M', '3M', '1Y', 'ALL'].includes(period)) {
    return jsonError('Invalid period', 400);
  }

  const now = new Date();
  const sinceDate =
    period === 'ALL'
      ? null
      : new Date(now.getTime() - PERIOD_DAYS[period] * 86_400_000);

  const snapshotWhere: { albumId: string; snapshotDate?: { gte: Date } } = {
    albumId: id,
  };
  if (sinceDate) {
    snapshotWhere.snapshotDate = { gte: sinceDate };
  }

  const rawSnapshots = await prisma.emoSnapshot.findMany({
    where: {
      photoStorage: { albumId: id },
      ...(sinceDate ? { snapshotDate: { gte: sinceDate } } : {}),
    },
    select: {
      snapshotDate: true,
      emoValue: true,
    },
    orderBy: { snapshotDate: 'asc' },
  });

  const aggregated = new Map<string, number>();
  for (const snap of rawSnapshots) {
    const dateStr = snap.snapshotDate.toISOString().split('T')[0];
    aggregated.set(dateStr, (aggregated.get(dateStr) ?? 0) + snap.emoValue);
  }

  const shockRecords = await prisma.emoShockEvent.findMany({
    where: {
      albumId: id,
      ...(sinceDate ? { shockedAt: { gte: sinceDate } } : {}),
    },
    select: {
      shockRate: true,
      shockedAt: true,
      recoveryDays: true,
    },
    orderBy: { shockedAt: 'asc' },
  });

  const shockEvents: ShockEvent[] = shockRecords.map((r) => ({
    shockRate: r.shockRate,
    shockedAt: r.shockedAt,
    recoveryDays: r.recoveryDays,
  }));

  const data = Array.from(aggregated.entries()).map(([time, value]) => {
    const dateObj = new Date(time + 'T12:00:00Z');
    const shockMul = calculateShockMultiplier(shockEvents, dateObj);
    const declined = isInDecline(shockEvents, dateObj);
    return {
      time,
      value: roundEmo(value * shockMul),
      ...(declined ? { isDecline: true as const } : {}),
    };
  });

  const photoStorages = await prisma.photoStorage.findMany({
    where: { albumId: id },
    select: {
      photoCount: true,
      baseEmoPerPhoto: true,
      compoundStartDate: true,
      isCompoundActive: true,
    },
  });
  const storages: StorageParams[] = photoStorages;

  const boostScores = await getTodayBoostScores([id]);
  const boost = boostScores.get(id) ?? 0;
  const todayShockMul = calculateShockMultiplier(shockEvents, now);
  const todayDecline = isInDecline(shockEvents, now);

  const todayStr = now.toISOString().split('T')[0];
  const todayValue = calculateAlbumEmoWithBoostAndShock(
    storages,
    boost,
    todayShockMul,
    now,
  );
  const lastEntry = data[data.length - 1];
  if (!lastEntry || lastEntry.time !== todayStr) {
    data.push({
      time: todayStr,
      value: roundEmo(todayValue),
      ...(todayDecline ? { isDecline: true as const } : {}),
    });
  } else {
    lastEntry.value = roundEmo(todayValue);
    if (todayDecline) {
      (lastEntry as { isDecline?: boolean }).isDecline = true;
    }
  }

  return jsonSuccess({ period, data });
}
