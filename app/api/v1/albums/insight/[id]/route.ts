import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import {
  calculateAlbumEmoWithBoostAndShock,
  calculateDayOverDayFull,
  type StorageParams,
} from '@/lib/emo-value';
import { requireAuth, jsonSuccess, jsonError, roundEmo } from '@/lib/api-utils';
import { getTodayBoostScores } from '@/lib/emo-boost';
import {
  getActiveShockEvents,
  calculateShockMultiplier,
} from '@/lib/emo-shock';
import type { RouteContext } from '@/types/api';

export async function GET(
  _request: Request,
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

  const photoStorages = await prisma.photoStorage.findMany({
    where: { albumId: id, isCompoundActive: true },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      storagePath: true,
      photoCount: true,
      baseEmoPerPhoto: true,
      compoundStartDate: true,
      isCompoundActive: true,
    },
  });

  const storages: StorageParams[] = photoStorages;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const boostScores = await getTodayBoostScores([id]);
  const boost = boostScores.get(id) ?? 0;

  const shockEventsMap = await getActiveShockEvents([id]);
  const events = shockEventsMap.get(id) ?? [];
  const shockMul = calculateShockMultiplier(events, now);
  const shockMulYesterday = calculateShockMultiplier(events, yesterday);

  const emoValue = calculateAlbumEmoWithBoostAndShock(
    storages,
    boost,
    shockMul,
  );
  const dayOverDayChange = calculateDayOverDayFull(
    storages,
    boost,
    shockMul,
    shockMulYesterday,
  );

  return jsonSuccess({
    albumBasicInfo: {
      name: album.name,
      createdAt: album.createdAt.toISOString().split('T')[0],
      plannedDividend: album.plannedDividend?.toISOString() ?? null,
    },
    emoValueInfo: {
      emoValue: roundEmo(emoValue),
      dayOverDayChange,
      ...(dayOverDayChange.value < 0 ? { isDecline: true } : {}),
    },
    photoStorages: photoStorages.map((s) => ({
      id: s.id,
      name: s.name,
      storagePath: s.storagePath,
      photoCount: s.photoCount,
    })),
  });
}
