import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import {
  calculateAlbumEmo,
  calculateDayOverDayChange,
  type StorageParams,
} from '@/lib/emo-value';
import { requireAuth, jsonSuccess, jsonError, roundEmo } from '@/lib/api-utils';
import type { RouteContext } from '@/types/api';
import { getMockAlbumInsight, isDbMockEnabled } from '@/lib/db-mock';

export async function GET(
  _request: Request,
  context: RouteContext<{ id: string }>,
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const { id } = await context.params;

  if (isDbMockEnabled()) {
    const mockInsight = getMockAlbumInsight(id);
    if (!mockInsight) {
      return jsonError('Album not found', 404);
    }
    return jsonSuccess(mockInsight);
  }

  const album = await findAccessibleAlbum(id, userId, userEmail ?? '');
  if (!album) {
    return jsonError('Album not found', 404);
  }

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

  const emoValue = calculateAlbumEmo(storages);
  const dayOverDayChange = calculateDayOverDayChange(storages);

  return jsonSuccess({
    albumBasicInfo: {
      name: album.name,
      createdAt: album.createdAt.toISOString().split('T')[0],
      plannedDividend: album.plannedDividend?.toISOString() ?? null,
    },
    emoValueInfo: {
      emoValue: roundEmo(emoValue),
      dayOverDayChange,
    },
  });
}
