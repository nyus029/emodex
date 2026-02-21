import {
  calculateAlbumEmo,
  calculateDayOverDayChange,
  calculatePhotoStorageEmo,
} from '@/lib/emo-value';
import type { AlbumListItem, AlbumResponse } from '@/lib/albums';
import { toPathSegment } from '@/lib/path';
import type { CreatePhotoStorageInput } from '@/lib/photo-storage';
import { resolveStoragePath, sumFileSize } from '@/lib/photo-storage';

type MockAuthSession = {
  userId: string;
  userEmail: string | undefined;
};

type MockPhoto = {
  id: string;
  fileName: string;
  blobPath: string;
  blobUrl: string;
  contentType: string | null;
  sizeBytes: number;
  createdAt: string;
};

type MockPhotoStorage = {
  id: string;
  albumId: string;
  name: string;
  storagePath: string;
  photoCount: number;
  totalSizeBytes: number;
  tags: string[];
  createdAt: string;
  baseEmoPerPhoto: number;
  compoundStartDate: string;
  isCompoundActive: boolean;
  photos: MockPhoto[];
};

type MockAlbum = {
  id: string;
  name: string;
  userId: string;
  albumType: 'PRIVATE' | 'SHARED';
  groupId: number | null;
  groupName: string | null;
  rootPath: string;
  createdAt: string;
  plannedDividend: string | null;
  createdTags: string[];
  requiredAtAlbumCreation: boolean;
  photoStorages: MockPhotoStorage[];
};

type MockSnapshot = {
  albumId: string;
  snapshotDate: string;
  emoValue: number;
};

type MockDividendEvent = {
  id: string;
  albumId: string;
  photoStorageId: string;
  action: 'REINVEST' | 'RECEIVE';
  emoValueAtEvent: number;
  previousBaseEmo: number;
  newBaseEmo: number;
  executedAt: string;
};

const DB_MOCK_FLAG = (process.env.EMODEX_DB_MOCK ?? '').toLowerCase();

export function isDbMockEnabled() {
  return DB_MOCK_FLAG === 'true' || DB_MOCK_FLAG === '1';
}

export const DB_MOCK_SESSION: MockAuthSession = {
  userId: 'mock-user',
  userEmail: 'mock.user@example.com',
};

const initialAlbumId = 'mock-album-1';
const initialStorageId = 'mock-storage-1';
const now = new Date();
const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);

const mockState: {
  albums: MockAlbum[];
  snapshots: MockSnapshot[];
  dividendEvents: MockDividendEvent[];
} = {
  albums: [
    {
      id: initialAlbumId,
      name: 'デモアルバム',
      userId: DB_MOCK_SESSION.userId,
      albumType: 'PRIVATE',
      groupId: null,
      groupName: null,
      rootPath: 'demo-album',
      createdAt: twoWeeksAgo.toISOString(),
      plannedDividend: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
      createdTags: ['family', 'trip'],
      requiredAtAlbumCreation: false,
      photoStorages: [
        {
          id: initialStorageId,
          albumId: initialAlbumId,
          name: 'initial-photos',
          storagePath: 'demo-album/initial-photos',
          photoCount: 3,
          totalSizeBytes: 1_800_000,
          tags: ['sample'],
          createdAt: twoWeeksAgo.toISOString(),
          baseEmoPerPhoto: 120,
          compoundStartDate: twoWeeksAgo.toISOString(),
          isCompoundActive: true,
          photos: [
            {
              id: `${initialStorageId}-photo-1`,
              fileName: 'sunrise.jpg',
              blobPath: 'demo-album/initial-photos/sunrise.jpg',
              blobUrl: 'https://example.com/demo/sunrise.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 600_000,
              createdAt: twoWeeksAgo.toISOString(),
            },
            {
              id: `${initialStorageId}-photo-2`,
              fileName: 'forest.jpg',
              blobPath: 'demo-album/initial-photos/forest.jpg',
              blobUrl: 'https://example.com/demo/forest.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 600_000,
              createdAt: twoWeeksAgo.toISOString(),
            },
            {
              id: `${initialStorageId}-photo-3`,
              fileName: 'family.jpg',
              blobPath: 'demo-album/initial-photos/family.jpg',
              blobUrl: 'https://example.com/demo/family.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 600_000,
              createdAt: twoWeeksAgo.toISOString(),
            },
          ],
        },
      ],
    },
  ],
  snapshots: Array.from({ length: 10 }).map((_, index) => {
    const date = new Date(now.getTime() - (9 - index) * 86_400_000);
    return {
      albumId: initialAlbumId,
      snapshotDate: date.toISOString().split('T')[0],
      emoValue: Math.round(800 + index * 25),
    };
  }),
  dividendEvents: [],
};

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function toAlbumResponseFromMock(album: MockAlbum): AlbumResponse {
  const totalStorages = album.photoStorages.length;
  const totalPhotos = album.photoStorages.reduce(
    (sum, storage) => sum + storage.photoCount,
    0,
  );
  const totalSizeBytes = album.photoStorages.reduce(
    (sum, storage) => sum + storage.totalSizeBytes,
    0,
  );
  const lastAddedAt =
    album.photoStorages.length > 0
      ? album.photoStorages.reduce((latest, storage) => {
          const createdAt = new Date(storage.createdAt).getTime();
          return createdAt > latest ? createdAt : latest;
        }, new Date(album.createdAt).getTime())
      : null;

  return {
    id: album.id,
    albumBasicInfo: {
      albumName: album.name,
      rootPath: album.rootPath,
      albumType: album.albumType,
      groupId: album.groupId,
      groupName: album.groupName,
      createdAt: album.createdAt,
      plannedDividend: album.plannedDividend,
      createdTags: album.createdTags,
      requiredAtAlbumCreation: album.requiredAtAlbumCreation,
    },
    photoStorageSummary: {
      totalStorages,
      totalPhotos,
      totalSizeBytes,
      lastAddedAt: lastAddedAt ? new Date(lastAddedAt).toISOString() : null,
    },
    photoStorages: album.photoStorages.map((storage) => ({
      id: storage.id,
      name: storage.name,
      storagePath: storage.storagePath,
      photoCount: storage.photoCount,
      totalSizeBytes: storage.totalSizeBytes,
      tags: storage.tags,
      createdAt: storage.createdAt,
      photos: storage.photos.map((photo) => ({
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

function getAlbumStorageParams(album: MockAlbum) {
  return album.photoStorages.map((storage) => ({
    photoCount: storage.photoCount,
    baseEmoPerPhoto: storage.baseEmoPerPhoto,
    compoundStartDate: new Date(storage.compoundStartDate),
    isCompoundActive: storage.isCompoundActive,
  }));
}

function findMockAlbum(albumId: string) {
  return mockState.albums.find((album) => album.id === albumId);
}

export function getMockAlbumList(): AlbumListItem[] {
  return mockState.albums.map((album) => ({
    id: album.id,
    name: album.name,
    albumType: album.albumType,
    rootPath: album.rootPath,
    groupId: album.groupId,
    groupName: album.groupName,
    createdTags: album.createdTags,
    photoStorageCount: album.photoStorages.length,
  }));
}

export function getMockAlbumDetail(id: string): AlbumResponse | null {
  const album = findMockAlbum(id);
  if (!album) return null;

  return toAlbumResponseFromMock(album);
}

export function createMockAlbum(params: {
  name: string;
  albumType?: 'PRIVATE' | 'SHARED';
  groupId?: number;
  plannedDividend?: string;
  createdTags?: string[];
  requiredAtAlbumCreation?: boolean;
}): AlbumResponse {
  const resolvedAlbumType = params.albumType ?? 'PRIVATE';
  const newAlbumId = `mock-album-${mockState.albums.length + 1}`;
  const createdAt = new Date().toISOString();

  const album: MockAlbum = {
    id: newAlbumId,
    name: params.name,
    userId: DB_MOCK_SESSION.userId,
    albumType: resolvedAlbumType,
    groupId: resolvedAlbumType === 'SHARED' ? (params.groupId ?? null) : null,
    groupName: resolvedAlbumType === 'SHARED' ? 'Mock Shared Group' : null,
    rootPath: toPathSegment(params.name) || `album-${mockState.albums.length}`,
    createdAt,
    plannedDividend: params.plannedDividend ?? null,
    createdTags: params.createdTags ?? [],
    requiredAtAlbumCreation: params.requiredAtAlbumCreation ?? false,
    photoStorages: [],
  };

  mockState.albums.unshift(album);
  mockState.snapshots.push({
    albumId: album.id,
    snapshotDate: createdAt.split('T')[0],
    emoValue: 0,
  });

  return toAlbumResponseFromMock(album);
}

export function addMockPhotoStorage(params: {
  albumId: string;
  input: CreatePhotoStorageInput;
}):
  | {
      albumId: string;
      photoStorage: {
        id: string;
        name: string;
        storagePath: string;
        photoCount: number;
        totalSizeBytes: number;
        tags: string[];
        createdAt: string;
        photos: MockPhoto[];
      };
    }
  | { error: string } {
  const album = findMockAlbum(params.albumId);
  if (!album) {
    return { error: 'Album not found' };
  }

  let storagePath = `${album.rootPath}/${toPathSegment(params.input.name)}`;
  try {
    storagePath = resolveStoragePath(params.input.files);
  } catch {
    // ignore and fall back to derived storage path
  }

  if (!storagePath.startsWith(`${album.rootPath}/`)) {
    return { error: 'Invalid storage path' };
  }

  const nowStr = new Date().toISOString();
  const storageId = `mock-storage-${album.photoStorages.length + 1}`;
  const totalSizeBytes = sumFileSize(params.input.files);

  const photos: MockPhoto[] = params.input.files.map((file, index) => ({
    id: `${storageId}-photo-${index + 1}`,
    fileName: file.fileName,
    blobPath: file.blobPath,
    blobUrl: file.blobUrl,
    contentType: file.contentType ?? null,
    sizeBytes: file.sizeBytes,
    createdAt: nowStr,
  }));

  const storage: MockPhotoStorage = {
    id: storageId,
    albumId: album.id,
    name: params.input.name,
    storagePath,
    photoCount: params.input.files.length,
    totalSizeBytes,
    tags: params.input.tags ?? [],
    createdAt: nowStr,
    baseEmoPerPhoto: 120,
    compoundStartDate: nowStr,
    isCompoundActive: true,
    photos,
  };

  album.photoStorages.unshift(storage);

  return {
    albumId: album.id,
    photoStorage: {
      id: storage.id,
      name: storage.name,
      storagePath: storage.storagePath,
      photoCount: storage.photoCount,
      totalSizeBytes: storage.totalSizeBytes,
      tags: storage.tags,
      createdAt: storage.createdAt,
      photos: storage.photos,
    },
  };
}

export function getMockInsightOverview() {
  const allStorages = mockState.albums.flatMap((album) =>
    getAlbumStorageParams(album),
  );

  const totalEmoValue = roundTwo(calculateAlbumEmo(allStorages));
  const totalDayOverDayChange = calculateDayOverDayChange(allStorages);

  const albums = mockState.albums.map((album) => {
    const storages = getAlbumStorageParams(album);
    return {
      id: album.id,
      name: album.name,
      albumType: album.albumType,
      groupName: album.groupName,
      emoValue: roundTwo(calculateAlbumEmo(storages)),
      dayOverDayChange: calculateDayOverDayChange(storages),
    };
  });

  return { totalEmoValue, totalDayOverDayChange, albums };
}

export function getMockAlbumInsight(id: string) {
  const album = findMockAlbum(id);
  if (!album) return null;

  const storages = getAlbumStorageParams(album);
  const emoValue = calculateAlbumEmo(storages);
  const dayOverDayChange = calculateDayOverDayChange(storages);

  return {
    albumBasicInfo: {
      name: album.name,
      createdAt: album.createdAt.split('T')[0],
      plannedDividend: album.plannedDividend,
    },
    emoValueInfo: {
      emoValue: roundTwo(emoValue),
      dayOverDayChange,
    },
  };
}

const PERIOD_DAYS: Record<string, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

export function getMockChartData(albumId: string, period: string) {
  const album = findMockAlbum(albumId);
  if (!album) return null;

  const normalizedPeriod = ['1W', '1M', '3M', '1Y', 'ALL'].includes(period)
    ? period
    : '1M';

  const sinceDate =
    normalizedPeriod === 'ALL'
      ? null
      : new Date(
          new Date().getTime() - PERIOD_DAYS[normalizedPeriod] * 86_400_000,
        );

  const data = mockState.snapshots
    .filter((snap) => snap.albumId === albumId)
    .filter((snap) => {
      if (!sinceDate) return true;
      return new Date(snap.snapshotDate) >= sinceDate;
    })
    .map((snap) => ({
      time: snap.snapshotDate,
      value: roundTwo(snap.emoValue),
    }));

  const storages = getAlbumStorageParams(album);
  const todayValue = calculateAlbumEmo(storages, new Date());
  const todayStr = new Date().toISOString().split('T')[0];
  const lastEntry = data[data.length - 1];
  if (!lastEntry || lastEntry.time !== todayStr) {
    data.push({ time: todayStr, value: roundTwo(todayValue) });
  }

  return { period: normalizedPeriod, data };
}

export function executeMockDividend(params: {
  albumId: string;
  action: 'REINVEST' | 'RECEIVE';
  photoStorageId?: string;
}):
  | {
      result: {
        action: 'REINVEST' | 'RECEIVE';
        processedStorages: number;
        events: Array<{
          id: string;
          photoStorageId: string;
          emoValueAtEvent: number;
          previousBaseEmo: number;
          newBaseEmo: number;
        }>;
      };
    }
  | { error: string } {
  const album = findMockAlbum(params.albumId);
  if (!album) return { error: 'Album not found' };

  if (!album.plannedDividend) {
    return { error: 'Dividend date has not been set' };
  }

  const nowDate = new Date();
  const plannedDate = new Date(album.plannedDividend);
  if (plannedDate > nowDate) {
    return { error: 'Dividend date has not been reached yet' };
  }

  let targets = album.photoStorages.filter((s) => s.isCompoundActive);
  if (params.photoStorageId) {
    targets = targets.filter((s) => s.id === params.photoStorageId);
  }

  if (targets.length === 0) {
    return { error: 'No active photo storages in this album' };
  }

  const events = targets.map((storage) => {
    const previousBaseEmo = storage.baseEmoPerPhoto;
    let newBaseEmo = storage.baseEmoPerPhoto;

    if (params.action === 'REINVEST') {
      newBaseEmo = storage.baseEmoPerPhoto * 2;
      storage.baseEmoPerPhoto = newBaseEmo;
      storage.compoundStartDate = nowDate.toISOString();
    } else {
      storage.isCompoundActive = false;
      newBaseEmo = 0;
    }

    const event: MockDividendEvent = {
      id: `mock-dividend-${mockState.dividendEvents.length + 1}`,
      albumId: album.id,
      photoStorageId: storage.id,
      action: params.action,
      emoValueAtEvent: calculateAlbumEmo(getAlbumStorageParams(album)),
      previousBaseEmo,
      newBaseEmo,
      executedAt: nowDate.toISOString(),
    };
    mockState.dividendEvents.push(event);

    return {
      id: event.id,
      photoStorageId: storage.id,
      emoValueAtEvent: roundTwo(event.emoValueAtEvent),
      previousBaseEmo,
      newBaseEmo,
    };
  });

  return {
    result: {
      action: params.action,
      processedStorages: events.length,
      events,
    },
  };
}

export type MockGroup = {
  groupId: number;
  groupName: string;
  myRole: string;
};

export function getMockGroups(): MockGroup[] {
  return [
    { groupId: 1, groupName: 'Demo Group A', myRole: 'ADMIN' },
    { groupId: 2, groupName: 'Demo Group B', myRole: 'MEMBER' },
  ];
}

export function getMockDividendSummary() {
  const pending = mockState.albums
    .filter((album) => album.plannedDividend)
    .flatMap((album) =>
      album.photoStorages.map((storage) => ({
        albumId: album.id,
        albumName: album.name,
        plannedDividend: album.plannedDividend!,
        photoStorageId: storage.id,
        photoStorageName: storage.name,
        photoCount: storage.photoCount,
        emoValue: roundTwo(
          calculateAlbumEmo([
            {
              photoCount: storage.photoCount,
              baseEmoPerPhoto: storage.baseEmoPerPhoto,
              compoundStartDate: new Date(storage.compoundStartDate),
              isCompoundActive: storage.isCompoundActive,
            },
          ]),
        ),
        tags: storage.tags,
      })),
    );

  const completed = mockState.dividendEvents.map((event) => ({
    dividendEventId: event.id,
    albumId: event.albumId,
    albumName: findMockAlbum(event.albumId)?.name ?? 'Mock Album',
    photoStorageId: event.photoStorageId,
    photoStorageName:
      findMockAlbum(event.albumId)?.photoStorages.find(
        (s) => s.id === event.photoStorageId,
      )?.name ?? 'Mock Storage',
    action: event.action,
    emoValueAtEvent: roundTwo(event.emoValueAtEvent),
    executedAt: event.executedAt,
  }));

  return { pending, completed };
}

export function getMockAdminEmoOverview() {
  const albumsPayload = mockState.albums.map((album) => {
    const storageParams = getAlbumStorageParams(album);
    const currentEmoValue = roundTwo(calculateAlbumEmo(storageParams));
    const dayOverDayChange = calculateDayOverDayChange(storageParams);

    return {
      id: album.id,
      name: album.name,
      currentEmoValue,
      dayOverDayChange,
      photoStorages: album.photoStorages.map((storage) => ({
        id: storage.id,
        name: storage.name,
        photoCount: storage.photoCount,
        baseEmoPerPhoto: storage.baseEmoPerPhoto,
        compoundStartDate: storage.compoundStartDate,
        isCompoundActive: storage.isCompoundActive,
        currentEmoValue: roundTwo(
          calculatePhotoStorageEmo({
            photoCount: storage.photoCount,
            baseEmoPerPhoto: storage.baseEmoPerPhoto,
            compoundStartDate: new Date(storage.compoundStartDate),
            isCompoundActive: storage.isCompoundActive,
          }),
        ),
      })),
    };
  });

  const totalEmoValue = roundTwo(
    albumsPayload.reduce((sum, album) => sum + album.currentEmoValue, 0),
  );

  const recentSnapshots = mockState.snapshots
    .slice(-7)
    .map((snapshot) => {
      const album = findMockAlbum(snapshot.albumId);
      const storage = album?.photoStorages[0];
      return {
        photoStorageId: storage?.id ?? `${snapshot.albumId}-storage`,
        photoStorageName: storage?.name ?? 'Mock Storage',
        albumName: album?.name ?? 'Mock Album',
        snapshotDate: snapshot.snapshotDate,
        emoValue: roundTwo(snapshot.emoValue),
      };
    })
    .reverse();

  const recentDividendEvents = mockState.dividendEvents
    .slice(-10)
    .map((event) => {
      const album = findMockAlbum(event.albumId);
      const storage = album?.photoStorages.find(
        (s) => s.id === event.photoStorageId,
      );
      return {
        id: event.id,
        albumName: album?.name ?? 'Mock Album',
        photoStorageName: storage?.name ?? 'Mock Storage',
        action: event.action,
        emoValueAtEvent: roundTwo(event.emoValueAtEvent),
        previousBaseEmo: event.previousBaseEmo,
        newBaseEmo: event.newBaseEmo,
        executedAt: event.executedAt,
      };
    })
    .reverse();

  return {
    generatedAt: new Date().toISOString(),
    totalEmoValue,
    albums: albumsPayload,
    recentSnapshots,
    recentDividendEvents,
  };
}

export function createMockSnapshotRun() {
  const date = new Date().toISOString().split('T')[0];

  mockState.albums.forEach((album) => {
    mockState.snapshots.push({
      albumId: album.id,
      snapshotDate: date,
      emoValue: roundTwo(calculateAlbumEmo(getAlbumStorageParams(album))),
    });
  });

  return { snapshotsUpserted: mockState.albums.length, date };
}
