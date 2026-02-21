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
        isCompoundActive: boolean;
      };
      for (const album of albums) {
        const storage = album.photoStorages.find(
          (s) =>
            s.id === where.id &&
            s.albumId === where.albumId &&
            s.isCompoundActive === where.isCompoundActive,
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
      };
      return (
        dividendEvents.find((e) => {
          if (e.photoStorageId !== where.photoStorageId) return false;
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
            album: album ? { id: album.id, name: album.name } : null,
            photoStorage: storage
              ? { id: storage.id, name: storage.name }
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

    it('returns 409 when dividend already executed for the storage', async () => {
      const { postDividend } = await routesPromise;
      const album = createAlbum({ id: 'album-2' });
      createStorage(album, { id: 'ps-3' });

      dividendEvents.push({
        id: 'evt-existing',
        albumId: 'album-2',
        photoStorageId: 'ps-3',
        action: 'REINVEST',
        emoValueAtEvent: 500,
        previousBaseEmo: 100,
        newBaseEmo: 200,
        executedAt: new Date(),
      });

      const response = await postDividend(
        createJsonRequest('/api/v1/albums/album-2/dividend', {
          action: 'REINVEST',
          photoStorageId: 'ps-3',
        }),
        { params: Promise.resolve({ id: 'album-2' }) },
      );
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(409);
      expect(payload.error).toBe('Dividend already executed for this storage');
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
    it('returns event detail with photos', async () => {
      const { getDividendDetail } = await routesPromise;
      const album = createAlbum({ id: 'album-6' });
      createStorage(album, { id: 'ps-6' });

      dividendEvents.push({
        id: 'evt-detail',
        albumId: 'album-6',
        photoStorageId: 'ps-6',
        action: 'RECEIVE',
        emoValueAtEvent: 1000,
        previousBaseEmo: 100,
        newBaseEmo: 0,
        executedAt: new Date('2026-02-01'),
      });

      const response = await getDividendDetail(
        new Request('http://localhost/api/v1/dividend/evt-detail'),
        { params: Promise.resolve({ eventId: 'evt-detail' }) },
      );
      const payload = (await response.json()) as {
        dividendEvent: { id: string; action: string };
        album: { id: string; name: string };
        photoStorage: { id: string; photos: unknown[] };
      };

      expect(response.status).toBe(200);
      expect(payload.dividendEvent.id).toBe('evt-detail');
      expect(payload.dividendEvent.action).toBe('RECEIVE');
      expect(payload.album.id).toBe('album-6');
      expect(payload.photoStorage.id).toBe('ps-6');
      expect(payload.photoStorage.photos.length).toBe(1);
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
