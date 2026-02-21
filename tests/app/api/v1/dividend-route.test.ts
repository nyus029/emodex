type PrismaArgs = Record<string, unknown>;

jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(async () => ({
      user: { sub: 'auth0|test-user', email: 'test@example.com' },
    })),
  },
}));

type DividendEventRecord = {
  id: string;
  albumId: string;
  photoStorageId: string;
  action: string;
  emoValueAtEvent: number;
  previousBaseEmo: number;
  newBaseEmo: number;
  executedAt: Date;
};

type PhotoStorageRecord = {
  id: string;
  albumId: string;
  name: string;
  storagePath: string;
  photoCount: number;
  totalSizeBytes: bigint;
  tags: string[];
  baseEmoPerPhoto: number;
  compoundStartDate: Date;
  isCompoundActive: boolean;
  createdAt: Date;
  photos: Array<{
    id: string;
    fileName: string;
    blobUrl: string;
    contentType: string | null;
  }>;
};

type AlbumRecord = {
  id: string;
  userId: string;
  name: string;
  rootPath: string;
  albumType: string;
  groupId: number | null;
  group: null;
  plannedDividend: Date | null;
  createdTags: string[];
  requiredAtAlbumCreation: boolean;
  createdAt: Date;
  updatedAt: Date;
  photoStorages: PhotoStorageRecord[];
  dividendEvents: DividendEventRecord[];
};

const albums: AlbumRecord[] = [];
const dividendEvents: DividendEventRecord[] = [];
let eventSequence = 0;

function resetStore() {
  albums.length = 0;
  dividendEvents.length = 0;
  eventSequence = 0;
}

function createAlbum(
  overrides: Partial<AlbumRecord> & { id: string },
): AlbumRecord {
  const album: AlbumRecord = {
    userId: 'auth0|test-user',
    name: `Album ${overrides.id}`,
    rootPath: `album-${overrides.id}`,
    albumType: 'PRIVATE',
    groupId: null,
    group: null,
    plannedDividend: new Date('2026-01-01T00:00:00.000Z'),
    createdTags: [],
    requiredAtAlbumCreation: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    photoStorages: [],
    dividendEvents: [],
    ...overrides,
  };
  albums.push(album);
  return album;
}

function createStorage(
  album: AlbumRecord,
  overrides: Partial<PhotoStorageRecord> & { id: string },
): PhotoStorageRecord {
  const storage: PhotoStorageRecord = {
    albumId: album.id,
    name: `Storage ${overrides.id}`,
    storagePath: `path/${overrides.id}`,
    photoCount: 5,
    totalSizeBytes: BigInt(1000),
    tags: ['tag1'],
    baseEmoPerPhoto: 100,
    compoundStartDate: new Date('2026-01-01'),
    isCompoundActive: true,
    createdAt: new Date('2026-01-01'),
    photos: [
      {
        id: 'photo-1',
        fileName: 'IMG_001.jpg',
        blobUrl: 'https://example.com/photo1.jpg',
        contentType: 'image/jpeg',
      },
    ],
    ...overrides,
  };
  album.photoStorages.push(storage);
  return storage;
}

const fakePrisma = {
  album: {
    findUnique: async (args: PrismaArgs) => {
      const where = args.where as { id: string };
      const album = albums.find((a) => a.id === where.id);
      if (!album) return null;
      return { ...album, group: null };
    },
    findMany: async (args: PrismaArgs) => {
      const where = args.where as {
        userId?: string;
        albumType?: string;
        plannedDividend?: Record<string, unknown>;
      };
      return albums.filter((a) => {
        if (where.userId && a.userId !== where.userId) return false;
        if (where.albumType && a.albumType !== where.albumType) return false;
        return true;
      });
    },
  },
  photoStorage: {
    findFirst: async (args: PrismaArgs) => {
      const where = args.where as {
        id: string;
        albumId: string;
        isCompoundActive?: boolean;
      };
      for (const album of albums) {
        const storage = album.photoStorages.find(
          (s) =>
            s.id === where.id &&
            s.albumId === where.albumId &&
            (where.isCompoundActive === undefined ||
              s.isCompoundActive === where.isCompoundActive),
        );
        if (storage) return storage;
      }
      return null;
    },
    findMany: async (args: PrismaArgs) => {
      const where = args.where as {
        albumId: string;
        isCompoundActive: boolean;
      };
      const album = albums.find((a) => a.id === where.albumId);
      if (!album) return [];
      return album.photoStorages.filter(
        (s) => s.isCompoundActive === where.isCompoundActive,
      );
    },
    update: async (args: PrismaArgs) => {
      const where = args.where as { id: string };
      const data = args.data as Record<string, unknown>;
      for (const album of albums) {
        const storage = album.photoStorages.find((s) => s.id === where.id);
        if (storage) {
          Object.assign(storage, data);
          return storage;
        }
      }
      return null;
    },
  },
  dividendEvent: {
    findUnique: async (args: PrismaArgs) => {
      const where = args.where as { id: string };
      const event = dividendEvents.find((e) => e.id === where.id);
      if (!event) return null;
      const album = albums.find((a) => a.id === event.albumId);
      const storage = album?.photoStorages.find(
        (s) => s.id === event.photoStorageId,
      );
      return {
        ...event,
        album: album ? { id: album.id, name: album.name } : null,
        photoStorage: storage ?? null,
      };
    },
    findFirst: async (args: PrismaArgs) => {
      const where = args.where as {
        photoStorageId: string;
        executedAt?: { gte: Date };
        action?: string;
      };
      return (
        dividendEvents.find((e) => {
          if (e.photoStorageId !== where.photoStorageId) return false;
          if (where.action !== undefined && e.action !== where.action)
            return false;
          if (where.executedAt?.gte && e.executedAt < where.executedAt.gte)
            return false;
          return true;
        }) ?? null
      );
    },
    findMany: async (args: PrismaArgs) => {
      const where = args.where as { albumId: { in: string[] } };
      const albumIds = where.albumId.in;
      return dividendEvents
        .filter((e) => albumIds.includes(e.albumId))
        .map((e) => {
          const album = albums.find((a) => a.id === e.albumId);
          const storage = album?.photoStorages.find(
            (s) => s.id === e.photoStorageId,
          );
          return {
            ...e,
            album: album
              ? { id: album.id, name: album.name, albumType: album.albumType }
              : null,
            photoStorage: storage
              ? {
                  id: storage.id,
                  name: storage.name,
                  photos: storage.photos ?? [],
                }
              : null,
          };
        });
    },
    create: async (args: PrismaArgs) => {
      const data = args.data as {
        albumId: string;
        photoStorageId: string;
        action: string;
        emoValueAtEvent: number;
        previousBaseEmo: number;
        newBaseEmo: number;
      };
      const event: DividendEventRecord = {
        id: `evt-${++eventSequence}`,
        ...data,
        executedAt: new Date(),
      };
      dividendEvents.push(event);
      const album = albums.find((a) => a.id === data.albumId);
      album?.dividendEvents.push(event);
      return event;
    },
  },
  user: {
    findUnique: async () => null,
  },
  membership: {
    findUnique: async () => null,
    findMany: async () => [],
  },
  systemAdministrator: {},
  $transaction: async (fn: (tx: typeof fakePrisma) => Promise<unknown>) => {
    return fn(fakePrisma);
  },
};

(globalThis as { prisma?: unknown }).prisma = fakePrisma;

const routesPromise = Promise.all([
  import('@/app/api/v1/albums/[id]/dividend/route'),
  import('@/app/api/v1/dividend/route'),
  import('@/app/api/v1/dividend/[eventId]/route'),
]).then(([albumDividendRoute, dividendListRoute, dividendDetailRoute]) => ({
  postDividend: albumDividendRoute.POST,
  getDividendList: dividendListRoute.GET,
  getDividendDetail: dividendDetailRoute.GET,
}));

function createJsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('dividend routes', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('POST /api/v1/albums/[id]/dividend with photoStorageId', () => {
    it('processes a single storage when photoStorageId is specified', async () => {
      const { postDividend } = await routesPromise;
      const album = createAlbum({ id: 'album-1' });
      createStorage(album, { id: 'ps-1' });
      createStorage(album, { id: 'ps-2' });

      const response = await postDividend(
        createJsonRequest('/api/v1/albums/album-1/dividend', {
          action: 'REINVEST',
          photoStorageId: 'ps-1',
        }),
        { params: Promise.resolve({ id: 'album-1' }) },
      );
      const payload = (await response.json()) as {
        processedStorages: number;
        events: Array<{ photoStorageId: string }>;
      };

      expect(response.status).toBe(200);
      expect(payload.processedStorages).toBe(1);
      expect(payload.events[0]?.photoStorageId).toBe('ps-1');
    });

    it('returns 409 when storage received a dividend within cooldown period', async () => {
      const { postDividend } = await routesPromise;
      const album = createAlbum({ id: 'album-2' });
      createStorage(album, { id: 'ps-3' });

      dividendEvents.push({
        id: 'evt-existing',
        albumId: 'album-2',
        photoStorageId: 'ps-3',
        action: 'RECEIVE',
        emoValueAtEvent: 500,
        previousBaseEmo: 100,
        newBaseEmo: 0,
        executedAt: new Date(),
      });

      const response = await postDividend(
        createJsonRequest('/api/v1/albums/album-2/dividend', {
          action: 'RECEIVE',
          photoStorageId: 'ps-3',
        }),
        { params: Promise.resolve({ id: 'album-2' }) },
      );
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(409);
      expect(payload.error).toBe(
        'This storage received a dividend recently. Please wait 7 days.',
      );
    });

    it('allows RECEIVE when cooldown period has passed', async () => {
      const { postDividend } = await routesPromise;
      const album = createAlbum({ id: 'album-2b' });
      createStorage(album, { id: 'ps-3b' });

      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      dividendEvents.push({
        id: 'evt-old',
        albumId: 'album-2b',
        photoStorageId: 'ps-3b',
        action: 'RECEIVE',
        emoValueAtEvent: 500,
        previousBaseEmo: 100,
        newBaseEmo: 0,
        executedAt: eightDaysAgo,
      });

      const response = await postDividend(
        createJsonRequest('/api/v1/albums/album-2b/dividend', {
          action: 'RECEIVE',
          photoStorageId: 'ps-3b',
        }),
        { params: Promise.resolve({ id: 'album-2b' }) },
      );

      expect(response.status).toBe(200);
    });

    it('allows RECEIVE when plannedDividend is null (single storage)', async () => {
      const { postDividend } = await routesPromise;
      const album = createAlbum({
        id: 'album-null-date',
        plannedDividend: null,
      });
      createStorage(album, { id: 'ps-null' });

      const response = await postDividend(
        createJsonRequest('/api/v1/albums/album-null-date/dividend', {
          action: 'RECEIVE',
          photoStorageId: 'ps-null',
        }),
        { params: Promise.resolve({ id: 'album-null-date' }) },
      );
      const payload = (await response.json()) as {
        action: string;
        processedStorages: number;
        events: Array<{ id: string; photoStorageId: string }>;
      };

      expect(response.status).toBe(200);
      expect(payload.action).toBe('RECEIVE');
      expect(payload.processedStorages).toBe(1);
      expect(payload.events[0]?.photoStorageId).toBe('ps-null');
    });

    it('allows RECEIVE without photoStorageId when plannedDividend is null', async () => {
      const { postDividend } = await routesPromise;
      const album = createAlbum({
        id: 'album-bulk-null',
        plannedDividend: null,
      });
      createStorage(album, { id: 'ps-bulk-1' });
      createStorage(album, { id: 'ps-bulk-2' });

      const response = await postDividend(
        createJsonRequest('/api/v1/albums/album-bulk-null/dividend', {
          action: 'RECEIVE',
        }),
        { params: Promise.resolve({ id: 'album-bulk-null' }) },
      );
      const payload = (await response.json()) as {
        action: string;
        processedStorages: number;
        events: Array<{ photoStorageId: string }>;
      };

      expect(response.status).toBe(200);
      expect(payload.action).toBe('RECEIVE');
      expect(payload.processedStorages).toBe(2);
      expect(payload.events.map((e) => e.photoStorageId).sort()).toEqual([
        'ps-bulk-1',
        'ps-bulk-2',
      ]);
    });

    it('returns 404 when photoStorageId does not exist', async () => {
      const { postDividend } = await routesPromise;
      createAlbum({ id: 'album-3' });

      const response = await postDividend(
        createJsonRequest('/api/v1/albums/album-3/dividend', {
          action: 'REINVEST',
          photoStorageId: 'ps-nonexistent',
        }),
        { params: Promise.resolve({ id: 'album-3' }) },
      );
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(payload.error).toBe('Photo storage not found or not active');
    });
  });

  describe('GET /api/v1/dividend', () => {
    it('returns pending and completed items correctly', async () => {
      const { getDividendList } = await routesPromise;
      const album = createAlbum({ id: 'album-4' });
      createStorage(album, { id: 'ps-4' });
      createStorage(album, { id: 'ps-5' });

      // ps-5 has a completed event
      const event: DividendEventRecord = {
        id: 'evt-done',
        albumId: 'album-4',
        photoStorageId: 'ps-5',
        action: 'REINVEST',
        emoValueAtEvent: 500,
        previousBaseEmo: 100,
        newBaseEmo: 200,
        executedAt: new Date(),
      };
      dividendEvents.push(event);
      album.dividendEvents.push(event);

      const response = await getDividendList();
      const payload = (await response.json()) as {
        pending: Array<{ photoStorageId: string }>;
        completed: Array<{ dividendEventId: string }>;
      };

      expect(response.status).toBe(200);
      expect(payload.pending.length).toBe(1);
      expect(payload.pending[0]?.photoStorageId).toBe('ps-4');
      expect(payload.completed.length).toBe(1);
      expect(payload.completed[0]?.dividendEventId).toBe('evt-done');
    });

    it('returns empty arrays when no dividends exist', async () => {
      const { getDividendList } = await routesPromise;
      createAlbum({
        id: 'album-5',
        plannedDividend: new Date('2099-01-01'),
      });

      const response = await getDividendList();
      const payload = (await response.json()) as {
        pending: unknown[];
        completed: unknown[];
      };

      expect(response.status).toBe(200);
      expect(payload.pending.length).toBe(0);
      expect(payload.completed.length).toBe(0);
    });
  });

  describe('GET /api/v1/dividend/[eventId]', () => {
    it('returns event detail with photos when within viewing period', async () => {
      const { getDividendDetail } = await routesPromise;
      const album = createAlbum({ id: 'album-6' });
      createStorage(album, { id: 'ps-6', isCompoundActive: false });

      dividendEvents.push({
        id: 'evt-detail',
        albumId: 'album-6',
        photoStorageId: 'ps-6',
        action: 'RECEIVE',
        emoValueAtEvent: 1000,
        previousBaseEmo: 100,
        newBaseEmo: 0,
        executedAt: new Date(),
      });

      const response = await getDividendDetail(
        new Request('http://localhost/api/v1/dividend/evt-detail'),
        { params: Promise.resolve({ eventId: 'evt-detail' }) },
      );
      const payload = (await response.json()) as {
        dividendEvent: { id: string; action: string };
        album: { id: string; name: string };
        photoStorage: {
          id: string;
          photosVisible: boolean;
          photosExpireAt: string;
          photos: unknown[];
        };
      };

      expect(response.status).toBe(200);
      expect(payload.dividendEvent.id).toBe('evt-detail');
      expect(payload.dividendEvent.action).toBe('RECEIVE');
      expect(payload.album.id).toBe('album-6');
      expect(payload.photoStorage.id).toBe('ps-6');
      expect(payload.photoStorage.photosVisible).toBe(true);
      expect(payload.photoStorage.photosExpireAt).toBeDefined();
      expect(payload.photoStorage.photos.length).toBe(1);
    });

    it('returns empty photos when viewing period expired', async () => {
      const { getDividendDetail } = await routesPromise;
      const album = createAlbum({ id: 'album-6b' });
      createStorage(album, { id: 'ps-6b', isCompoundActive: false });

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      dividendEvents.push({
        id: 'evt-expired',
        albumId: 'album-6b',
        photoStorageId: 'ps-6b',
        action: 'RECEIVE',
        emoValueAtEvent: 1000,
        previousBaseEmo: 100,
        newBaseEmo: 0,
        executedAt: tenDaysAgo,
      });

      const response = await getDividendDetail(
        new Request('http://localhost/api/v1/dividend/evt-expired'),
        { params: Promise.resolve({ eventId: 'evt-expired' }) },
      );
      const payload = (await response.json()) as {
        photoStorage: { photosVisible: boolean; photos: unknown[] };
      };

      expect(response.status).toBe(200);
      expect(payload.photoStorage.photosVisible).toBe(false);
      expect(payload.photoStorage.photos.length).toBe(0);
    });

    it('returns empty photos for REINVEST events', async () => {
      const { getDividendDetail } = await routesPromise;
      const album = createAlbum({ id: 'album-6c' });
      createStorage(album, { id: 'ps-6c' });

      dividendEvents.push({
        id: 'evt-reinvest',
        albumId: 'album-6c',
        photoStorageId: 'ps-6c',
        action: 'REINVEST',
        emoValueAtEvent: 1000,
        previousBaseEmo: 100,
        newBaseEmo: 200,
        executedAt: new Date(),
      });

      const response = await getDividendDetail(
        new Request('http://localhost/api/v1/dividend/evt-reinvest'),
        { params: Promise.resolve({ eventId: 'evt-reinvest' }) },
      );
      const payload = (await response.json()) as {
        photoStorage: {
          photosVisible: boolean;
          photosExpireAt: string | null;
          photos: unknown[];
        };
      };

      expect(response.status).toBe(200);
      expect(payload.photoStorage.photosVisible).toBe(false);
      expect(payload.photoStorage.photosExpireAt).toBeNull();
      expect(payload.photoStorage.photos.length).toBe(0);
    });

    it('returns 404 for non-existent event', async () => {
      const { getDividendDetail } = await routesPromise;

      const response = await getDividendDetail(
        new Request('http://localhost/api/v1/dividend/evt-nonexistent'),
        { params: Promise.resolve({ eventId: 'evt-nonexistent' }) },
      );
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(payload.error).toBe('Dividend event not found');
    });
  });
});
