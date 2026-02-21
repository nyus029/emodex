import type {
  Album,
  Group,
  PhotoStorage,
  PhotoStoragePhoto,
  Prisma,
} from '@prisma/client';

export type AlbumWithPhotoStorages = Album & {
  group?: Group | null;
  photoStorages: Array<
    PhotoStorage & {
      photos: PhotoStoragePhoto[];
    }
  >;
};

export type AlbumResponse = {
  id: string;
  albumBasicInfo: {
    albumName: string;
    rootPath: string;
    albumType: 'PRIVATE' | 'SHARED';
    groupId: number | null;
    groupName: string | null;
    createdAt: string;
    plannedDividend: string | null;
    createdTags: string[];
    storageTags: string[];
    requiredAtAlbumCreation: boolean;
  };
  photoStorageSummary: {
    totalStorages: number;
    totalPhotos: number;
    totalSizeBytes: number;
    lastAddedAt: string | null;
  };
  photoStorages: Array<{
    id: string;
    name: string;
    storagePath: string;
    photoCount: number;
    totalSizeBytes: number;
    tags: string[];
    createdAt: string;
    photos: Array<{
      id: string;
      fileName: string;
      blobPath: string;
      blobUrl: string;
      contentType: string | null;
      sizeBytes: number;
    }>;
  }>;
};

export type AlbumListItem = {
  id: string;
  name: string;
  albumType: 'PRIVATE' | 'SHARED';
  rootPath: string;
  groupId: number | null;
  groupName: string | null;
  createdTags: string[];
  storageTags: string[];
  photoStorageCount: number;
};

export function toTagArray(tags: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === 'string');
}

function toSafeInteger(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(value);
}

export function toAlbumResponse(album: AlbumWithPhotoStorages): AlbumResponse {
  const totalPhotoCount = album.photoStorages.reduce(
    (total, photoStorage) => total + photoStorage.photoCount,
    0,
  );
  const totalSizeBytes = album.photoStorages.reduce(
    (total, photoStorage) => total + photoStorage.totalSizeBytes,
    BigInt(0),
  );
  const latestCreatedAt =
    album.photoStorages.length > 0
      ? album.photoStorages.reduce(
          (latest, photoStorage) =>
            photoStorage.createdAt > latest ? photoStorage.createdAt : latest,
          album.photoStorages[0].createdAt,
        )
      : null;

  return {
    id: album.id,
    albumBasicInfo: {
      albumName: album.name,
      rootPath: album.rootPath,
      albumType: album.albumType,
      groupId: album.groupId,
      groupName: album.group?.groupName ?? null,
      createdAt: album.createdAt.toISOString(),
      plannedDividend: album.plannedDividend?.toISOString() ?? null,
      createdTags: toTagArray(album.createdTags),
      storageTags: toTagArray(album.storageTags),
      requiredAtAlbumCreation: album.requiredAtAlbumCreation,
    },
    photoStorageSummary: {
      totalStorages: album.photoStorages.length,
      totalPhotos: totalPhotoCount,
      totalSizeBytes: toSafeInteger(totalSizeBytes),
      lastAddedAt: latestCreatedAt?.toISOString() ?? null,
    },
    photoStorages: album.photoStorages.map((photoStorage) => ({
      id: photoStorage.id,
      name: photoStorage.name,
      storagePath: photoStorage.storagePath,
      photoCount: photoStorage.photoCount,
      totalSizeBytes: toSafeInteger(photoStorage.totalSizeBytes),
      tags: toTagArray(photoStorage.tags),
      createdAt: photoStorage.createdAt.toISOString(),
      photos: photoStorage.photos.map((photo) => ({
        id: photo.id,
        fileName: photo.fileName,
        blobPath: photo.blobPath,
        blobUrl: photo.blobUrl,
        contentType: photo.contentType,
        sizeBytes: toSafeInteger(photo.sizeBytes),
      })),
    })),
  };
}
