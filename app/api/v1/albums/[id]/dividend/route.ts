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

const RECEIVE_COOLDOWN_DAYS = 7;

const dividendSchema = z.object({
  action: z.enum(['REINVEST', 'RECEIVE']),
  photoStorageId: z.string().optional(),
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

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, dividendSchema);
  if (parsed.error) return parsed.error;

  const { action, photoStorageId } = parsed.data;

  let activeStorages;

  if (photoStorageId) {
    const storage = await prisma.photoStorage.findFirst({
      where: {
        id: photoStorageId,
        albumId: id,
        ...(action === 'RECEIVE' ? { isCompoundActive: true } : {}),
      },
    });
    if (!storage) {
      return jsonError('Photo storage not found or not active', 404);
    }

    if (action === 'RECEIVE') {
      const cooldownSince = new Date();
      cooldownSince.setDate(cooldownSince.getDate() - RECEIVE_COOLDOWN_DAYS);
      const recentReceive = await prisma.dividendEvent.findFirst({
        where: {
          photoStorageId,
          action: 'RECEIVE',
          executedAt: { gte: cooldownSince },
        },
      });
      if (recentReceive) {
        return jsonError(
          'This storage received a dividend recently. Please wait 7 days.',
          409,
        );
      }
    }

    activeStorages = [storage];
  } else {
    activeStorages = await prisma.photoStorage.findMany({
      where: { albumId: id, isCompoundActive: true },
    });
  }

  if (activeStorages.length === 0) {
    return jsonError('No active photo storages in this album', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const events: Array<{
      event: Awaited<ReturnType<typeof tx.dividendEvent.create>>;
      storageName: string;
    }> = [];

    for (const storage of activeStorages) {
      if (action === 'RECEIVE') {
        const cooldownSince = new Date();
        cooldownSince.setDate(cooldownSince.getDate() - RECEIVE_COOLDOWN_DAYS);
        const recentReceive = await tx.dividendEvent.findFirst({
          where: {
            photoStorageId: storage.id,
            action: 'RECEIVE',
            executedAt: { gte: cooldownSince },
          },
        });
        if (recentReceive) continue;
      }

      let emoValue: number;
      if (action === 'REINVEST' && !storage.isCompoundActive) {
        const lastReceive = await tx.dividendEvent.findFirst({
          where: { photoStorageId: storage.id, action: 'RECEIVE' },
          orderBy: { executedAt: 'desc' },
        });
        emoValue = lastReceive?.emoValueAtEvent ?? 0;
      } else {
        emoValue = calculatePhotoStorageEmo({
          photoCount: storage.photoCount,
          baseEmoPerPhoto: storage.baseEmoPerPhoto,
          compoundStartDate: storage.compoundStartDate,
          isCompoundActive: true,
        });
      }

      const previousBaseEmo = storage.baseEmoPerPhoto;

      if (action === 'REINVEST') {
        const newBaseEmo = storage.baseEmoPerPhoto * 2;
        await tx.photoStorage.update({
          where: { id: storage.id },
          data: {
            baseEmoPerPhoto: newBaseEmo,
            compoundStartDate: new Date(),
            isCompoundActive: true,
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
        events.push({ event, storageName: storage.name });
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
        events.push({ event, storageName: storage.name });
      }
    }

    return events;
  });

  return jsonSuccess({
    action,
    processedStorages: result.length,
    events: result.map(({ event: e, storageName }) => ({
      id: e.id,
      photoStorageId: e.photoStorageId,
      photoStorageName: storageName,
      emoValueAtEvent: e.emoValueAtEvent,
      previousBaseEmo: e.previousBaseEmo,
      newBaseEmo: e.newBaseEmo,
    })),
  });
}
