import { prisma } from '@/lib/prisma';
import { findUserAlbumsWithShared } from '@/lib/album-queries';
import { calculatePhotoStorageEmo } from '@/lib/emo-value';
import { requireAuth, jsonSuccess, roundEmo } from '@/lib/api-utils';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  // Pending: albums with plannedDividend set
  const pendingAlbums = await findUserAlbumsWithShared(
    userId,
    userEmail,
    async (where) => {
      const own = await prisma.album.findMany({
        where: {
          ...where.own,
          plannedDividend: { not: null },
        },
        include: {
          photoStorages: {
            where: { isCompoundActive: true },
            include: {
              photos: {
                select: { blobUrl: true },
                orderBy: { createdAt: 'asc' },
                take: 1,
              },
            },
          },
          dividendEvents: {
            orderBy: { executedAt: 'desc' },
          },
        },
      });
      const shared = await prisma.album.findMany({
        where: {
          ...where.shared,
          plannedDividend: { not: null },
        },
        include: {
          photoStorages: {
            where: { isCompoundActive: true },
            include: {
              photos: {
                select: { blobUrl: true },
                orderBy: { createdAt: 'asc' },
                take: 1,
              },
            },
          },
          dividendEvents: {
            orderBy: { executedAt: 'desc' },
          },
        },
      });
      return { own, shared };
    },
  );

  const now = new Date();
  const pending: Array<{
    albumId: string;
    albumName: string;
    albumType: string;
    plannedDividend: string;
    photoStorageId: string;
    photoStorageName: string;
    photoCount: number;
    emoValue: number;
    tags: string[];
    thumbnailUrl: string | null;
  }> = [];

  for (const album of pendingAlbums) {
    if (!album.plannedDividend || album.plannedDividend > now) continue;

    for (const storage of album.photoStorages) {
      const hasEvent = album.dividendEvents.some(
        (e) =>
          e.photoStorageId === storage.id &&
          e.executedAt >= album.plannedDividend!,
      );
      if (hasEvent) continue;

      const emoValue = calculatePhotoStorageEmo({
        photoCount: storage.photoCount,
        baseEmoPerPhoto: storage.baseEmoPerPhoto,
        compoundStartDate: storage.compoundStartDate,
        isCompoundActive: true,
      });

      pending.push({
        albumId: album.id,
        albumName: album.name,
        albumType: album.albumType,
        plannedDividend: album.plannedDividend.toISOString(),
        photoStorageId: storage.id,
        photoStorageName: storage.name,
        photoCount: storage.photoCount,
        emoValue: roundEmo(emoValue),
        tags: (storage.tags as string[]) ?? [],
        thumbnailUrl: storage.photos[0]?.blobUrl ?? null,
      });
    }
  }

  // Approval requests: pending approval requests where user is a member
  const dbUser = userEmail
    ? await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      })
    : null;

  type ApprovalRequestItem = {
    approvalRequestId: string;
    albumId: string;
    albumName: string;
    photoStorageId: string;
    photoStorageName: string;
    photoCount: number;
    emoValueAtRequest: number;
    tags: string[];
    albumType: string;
    thumbnailUrl: string | null;
    requestedBy: { id: number; name: string };
    status: string;
    expiresAt: string;
    createdAt: string;
    approvedCount: number;
    totalCount: number;
    myApproval: boolean;
  };

  let approvalRequests: ApprovalRequestItem[] = [];

  if (dbUser) {
    // Expire stale requests first
    await prisma.dividendApprovalRequest.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    const rawRequests = await prisma.dividendApprovalRequest.findMany({
      where: {
        status: 'PENDING',
        approvals: { some: { userId: dbUser.id } },
      },
      include: {
        album: { select: { id: true, name: true, albumType: true } },
        photoStorage: {
          select: {
            id: true,
            name: true,
            photoCount: true,
            tags: true,
            photos: {
              select: { blobUrl: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
        requestedByUser: { select: { id: true, name: true } },
        approvals: {
          select: { userId: true, isApproved: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    approvalRequests = rawRequests.map((r) => ({
      approvalRequestId: r.id,
      albumId: r.album.id,
      albumName: r.album.name,
      albumType: r.album.albumType,
      photoStorageId: r.photoStorage.id,
      photoStorageName: r.photoStorage.name,
      photoCount: r.photoStorage.photoCount,
      emoValueAtRequest: roundEmo(r.emoValueAtRequest),
      tags: (r.photoStorage.tags as string[]) ?? [],
      thumbnailUrl: r.photoStorage.photos[0]?.blobUrl ?? null,
      requestedBy: {
        id: r.requestedByUser.id,
        name: r.requestedByUser.name,
      },
      status: r.status,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      approvedCount: r.approvals.filter((a) => a.isApproved).length,
      totalCount: r.approvals.length,
      myApproval:
        r.approvals.find((a) => a.userId === dbUser.id)?.isApproved ?? false,
    }));
  }

  // Completed: all accessible albums (regardless of plannedDividend)
  const allAlbums = await findUserAlbumsWithShared(
    userId,
    userEmail,
    async (where) => {
      const own = await prisma.album.findMany({
        where: where.own,
        select: { id: true, userId: true, albumType: true, groupId: true },
      });
      const shared = await prisma.album.findMany({
        where: where.shared,
        select: { id: true, userId: true, albumType: true, groupId: true },
      });
      return { own, shared };
    },
  );

  const allAlbumIds = allAlbums.map((a) => a.id);

  const completedEvents = await prisma.dividendEvent.findMany({
    where: { albumId: { in: allAlbumIds } },
    include: {
      album: { select: { id: true, name: true, albumType: true } },
      photoStorage: {
        select: {
          id: true,
          name: true,
          photos: {
            select: { blobUrl: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { executedAt: 'desc' },
  });

  const completed = completedEvents.map((e) => ({
    dividendEventId: e.id,
    albumId: e.album.id,
    albumName: e.album.name,
    albumType: e.album.albumType,
    photoStorageId: e.photoStorage.id,
    photoStorageName: e.photoStorage.name,
    thumbnailUrl: e.photoStorage.photos[0]?.blobUrl ?? null,
    action: e.action as 'REINVEST' | 'RECEIVE',
    emoValueAtEvent: roundEmo(e.emoValueAtEvent),
    executedAt: e.executedAt.toISOString(),
  }));

  return jsonSuccess({ pending, approvalRequests, completed });
}
