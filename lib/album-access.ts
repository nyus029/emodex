import type { Album, Group } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { toTagArray } from '@/lib/albums';
import type { AlbumListItem } from '@/lib/albums';

export type AlbumWithGroup = Album & {
  group?: Group | null;
};

type AlbumWithGroupAndCount = Album & {
  group?: Group | null;
  _count: { photoStorages: number };
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

/**
 * 認証ユーザーがアクセス可能なアルバム一覧を返す（自分のアルバム + 共有アルバム）。
 */
export async function getAccessibleAlbumList(
  authSub: string,
  authEmail: string,
): Promise<AlbumListItem[]> {
  const ownAlbums = await prisma.album.findMany({
    where: { userId: authSub },
    include: {
      group: true,
      _count: { select: { photoStorages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let sharedAlbums: AlbumWithGroupAndCount[] = [];
  if (authEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: authEmail },
      select: { id: true },
    });

    if (dbUser) {
      const memberships = await prisma.membership.findMany({
        where: { userId: dbUser.id },
        select: { groupId: true },
      });
      const groupIds = memberships.map((m) => m.groupId);

      if (groupIds.length > 0) {
        sharedAlbums = await prisma.album.findMany({
          where: {
            albumType: 'SHARED',
            groupId: { in: groupIds },
            NOT: { userId: authSub },
          },
          include: {
            group: true,
            _count: { select: { photoStorages: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }
  }

  const toListItem = (album: AlbumWithGroupAndCount): AlbumListItem => ({
    id: album.id,
    name: album.name,
    albumType: album.albumType,
    rootPath: album.rootPath,
    groupId: album.groupId,
    groupName: album.group?.groupName ?? null,
    createdTags: toTagArray(album.createdTags),
    photoStorageCount: album._count.photoStorages,
  });

  return [...ownAlbums.map(toListItem), ...sharedAlbums.map(toListItem)];
}
