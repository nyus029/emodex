import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** ブースト1回あたりの上昇倍率 (50%) */
export const BOOST_MULTIPLIER = 0.5;

/**
 * ベースエモ価にブーストを適用した値を返す。
 * formula: baseEmo × (1 + BOOST_MULTIPLIER × boostCount)
 */
export function calculateBoostedEmo(
  baseEmo: number,
  boostCount: number,
): number {
  if (boostCount <= 0) return baseEmo;
  return baseEmo * (1 + BOOST_MULTIPLIER * boostCount);
}

/**
 * 当日の MoodRecord から boostedAlbumIds を集計し、
 * albumId ごとのブースト回数を返す。
 */
export async function getTodayBoostCounts(
  albumIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (albumIds.length === 0) return counts;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const records = await prisma.moodRecord.findMany({
    where: {
      createdAt: { gte: todayStart },
      boostedAlbumIds: { not: Prisma.JsonNull },
    },
    select: { boostedAlbumIds: true },
  });

  const targetSet = new Set(albumIds);

  for (const record of records) {
    const ids = record.boostedAlbumIds;
    if (!Array.isArray(ids)) continue;

    for (const id of ids) {
      if (typeof id === 'string' && targetSet.has(id)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }

  return counts;
}
