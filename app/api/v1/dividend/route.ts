import { prisma } from '@/lib/prisma';
import { findUserAlbumsWithShared } from '@/lib/album-queries';
import { calculatePhotoStorageEmo } from '@/lib/emo-value';
import { requireAuth, jsonSuccess, roundEmo } from '@/lib/api-utils';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const albums = await findUserAlbumsWithShared(
    userId,
    userEmail,
    async (where) => {
      const own = await prisma.album.findMany({
        where: {
          ...where.own,
          plannedDividend: { not: null },
        },
        include: {
          photoStorages: {
            where: { isCompoundActive: true },
          },
          dividendEvents: {
            orderBy: { executedAt: 'desc' },
          },
        },
      });
      const shared = await prisma.album.findMany({
        where: {
          ...where.shared,
          plannedDividend: { not: null },
        },
        include: {
          photoStorages: {
            where: { isCompoundActive: true },
          },
          dividendEvents: {
            orderBy: { executedAt: 'desc' },
          },
        },
      });
      return { own, shared };
    },
  );

  const now = new Date();
  const pending: Array<{
    albumId: string;
    albumName: string;
    plannedDividend: string;
    photoStorageId: string;
    photoStorageName: string;
    photoCount: number;
    emoValue: number;
    tags: string[];
  }> = [];

  const albumIds = albums.map((a) => a.id);

  for (const album of albums) {
    if (!album.plannedDividend || album.plannedDividend > now) continue;

    for (const storage of album.photoStorages) {
      const hasEvent = album.dividendEvents.some(
        (e) =>
          e.photoStorageId === storage.id &&
          e.executedAt >= album.plannedDividend!,
      );
      if (hasEvent) continue;

      const emoValue = calculatePhotoStorageEmo({
        photoCount: storage.photoCount,
        baseEmoPerPhoto: storage.baseEmoPerPhoto,
        compoundStartDate: storage.compoundStartDate,
        isCompoundActive: true,
      });

      pending.push({
        albumId: album.id,
        albumName: album.name,
        plannedDividend: album.plannedDividend.toISOString(),
        photoStorageId: storage.id,
        photoStorageName: storage.name,
        photoCount: storage.photoCount,
        emoValue: roundEmo(emoValue),
        tags: (storage.tags as string[]) ?? [],
      });
    }
  }

  const completedEvents = await prisma.dividendEvent.findMany({
    where: { albumId: { in: albumIds } },
    include: {
      album: { select: { id: true, name: true } },
      photoStorage: { select: { id: true, name: true } },
    },
    orderBy: { executedAt: 'desc' },
  });

  const completed = completedEvents.map((e) => ({
    dividendEventId: e.id,
    albumId: e.album.id,
    albumName: e.album.name,
    photoStorageId: e.photoStorage.id,
    photoStorageName: e.photoStorage.name,
    action: e.action as 'REINVEST' | 'RECEIVE',
    emoValueAtEvent: roundEmo(e.emoValueAtEvent),
    executedAt: e.executedAt.toISOString(),
  }));

  return jsonSuccess({ pending, completed });
}
