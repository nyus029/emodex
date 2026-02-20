import { toAlbumResponse } from '@/lib/albums';

describe('toAlbumResponse', () => {
  it('aggregates photo storage summary', () => {
    const createdAt = new Date('2026-02-20T12:00:00.000Z');
    const response = toAlbumResponse({
      id: 'album-1',
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
          totalSizeBytes: 300,
          createdAt,
          photos: [
            {
              id: 'p-1',
              photoStorageId: 'ps-1',
              fileName: 'a.jpg',
              blobPath: 'family-album/2026-02-travel/a.jpg',
              blobUrl: 'https://example.com/a.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 100,
              createdAt,
            },
            {
              id: 'p-2',
              photoStorageId: 'ps-1',
              fileName: 'b.jpg',
              blobPath: 'family-album/2026-02-travel/b.jpg',
              blobUrl: 'https://example.com/b.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 200,
              createdAt,
            },
          ],
        },
      ],
    } as never);

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
      name: 'タグなしアルバム',
      rootPath: 'tagless',
      plannedDividend: null,
      createdTags: { invalid: true },
      requiredAtAlbumCreation: false,
      createdAt,
      updatedAt: createdAt,
      photoStorages: [],
    } as never);

    expect(response.albumBasicInfo.createdTags).toEqual([]);
    expect(response.albumBasicInfo.plannedDividend).toBeNull();
    expect(response.photoStorageSummary.lastAddedAt).toBeNull();
    expect(response.photoStorageSummary.totalPhotos).toBe(0);
  });
});
