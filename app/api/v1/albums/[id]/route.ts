import { prisma } from '@/lib/prisma';
import { toAlbumResponse } from '@/lib/albums';
import { findAccessibleAlbum } from '@/lib/album-access';
import { requireAuth, jsonSuccess, jsonError } from '@/lib/api-utils';
import type { RouteContext } from '@/types/api';

export async function GET(
  _request: Request,
  context: RouteContext<{ id: string }>,
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const { id } = await context.params;

  const accessibleAlbum = await findAccessibleAlbum(
    id,
    userId,
    userEmail ?? '',
  );

  if (!accessibleAlbum) {
    return jsonError('Album not found', 404);
  }

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      group: true,
      photoStorages: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          photos: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });

  if (!album) {
    return jsonError('Album not found', 404);
  }

  return jsonSuccess(toAlbumResponse(album));
}
