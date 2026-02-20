import {
  createPhotoStorageSchema,
  resolveStoragePath,
  sumFileSize,
} from '@/lib/photo-storage';

describe('photo-storage lib', () => {
  it('createPhotoStorageSchema accepts valid payload', () => {
    const parsed = createPhotoStorageSchema.safeParse({
      name: '2026-02-travel',
      files: [
        {
          fileName: 'a.jpg',
          blobPath: 'album-a/2026-02-travel/1-a.jpg',
          blobUrl: 'https://example.com/a.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 123,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('resolveStoragePath returns same storage root', () => {
    const result = resolveStoragePath([
      {
        fileName: 'a.jpg',
        blobPath: 'album-a/2026-02-travel/1-a.jpg',
        blobUrl: 'https://example.com/a.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 100,
      },
      {
        fileName: 'b.jpg',
        blobPath: 'album-a/2026-02-travel/2-b.jpg',
        blobUrl: 'https://example.com/b.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 200,
      },
    ]);

    expect(result).toBe('album-a/2026-02-travel');
  });

  it('resolveStoragePath rejects mixed storage roots', () => {
    expect(() =>
      resolveStoragePath([
        {
          fileName: 'a.jpg',
          blobPath: 'album-a/2026-02-travel/1-a.jpg',
          blobUrl: 'https://example.com/a.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 100,
        },
        {
          fileName: 'b.jpg',
          blobPath: 'album-a/another-storage/2-b.jpg',
          blobUrl: 'https://example.com/b.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 200,
        },
      ]),
    ).toThrow(/same storage path/);
  });

  it('sumFileSize returns total bytes', () => {
    const result = sumFileSize([
      {
        fileName: 'a.jpg',
        blobPath: 'album-a/2026-02-travel/1-a.jpg',
        blobUrl: 'https://example.com/a.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 100,
      },
      {
        fileName: 'b.jpg',
        blobPath: 'album-a/2026-02-travel/2-b.jpg',
        blobUrl: 'https://example.com/b.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 200,
      },
    ]);

    expect(result).toBe(300);
  });

  it('resolveStoragePath rejects blob path without directory', () => {
    expect(() =>
      resolveStoragePath([
        {
          fileName: 'a.jpg',
          blobPath: 'a.jpg',
          blobUrl: 'https://example.com/a.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 100,
        },
      ]),
    ).toThrow(/Invalid blob path/);
  });

  it('createPhotoStorageSchema rejects empty files', () => {
    const parsed = createPhotoStorageSchema.safeParse({
      name: '2026-02-travel',
      files: [],
    });

    expect(parsed.success).toBe(false);
  });
});
