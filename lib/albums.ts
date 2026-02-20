import type {
  Album,
  PhotoStorage,
  PhotoStoragePhoto,
  Prisma,
} from '@prisma/client';

export type AlbumWithPhotoStorages = Album & {
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
    createdAt: string;
    plannedDividend: string | null;
    createdTags: string[];
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

function toTagArray(tags: Prisma.JsonValue | null): string[] {
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
      createdAt: album.createdAt.toISOString(),
      plannedDividend:
        album.plannedDividend?.toISOString().slice(0, 10) ?? null,
      createdTags: toTagArray(album.createdTags),
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
