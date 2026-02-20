import type {
  Album,
  PhotoStorage,
  PhotoStoragePhoto,
  Prisma,
} from '@prisma/client';

type AlbumWithPhotoStorages = Album & {
  photoStorages: Array<
    PhotoStorage & {
      photos: PhotoStoragePhoto[];
    }
  >;
};

function toTagArray(tags: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === 'string');
}

export function toAlbumResponse(album: AlbumWithPhotoStorages) {
  const totalPhotoCount = album.photoStorages.reduce(
    (total, photoStorage) => total + photoStorage.photoCount,
    0,
  );
  const totalSizeBytes = album.photoStorages.reduce(
    (total, photoStorage) => total + photoStorage.totalSizeBytes,
    0,
  );

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
      totalSizeBytes,
      lastAddedAt: album.photoStorages[0]?.createdAt.toISOString() ?? null,
    },
    photoStorages: album.photoStorages.map((photoStorage) => ({
      id: photoStorage.id,
      name: photoStorage.name,
      storagePath: photoStorage.storagePath,
      photoCount: photoStorage.photoCount,
      totalSizeBytes: photoStorage.totalSizeBytes,
      createdAt: photoStorage.createdAt.toISOString(),
      photos: photoStorage.photos.map((photo) => ({
        id: photo.id,
        fileName: photo.fileName,
        blobPath: photo.blobPath,
        blobUrl: photo.blobUrl,
        contentType: photo.contentType,
        sizeBytes: photo.sizeBytes,
      })),
    })),
  };
}
