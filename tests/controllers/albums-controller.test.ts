type PrismaArgs = Record<string, unknown>;

type AlbumFindUniqueResult = { id: string } | null | Record<string, unknown>;

jest.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: jest.fn(async () => ({
      user: { sub: 'auth0|test-user' },
    })),
  },
}));

const handlers: {
  albumCreate: (args: PrismaArgs) => Promise<Record<string, unknown>>;
  albumFindUnique: (args: PrismaArgs) => Promise<AlbumFindUniqueResult>;
  photoStorageCreate: (args: PrismaArgs) => Promise<Record<string, unknown>>;
} = {
  albumCreate: async () => {
    throw new Error('album.create mock not set');
  },
  albumFindUnique: async () => {
    throw new Error('album.findUnique mock not set');
  },
  photoStorageCreate: async () => {
    throw new Error('photoStorage.create mock not set');
  },
};

const fakePrisma = {
  album: {
    create: (args: PrismaArgs) => handlers.albumCreate(args),
    findFirst: (args: PrismaArgs) => handlers.albumFindUnique(args),
  },
  photoStorage: {
    create: (args: PrismaArgs) => handlers.photoStorageCreate(args),
  },
  systemAdministrator: {},
};

(globalThis as { prisma?: unknown }).prisma = fakePrisma;

const routesPromise = Promise.all([
  import('@/app/api/v1/albums/route'),
  import('@/app/api/v1/albums/[id]/route'),
  import('@/app/api/v1/albums/[id]/photo-storages/route'),
]).then(([albumsRoute, albumDetailRoute, photoStoragesRoute]) => ({
  postAlbum: albumsRoute.POST,
  getAlbum: albumDetailRoute.GET,
  postPhotoStorage: photoStoragesRoute.POST,
}));

function setHandlers(overrides: Partial<typeof handlers>) {
  handlers.albumCreate =
    overrides.albumCreate ??
    (async () => {
      throw new Error('album.create mock not set');
    });
  handlers.albumFindUnique =
    overrides.albumFindUnique ??
    (async () => {
      throw new Error('album.findUnique mock not set');
    });
  handlers.photoStorageCreate =
    overrides.photoStorageCreate ??
    (async () => {
      throw new Error('photoStorage.create mock not set');
    });
}

function createJsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

type PhotoRecord = {
  id: string;
  photoStorageId: string;
  fileName: string;
  blobPath: string;
  blobUrl: string;
  contentType: string | null;
  sizeBytes: bigint;
  createdAt: Date;
};

type PhotoStorageRecord = {
  id: string;
  albumId: string;
  name: string;
  storagePath: string;
  photoCount: number;
  totalSizeBytes: bigint;
  createdAt: Date;
  photos: PhotoRecord[];
};

type AlbumRecord = {
  id: string;
  userId: string;
  name: string;
  rootPath: string;
  plannedDividend: Date | null;
  createdTags: unknown;
  requiredAtAlbumCreation: boolean;
  createdAt: Date;
  updatedAt: Date;
  photoStorages: PhotoStorageRecord[];
};

function setupInMemoryHandlers() {
  const albums: AlbumRecord[] = [];
  let albumSequence = 0;
  let photoStorageSequence = 0;
  let photoSequence = 0;

  setHandlers({
    albumCreate: async ({ data }: PrismaArgs) => {
      const payload = data as {
        userId: string;
        name: string;
        rootPath: string;
        plannedDividend?: Date | null;
        createdTags?: unknown;
        requiredAtAlbumCreation?: boolean;
      };

      if (
        albums.some(
          (album) =>
            (album.name === payload.name ||
              album.rootPath === payload.rootPath) &&
            album.userId === payload.userId,
        )
      ) {
        throw { code: 'P2002' };
      }

      const now = new Date('2026-02-20T10:00:00.000Z');
      const album: AlbumRecord = {
        id: `album-${++albumSequence}`,
        userId: payload.userId,
        name: payload.name,
        rootPath: payload.rootPath,
        plannedDividend: payload.plannedDividend ?? null,
        createdTags: payload.createdTags ?? [],
        requiredAtAlbumCreation: payload.requiredAtAlbumCreation ?? false,
        createdAt: now,
        updatedAt: now,
        photoStorages: [],
      };
      albums.push(album);

      return {
        ...album,
        photoStorages: [],
      };
    },
    albumFindUnique: async ({ where, select }: PrismaArgs) => {
      const id = (where as { id: string }).id;
      const userId = (where as { userId?: string }).userId;
      const album = albums.find(
        (item) => item.id === id && (!userId || item.userId === userId),
      );
      if (!album) {
        return null;
      }

      const selected = select as
        | {
            id?: boolean;
            rootPath?: boolean;
          }
        | undefined;
      if (selected?.id || selected?.rootPath) {
        return {
          ...(selected.id ? { id: album.id } : {}),
          ...(selected.rootPath ? { rootPath: album.rootPath } : {}),
        };
      }

      const sortedStorages = [...album.photoStorages].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      return {
        ...album,
        photoStorages: sortedStorages.map((storage) => ({
          ...storage,
          photos: [...storage.photos].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          ),
        })),
      };
    },
    photoStorageCreate: async ({ data }: PrismaArgs) => {
      const payload = data as {
        albumId: string;
        name: string;
        storagePath: string;
        photoCount: number;
        totalSizeBytes: number | bigint;
        photos: {
          create: Array<{
            fileName: string;
            blobPath: string;
            blobUrl: string;
            contentType?: string | null;
            sizeBytes: number | bigint;
          }>;
        };
      };
      const album = albums.find((item) => item.id === payload.albumId);
      if (!album) {
        throw new Error('album not found');
      }
      if (album.photoStorages.some((item) => item.name === payload.name)) {
        throw { code: 'P2002' };
      }

      const createdAt = new Date(
        `2026-02-20T10:${String(10 + photoStorageSequence).padStart(2, '0')}:00.000Z`,
      );
      const storageId = `ps-${++photoStorageSequence}`;
      const photos: PhotoRecord[] = payload.photos.create.map((photo) => ({
        id: `photo-${++photoSequence}`,
        photoStorageId: storageId,
        fileName: photo.fileName,
        blobPath: photo.blobPath,
        blobUrl: photo.blobUrl,
        contentType: photo.contentType ?? null,
        sizeBytes:
          typeof photo.sizeBytes === 'bigint'
            ? photo.sizeBytes
            : BigInt(photo.sizeBytes),
        createdAt,
      }));
      const photoStorage: PhotoStorageRecord = {
        id: storageId,
        albumId: payload.albumId,
        name: payload.name,
        storagePath: payload.storagePath,
        photoCount: payload.photoCount,
        totalSizeBytes:
          typeof payload.totalSizeBytes === 'bigint'
            ? payload.totalSizeBytes
            : BigInt(payload.totalSizeBytes),
        createdAt,
        photos,
      };
      album.photoStorages.push(photoStorage);

      return photoStorage;
    },
  });

  return { albums };
}

describe('albums controllers', () => {
  beforeEach(() => {
    setHandlers({});
  });

  it('albums POST returns 400 for invalid request body (controller unit)', async () => {
    const { postAlbum } = await routesPromise;

    const response = await postAlbum(createJsonRequest('/api/v1/albums', {}));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid request body');
  });

  it('albums POST returns 409 on duplicate album (controller unit)', async () => {
    const { postAlbum } = await routesPromise;
    setHandlers({
      albumCreate: async () => {
        throw { code: 'P2002' };
      },
    });

    const response = await postAlbum(
      createJsonRequest('/api/v1/albums', {
        name: '家族アルバム',
      }),
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(payload.error).toBe(
      '同じアルバム名（またはルートパス）が既に存在します',
    );
  });

  it('photo-storages POST returns 404 when album does not exist (controller unit)', async () => {
    const { postPhotoStorage } = await routesPromise;
    setHandlers({
      albumFindUnique: async () => null,
    });

    const response = await postPhotoStorage(
      createJsonRequest('/api/v1/albums/album-x/photo-storages', {
        name: 'travel',
        files: [
          {
            fileName: 'a.jpg',
            blobPath: 'album/travel/a.jpg',
            blobUrl: 'https://example.com/a.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 100,
          },
        ],
      }),
      { params: Promise.resolve({ id: 'album-x' }) },
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Album not found');
  });

  it('photo-storages POST returns 400 when blob path has no storage dir (controller unit)', async () => {
    const { postPhotoStorage } = await routesPromise;
    setHandlers({
      albumFindUnique: async () => ({ id: 'album-1' }),
    });

    const response = await postPhotoStorage(
      createJsonRequest('/api/v1/albums/album-1/photo-storages', {
        name: 'travel',
        files: [
          {
            fileName: 'a.jpg',
            blobPath: 'a.jpg',
            blobUrl: 'https://example.com/a.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 100,
          },
        ],
      }),
      { params: Promise.resolve({ id: 'album-1' }) },
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid blob path');
  });

  it('albums POST then GET returns created album with empty summary (controller integration)', async () => {
    const { postAlbum, getAlbum } = await routesPromise;
    setupInMemoryHandlers();

    const createResponse = await postAlbum(
      createJsonRequest('/api/v1/albums', {
        name: '家族アルバム',
        createdTags: ['家族', '旅行'],
        requiredAtAlbumCreation: true,
      }),
    );
    const created = (await createResponse.json()) as {
      id: string;
      photoStorageSummary: { totalStorages: number; totalPhotos: number };
    };

    expect(createResponse.status).toBe(201);
    expect(created.photoStorageSummary.totalStorages).toBe(0);
    expect(created.photoStorageSummary.totalPhotos).toBe(0);

    const getResponse = await getAlbum(
      new Request('http://localhost/api/v1/albums/id'),
      {
        params: Promise.resolve({ id: created.id }),
      },
    );
    const fetched = (await getResponse.json()) as {
      id: string;
      albumBasicInfo: { albumName: string; rootPath: string };
      photoStorageSummary: { totalStorages: number; totalPhotos: number };
    };

    expect(getResponse.status).toBe(200);
    expect(fetched.id).toBe(created.id);
    expect(fetched.albumBasicInfo.albumName).toBe('家族アルバム');
    expect(fetched.albumBasicInfo.rootPath).toBe('家族アルバム');
    expect(fetched.photoStorageSummary.totalStorages).toBe(0);
    expect(fetched.photoStorageSummary.totalPhotos).toBe(0);
  });

  it('photo-storages POST updates album summary and GET reflects new photos (controller integration)', async () => {
    const { postAlbum, postPhotoStorage, getAlbum } = await routesPromise;
    const store = setupInMemoryHandlers();

    const createResponse = await postAlbum(
      createJsonRequest('/api/v1/albums', {
        name: 'Family Album',
      }),
    );
    const created = (await createResponse.json()) as { id: string };
    expect(createResponse.status).toBe(201);

    const addResponse = await postPhotoStorage(
      createJsonRequest(`/api/v1/albums/${created.id}/photo-storages`, {
        name: 'trip-2026',
        files: [
          {
            fileName: 'a.jpg',
            blobPath: 'Family-Album/trip-2026/a.jpg',
            blobUrl: 'https://example.com/a.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 100,
          },
          {
            fileName: 'b.jpg',
            blobPath: 'Family-Album/trip-2026/b.jpg',
            blobUrl: 'https://example.com/b.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 200,
          },
        ],
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    const added = (await addResponse.json()) as {
      photoStorage: {
        photoCount: number;
        totalSizeBytes: number;
        storagePath: string;
      };
    };

    expect(addResponse.status).toBe(201);
    expect(added.photoStorage.photoCount).toBe(2);
    expect(added.photoStorage.totalSizeBytes).toBe(300);
    expect(added.photoStorage.storagePath).toBe('Family-Album/trip-2026');

    const getResponse = await getAlbum(
      new Request(`http://localhost/api/v1/albums/${created.id}`),
      { params: Promise.resolve({ id: created.id }) },
    );
    const fetched = (await getResponse.json()) as {
      photoStorageSummary: {
        totalStorages: number;
        totalPhotos: number;
        totalSizeBytes: number;
      };
      photoStorages: Array<{ photos: unknown[] }>;
    };

    expect(getResponse.status).toBe(200);
    expect(fetched.photoStorageSummary.totalStorages).toBe(1);
    expect(fetched.photoStorageSummary.totalPhotos).toBe(2);
    expect(fetched.photoStorageSummary.totalSizeBytes).toBe(300);
    expect(fetched.photoStorages[0]?.photos.length).toBe(2);
    expect(store.albums[0]?.photoStorages.length).toBe(1);
  });
});
