/**
 * GET /api/v1/albums/insight/[id] — photoStorages がレスポンスに含まれることの検証
 */

jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(async () => ({
      user: { sub: 'auth0|test-user', email: 'test@example.com' },
    })),
  },
}));

const mockFindAccessibleAlbum = jest.fn();
jest.mock('@/lib/album-access', () => ({
  findAccessibleAlbum: (...args: unknown[]) => mockFindAccessibleAlbum(...args),
}));

const mockPhotoStorageFindMany = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    photoStorage: {
      findMany: (...args: unknown[]) => mockPhotoStorageFindMany(...args),
    },
  },
}));

import { GET } from '@/app/api/v1/albums/insight/[id]/route';

describe('GET /api/v1/albums/insight/[id]', () => {
  const albumId = 'alb-insight-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAccessibleAlbum.mockResolvedValue({
      id: albumId,
      name: 'Test Album',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      plannedDividend: new Date('2026-06-01T00:00:00.000Z'),
    });
    mockPhotoStorageFindMany.mockResolvedValue([
      {
        id: 'ps-1',
        name: 'Spring Trip',
        storagePath: 'alb-insight-1/spring',
        photoCount: 5,
        baseEmoPerPhoto: 100,
        compoundStartDate: new Date('2026-01-01'),
        isCompoundActive: true,
      },
      {
        id: 'ps-2',
        name: 'Summer BBQ',
        storagePath: 'alb-insight-1/summer',
        photoCount: 12,
        baseEmoPerPhoto: 100,
        compoundStartDate: new Date('2026-01-01'),
        isCompoundActive: true,
      },
    ]);
  });

  it('returns 200 with albumBasicInfo, emoValueInfo and photoStorages', async () => {
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: albumId }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      albumBasicInfo: {
        name: string;
        createdAt: string;
        plannedDividend: string | null;
      };
      emoValueInfo: { emoValue: number; dayOverDayChange: unknown };
      photoStorages: Array<{
        id: string;
        name: string;
        storagePath: string;
        photoCount: number;
      }>;
    };

    expect(body.albumBasicInfo.name).toBe('Test Album');
    expect(body.albumBasicInfo.createdAt).toBe('2026-01-15');
    expect(body.emoValueInfo).toHaveProperty('emoValue');
    expect(body.emoValueInfo).toHaveProperty('dayOverDayChange');

    expect(body.photoStorages).toHaveLength(2);
    expect(body.photoStorages[0]).toEqual({
      id: 'ps-1',
      name: 'Spring Trip',
      storagePath: 'alb-insight-1/spring',
      photoCount: 5,
    });
    expect(body.photoStorages[1]).toEqual({
      id: 'ps-2',
      name: 'Summer BBQ',
      storagePath: 'alb-insight-1/summer',
      photoCount: 12,
    });
  });

  it('calls photoStorage.findMany with albumId, isCompoundActive and orderBy createdAt asc', async () => {
    await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: albumId }),
    });

    expect(mockPhotoStorageFindMany).toHaveBeenCalledTimes(1);
    const [args] = mockPhotoStorageFindMany.mock.calls;
    expect(args[0]).toMatchObject({
      where: { albumId, isCompoundActive: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        storagePath: true,
        photoCount: true,
        baseEmoPerPhoto: true,
        compoundStartDate: true,
        isCompoundActive: true,
      },
    });
  });

  it('returns empty photoStorages when album has no storages', async () => {
    mockPhotoStorageFindMany.mockResolvedValue([]);

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: albumId }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { photoStorages: unknown[] };
    expect(body.photoStorages).toEqual([]);
  });

  it('returns 404 when album is not accessible', async () => {
    mockFindAccessibleAlbum.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: albumId }),
    });

    expect(res.status).toBe(404);
    expect(mockPhotoStorageFindMany).not.toHaveBeenCalled();
  });
});
