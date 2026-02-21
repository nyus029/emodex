/**
 * GET /api/v1/albums/insight — 0 emo のアルバムを一覧に含めないことの検証
 */

jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(async () => ({
      user: { sub: 'auth0|test-user', email: 'test@example.com' },
    })),
  },
}));

const mockAlbumFindMany = jest.fn();
const mockUserFindUnique = jest.fn();
const mockMembershipFindMany = jest.fn();
const mockMoodRecordFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    album: {
      findMany: (...args: unknown[]) => mockAlbumFindMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    membership: {
      findMany: (...args: unknown[]) => mockMembershipFindMany(...args),
    },
    moodRecord: {
      findMany: (...args: unknown[]) => mockMoodRecordFindMany(...args),
    },
  },
}));

import { GET } from '@/app/api/v1/albums/insight/route';

describe('GET /api/v1/albums/insight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindUnique.mockResolvedValue(null);
    mockMembershipFindMany.mockResolvedValue([]);
    mockMoodRecordFindMany.mockResolvedValue([]);
    mockAlbumFindMany.mockImplementation(
      (args: { where: { userId?: string } }) => {
        const userId = args?.where?.userId;
        if (userId === 'auth0|test-user') {
          return Promise.resolve([
            {
              id: 'album-with-emo',
              name: 'Album With Emo',
              albumType: 'PRIVATE',
              group: null,
              photoStorages: [
                {
                  photoCount: 5,
                  baseEmoPerPhoto: 100,
                  compoundStartDate: new Date('2026-01-01'),
                  isCompoundActive: true,
                },
              ],
            },
            {
              id: 'album-zero-emo',
              name: 'Album Zero Emo',
              albumType: 'PRIVATE',
              group: null,
              photoStorages: [],
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );
  });

  it('excludes albums with emoValue 0 from the albums array', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      albums: Array<{ id: string; name: string; emoValue: number }>;
      totalEmoValue: number;
    };

    expect(body.albums).toHaveLength(1);
    expect(body.albums[0].id).toBe('album-with-emo');
    expect(body.albums[0].name).toBe('Album With Emo');
    expect(body.albums[0].emoValue).toBeGreaterThan(0);

    const zeroEmoAlbum = body.albums.find((a) => a.id === 'album-zero-emo');
    expect(zeroEmoAlbum).toBeUndefined();
  });

  it('returns totalEmoValue and totalDayOverDayChange', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totalEmoValue: number;
      totalDayOverDayChange: { value: number; percentage: number };
    };

    expect(typeof body.totalEmoValue).toBe('number');
    expect(body.totalDayOverDayChange).toHaveProperty('value');
    expect(body.totalDayOverDayChange).toHaveProperty('percentage');
  });
});
