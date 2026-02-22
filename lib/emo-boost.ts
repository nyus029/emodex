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

interface BoostScore {
  albumId: string;
  relevanceScore: number;
}

/**
 * 当日の MoodRecord から boostedAlbumScores を集計し、
 * albumId ごとの可変ブーストの合計 relevanceScore を返す。
 * boostedAlbumScores がない古いレコードは relevanceScore = 1.0 にフォールバック。
 */
export async function getTodayBoostScores(
  albumIds: string[],
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (albumIds.length === 0) return scores;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const records = await prisma.moodRecord.findMany({
    where: {
      createdAt: { gte: todayStart },
      OR: [
        { boostedAlbumScores: { not: Prisma.JsonNull } },
        { boostedAlbumIds: { not: Prisma.JsonNull } },
      ],
    },
    select: { boostedAlbumIds: true, boostedAlbumScores: true },
  });

  const targetSet = new Set(albumIds);

  for (const record of records) {
    const albumScores = record.boostedAlbumScores;
    if (Array.isArray(albumScores)) {
      for (const entry of albumScores) {
        const item = entry as unknown as BoostScore;
        if (typeof item?.albumId === 'string' && targetSet.has(item.albumId)) {
          const rel =
            typeof item.relevanceScore === 'number' ? item.relevanceScore : 1.0;
          scores.set(
            item.albumId,
            (scores.get(item.albumId) ?? 0) + rel * BOOST_MULTIPLIER,
          );
        }
      }
      continue;
    }

    const ids = record.boostedAlbumIds;
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (typeof id === 'string' && targetSet.has(id)) {
          scores.set(id, (scores.get(id) ?? 0) + 1.0 * BOOST_MULTIPLIER);
        }
      }
    }
  }

  return scores;
}
