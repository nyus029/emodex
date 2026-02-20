import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import { calculatePhotoStorageEmo } from '@/lib/emo-value';
import {
  requireAuth,
  parseBody,
  jsonSuccess,
  jsonError,
} from '@/lib/api-utils';
import type { RouteContext } from '@/types/api';

const dividendSchema = z.object({
  action: z.enum(['REINVEST', 'RECEIVE']),
});

export async function POST(
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

  if (!album.plannedDividend || album.plannedDividend > new Date()) {
    return jsonError('Dividend date has not been reached yet', 400);
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, dividendSchema);
  if (parsed.error) return parsed.error;

  const { action } = parsed.data;

  const activeStorages = await prisma.photoStorage.findMany({
    where: { albumId: id, isCompoundActive: true },
  });

  if (activeStorages.length === 0) {
    return jsonError('No active photo storages in this album', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const events = [];

    for (const storage of activeStorages) {
      const emoValue = calculatePhotoStorageEmo({
        photoCount: storage.photoCount,
        baseEmoPerPhoto: storage.baseEmoPerPhoto,
        compoundStartDate: storage.compoundStartDate,
        isCompoundActive: true,
      });

      const previousBaseEmo = storage.baseEmoPerPhoto;

      if (action === 'REINVEST') {
        const newBaseEmo = storage.baseEmoPerPhoto * 2;
        await tx.photoStorage.update({
          where: { id: storage.id },
          data: {
            baseEmoPerPhoto: newBaseEmo,
            compoundStartDate: new Date(),
          },
        });

        const event = await tx.dividendEvent.create({
          data: {
            albumId: id,
            photoStorageId: storage.id,
            action: 'REINVEST',
            emoValueAtEvent: emoValue,
            previousBaseEmo,
            newBaseEmo,
          },
        });
        events.push(event);
      } else {
        await tx.photoStorage.update({
          where: { id: storage.id },
          data: { isCompoundActive: false },
        });

        const event = await tx.dividendEvent.create({
          data: {
            albumId: id,
            photoStorageId: storage.id,
            action: 'RECEIVE',
            emoValueAtEvent: emoValue,
            previousBaseEmo,
            newBaseEmo: 0,
          },
        });
        events.push(event);
      }
    }

    return events;
  });

  return jsonSuccess({
    action,
    processedStorages: result.length,
    events: result.map((e) => ({
      id: e.id,
      photoStorageId: e.photoStorageId,
      emoValueAtEvent: e.emoValueAtEvent,
      previousBaseEmo: e.previousBaseEmo,
      newBaseEmo: e.newBaseEmo,
    })),
  });
}
