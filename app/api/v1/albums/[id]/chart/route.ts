import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import { calculateAlbumEmo, type StorageParams } from '@/lib/emo-value';

const PERIOD_DAYS: Record<string, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const album = await findAccessibleAlbum(id, userId, userEmail ?? '');
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? '1M';
  if (!['1W', '1M', '3M', '1Y', 'ALL'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
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

  const data = Array.from(aggregated.entries()).map(([time, value]) => ({
    time,
    value: Math.round(value * 100) / 100,
  }));

  const photoStorages = await prisma.photoStorage.findMany({
    where: { albumId: id },
    select: {
      photoCount: true,
      baseEmoPerPhoto: true,
      compoundStartDate: true,
      isCompoundActive: true,
    },
  });
  const storages: StorageParams[] = photoStorages.map((ps) => ({
    photoCount: ps.photoCount,
    baseEmoPerPhoto: ps.baseEmoPerPhoto,
    compoundStartDate: ps.compoundStartDate,
    isCompoundActive: ps.isCompoundActive,
  }));

  const todayStr = now.toISOString().split('T')[0];
  const todayValue = calculateAlbumEmo(storages, now);
  const lastEntry = data[data.length - 1];
  if (!lastEntry || lastEntry.time !== todayStr) {
    data.push({
      time: todayStr,
      value: Math.round(todayValue * 100) / 100,
    });
  }

  return NextResponse.json({ period, data }, { status: 200 });
}
