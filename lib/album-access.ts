import type { Album, Group } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AlbumWithGroup = Album & {
  group?: Group | null;
};

export async function findAccessibleAlbum(
  albumId: string,
  authSub: string,
  authEmail: string,
): Promise<AlbumWithGroup | null> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: { group: true },
  });

  if (!album) return null;

  if (album.userId === authSub) return album;

  if (album.albumType === 'SHARED' && album.groupId) {
    const dbUser = await prisma.user.findUnique({
      where: { email: authEmail },
      select: { id: true },
    });

    if (!dbUser) return null;

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: dbUser.id,
          groupId: album.groupId,
        },
      },
    });

    if (membership) return album;
  }

  return null;
}
