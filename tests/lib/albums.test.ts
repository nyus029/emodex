import { toAlbumResponse, type AlbumWithPhotoStorages } from '@/lib/albums';

describe('toAlbumResponse', () => {
  it('aggregates photo storage summary', () => {
    const createdAt = new Date('2026-02-20T12:00:00.000Z');
    const input: AlbumWithPhotoStorages = {
      id: 'album-1',
      userId: 'auth0|user-1',
      name: '家族アルバム',
      rootPath: 'family-album',
      plannedDividend: new Date('2026-03-31T00:00:00.000Z'),
      createdTags: ['家族', '旅行'],
      requiredAtAlbumCreation: true,
      createdAt,
      updatedAt: createdAt,
      photoStorages: [
        {
          id: 'ps-1',
          albumId: 'album-1',
          name: '2026-02-travel',
          storagePath: 'family-album/2026-02-travel',
          photoCount: 2,
          totalSizeBytes: BigInt(300),
          createdAt,
          photos: [
            {
              id: 'p-1',
              photoStorageId: 'ps-1',
              fileName: 'a.jpg',
              blobPath: 'family-album/2026-02-travel/a.jpg',
              blobUrl: 'https://example.com/a.jpg',
              contentType: 'image/jpeg',
              sizeBytes: BigInt(100),
              createdAt,
            },
            {
              id: 'p-2',
              photoStorageId: 'ps-1',
              fileName: 'b.jpg',
              blobPath: 'family-album/2026-02-travel/b.jpg',
              blobUrl: 'https://example.com/b.jpg',
              contentType: 'image/jpeg',
              sizeBytes: BigInt(200),
              createdAt,
            },
          ],
        },
      ],
    };
    const response = toAlbumResponse(input);

    expect(response.photoStorageSummary.totalStorages).toBe(1);
    expect(response.photoStorageSummary.totalPhotos).toBe(2);
    expect(response.photoStorageSummary.totalSizeBytes).toBe(300);
    expect(response.albumBasicInfo.rootPath).toBe('family-album');
    expect(response.photoStorages[0]?.photos.length).toBe(2);
  });

  it('sanitizes invalid tag payload and nullable fields', () => {
    const createdAt = new Date('2026-02-20T12:00:00.000Z');
    const response = toAlbumResponse({
      id: 'album-2',
      userId: 'auth0|user-1',
      name: 'タグなしアルバム',
      rootPath: 'tagless',
      plannedDividend: null,
      // @ts-expect-error Testing invalid input sanitization
      createdTags: { invalid: true },
      requiredAtAlbumCreation: false,
      createdAt,
      updatedAt: createdAt,
      photoStorages: [],
    });

    expect(response.albumBasicInfo.createdTags).toEqual([]);
    expect(response.albumBasicInfo.plannedDividend).toBeNull();
    expect(response.photoStorageSummary.lastAddedAt).toBeNull();
    expect(response.photoStorageSummary.totalPhotos).toBe(0);
  });

  it('uses max createdAt for lastAddedAt regardless of order', () => {
    const now = new Date('2026-02-20T12:00:00.000Z');
    const later = new Date('2026-02-21T12:00:00.000Z');
    const response = toAlbumResponse({
      id: 'album-3',
      userId: 'auth0|user-1',
      name: '順序テスト',
      rootPath: 'ordered',
      plannedDividend: null,
      createdTags: [],
      requiredAtAlbumCreation: false,
      createdAt: now,
      updatedAt: now,
      photoStorages: [
        {
          id: 'ps-old',
          albumId: 'album-3',
          name: 'old',
          storagePath: 'ordered/old',
          photoCount: 1,
          totalSizeBytes: BigInt(1),
          createdAt: now,
          photos: [],
        },
        {
          id: 'ps-new',
          albumId: 'album-3',
          name: 'new',
          storagePath: 'ordered/new',
          photoCount: 1,
          totalSizeBytes: BigInt(1),
          createdAt: later,
          photos: [],
        },
      ],
    });

    expect(response.photoStorageSummary.lastAddedAt).toBe(later.toISOString());
  });
});
