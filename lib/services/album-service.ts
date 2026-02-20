import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { toAlbumResponse, type AlbumListItem } from '@/lib/albums';
import { toPathSegment } from '@/lib/path';
import { findAccessibleAlbum } from '@/lib/album-access';
import {
  resolveStoragePath,
  sumFileSize,
  type CreatePhotoStorageInput,
} from '@/lib/photo-storage';

function toTagArray(tags: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === 'string');
}

export type ListAlbumsResult = AlbumListItem[];

export async function listAlbums(
  userId: string,
  userEmail: string | undefined,
): Promise<ListAlbumsResult> {
  const ownAlbums = await prisma.album.findMany({
    where: { userId },
    include: {
      group: true,
      _count: { select: { photoStorages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let sharedAlbums: typeof ownAlbums = [];
  if (userEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
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
            NOT: { userId },
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

  const toListItem = (album: (typeof ownAlbums)[number]): AlbumListItem => ({
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

export type CreateAlbumInput = {
  name: string;
  albumType?: 'PRIVATE' | 'SHARED';
  groupId?: number;
  plannedDividend?: string;
  createdTags?: string[];
  requiredAtAlbumCreation?: boolean;
};

export type CreateAlbumError =
  | { kind: 'MEMBERSHIP_UNVERIFIABLE' }
  | { kind: 'USER_NOT_FOUND' }
  | { kind: 'NOT_A_MEMBER' }
  | { kind: 'DUPLICATE'; message: string }
  | { kind: 'INTERNAL'; message: string };

export type CreateAlbumResult =
  | { success: true; data: ReturnType<typeof toAlbumResponse> }
  | { success: false; error: CreateAlbumError };

export async function createAlbum(
  userId: string,
  userEmail: string | undefined,
  input: CreateAlbumInput,
): Promise<CreateAlbumResult> {
  const {
    name,
    albumType,
    groupId,
    plannedDividend,
    createdTags,
    requiredAtAlbumCreation,
  } = input;

  const resolvedAlbumType = albumType ?? 'PRIVATE';

  if (resolvedAlbumType === 'SHARED' && groupId) {
    if (!userEmail) {
      return { success: false, error: { kind: 'MEMBERSHIP_UNVERIFIABLE' } };
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!dbUser) {
      return { success: false, error: { kind: 'USER_NOT_FOUND' } };
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: dbUser.id, groupId },
      },
    });

    if (!membership) {
      return { success: false, error: { kind: 'NOT_A_MEMBER' } };
    }
  }

  const rootPath = toPathSegment(name);

  try {
    const album = await prisma.album.create({
      data: {
        name,
        userId,
        rootPath,
        albumType: resolvedAlbumType,
        groupId: resolvedAlbumType === 'SHARED' ? (groupId ?? null) : null,
        plannedDividend: plannedDividend ? new Date(plannedDividend) : null,
        createdTags: createdTags ?? [],
        requiredAtAlbumCreation: requiredAtAlbumCreation ?? false,
      },
      include: {
        group: true,
        photoStorages: {
          include: {
            photos: true,
          },
        },
      },
    });

    return { success: true, data: toAlbumResponse(album) };
  } catch (error) {
    const isUniqueConstraintError =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002') ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002');
    if (isUniqueConstraintError) {
      return {
        success: false,
        error: {
          kind: 'DUPLICATE',
          message: '同じアルバム名（またはルートパス）が既に存在します',
        },
      };
    }

    console.error('Failed to create album', error);
    return {
      success: false,
      error: { kind: 'INTERNAL', message: 'Internal server error' },
    };
  }
}

export async function getAlbumDetail(
  albumId: string,
  userId: string,
  userEmail: string,
) {
  const accessibleAlbum = await findAccessibleAlbum(albumId, userId, userEmail);
  if (!accessibleAlbum) return null;

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: {
      group: true,
      photoStorages: {
        orderBy: { createdAt: 'desc' },
        include: {
          photos: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });

  if (!album) return null;

  return toAlbumResponse(album);
}

export type CreatePhotoStorageError =
  | { kind: 'ALBUM_NOT_FOUND' }
  | { kind: 'INVALID_STORAGE_PATH'; message: string }
  | { kind: 'DUPLICATE'; message: string }
  | { kind: 'INTERNAL'; message: string };

export type CreatePhotoStorageResult =
  | { success: true; data: { albumId: string; photoStorage: PhotoStorageData } }
  | { success: false; error: CreatePhotoStorageError };

type PhotoStorageData = {
  id: string;
  name: string;
  storagePath: string;
  photoCount: number;
  totalSizeBytes: number;
  tags: unknown[];
  createdAt: string;
  photos: Array<{
    id: string;
    fileName: string;
    blobPath: string;
    blobUrl: string;
    contentType: string | null;
    sizeBytes: number;
  }>;
};

export async function createPhotoStorage(
  albumId: string,
  userId: string,
  userEmail: string,
  input: CreatePhotoStorageInput,
): Promise<CreatePhotoStorageResult> {
  const album = await findAccessibleAlbum(albumId, userId, userEmail);
  if (!album) {
    return { success: false, error: { kind: 'ALBUM_NOT_FOUND' } };
  }

  const totalSizeBytes = BigInt(sumFileSize(input.files));
  let storagePath = '';
  try {
    storagePath = resolveStoragePath(input.files);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid photo storage files';
    return {
      success: false,
      error: { kind: 'INVALID_STORAGE_PATH', message },
    };
  }

  if (!storagePath.startsWith(`${album.rootPath}/`)) {
    return {
      success: false,
      error: { kind: 'INVALID_STORAGE_PATH', message: 'Invalid storage path' },
    };
  }

  try {
    const createdPhotoStorage = await prisma.photoStorage.create({
      data: {
        albumId,
        name: input.name,
        storagePath,
        photoCount: input.files.length,
        totalSizeBytes,
        tags: input.tags ?? [],
        photos: {
          create: input.files.map((file) => ({
            fileName: file.fileName,
            blobPath: file.blobPath,
            blobUrl: file.blobUrl,
            contentType: file.contentType ?? null,
            sizeBytes: BigInt(file.sizeBytes),
          })),
        },
      },
      include: {
        photos: true,
      },
    });

    return {
      success: true,
      data: {
        albumId,
        photoStorage: {
          id: createdPhotoStorage.id,
          name: createdPhotoStorage.name,
          storagePath: createdPhotoStorage.storagePath,
          photoCount: createdPhotoStorage.photoCount,
          totalSizeBytes: Number(createdPhotoStorage.totalSizeBytes),
          tags: Array.isArray(createdPhotoStorage.tags)
            ? createdPhotoStorage.tags
            : [],
          createdAt: createdPhotoStorage.createdAt.toISOString(),
          photos: createdPhotoStorage.photos.map((photo) => ({
            id: photo.id,
            fileName: photo.fileName,
            blobPath: photo.blobPath,
            blobUrl: photo.blobUrl,
            contentType: photo.contentType,
            sizeBytes: Number(photo.sizeBytes),
          })),
        },
      },
    };
  } catch (error) {
    const uniqueTarget =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target)
        ? error.meta.target.map(String)
        : [];
    const isUniqueConstraintError =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002') ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002');
    if (
      isUniqueConstraintError &&
      (uniqueTarget.length === 0 ||
        uniqueTarget.includes('PhotoStorage_albumId_name_key') ||
        (uniqueTarget.includes('albumId') && uniqueTarget.includes('name')))
    ) {
      return {
        success: false,
        error: {
          kind: 'DUPLICATE',
          message: '同じphoto_storage名が既に存在します',
        },
      };
    }

    console.error('Failed to create photo storage', error);
    return {
      success: false,
      error: { kind: 'INTERNAL', message: 'Internal server error' },
    };
  }
}
