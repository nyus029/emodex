import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import { requireAuth, jsonSuccess, jsonError } from '@/lib/api-utils';
import type { RouteContext } from '@/types/api';
import { isDbMockEnabled } from '@/lib/db-mock';

export async function GET(
  _request: Request,
  context: RouteContext<{ eventId: string }>,
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const { eventId } = await context.params;

  if (isDbMockEnabled()) {
    return jsonError('Dividend event is not available in mock mode', 404);
  }

  const event = await prisma.dividendEvent.findUnique({
    where: { id: eventId },
    include: {
      album: { select: { id: true, name: true } },
      photoStorage: {
        include: {
          photos: {
            select: {
              id: true,
              fileName: true,
              blobUrl: true,
              contentType: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    return jsonError('Dividend event not found', 404);
  }

  const album = await findAccessibleAlbum(
    event.albumId,
    userId,
    userEmail ?? '',
  );
  if (!album) {
    return jsonError('Dividend event not found', 404);
  }

  return jsonSuccess({
    dividendEvent: {
      id: event.id,
      action: event.action,
      emoValueAtEvent: event.emoValueAtEvent,
      previousBaseEmo: event.previousBaseEmo,
      newBaseEmo: event.newBaseEmo,
      executedAt: event.executedAt.toISOString(),
    },
    album: {
      id: event.album.id,
      name: event.album.name,
    },
    photoStorage: {
      id: event.photoStorage.id,
      name: event.photoStorage.name,
      photoCount: event.photoStorage.photoCount,
      tags: (event.photoStorage.tags as string[]) ?? [],
      photos: event.photoStorage.photos.map((p) => ({
        id: p.id,
        fileName: p.fileName,
        blobUrl: p.blobUrl,
        contentType: p.contentType,
      })),
    },
  });
}
