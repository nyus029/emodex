import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import { calculatePhotoStorageEmo } from '@/lib/emo-value';
import { createApprovalRequest } from '@/lib/dividend-approval';
import {
  executeDividendOnStorage,
  RECEIVE_COOLDOWN_DAYS,
} from '@/lib/dividend-execution';
import {
  requireAuth,
  parseBody,
  jsonSuccess,
  jsonError,
} from '@/lib/api-utils';
import type { RouteContext } from '@/types/api';

const dividendSchema = z.object({
  action: z.enum(['REINVEST', 'RECEIVE']),
  photoStorageId: z.string().optional(),
});

export async function POST(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const { id } = await context.params;

  const album = await findAccessibleAlbum(id, userId, userEmail ?? '');
  if (!album) {
    return jsonError('Album not found', 404);
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, dividendSchema);
  if (parsed.error) return parsed.error;

  const { action, photoStorageId } = parsed.data;

  // SHARED album + RECEIVE → approval flow
  const needsApproval =
    album.albumType === 'SHARED' && album.groupId && action === 'RECEIVE';

  let activeStorages;

  if (photoStorageId) {
    const storage = await prisma.photoStorage.findFirst({
      where: {
        id: photoStorageId,
        albumId: id,
        ...(action === 'RECEIVE' ? { isCompoundActive: true } : {}),
      },
    });
    if (!storage) {
      return jsonError('Photo storage not found or not active', 404);
    }

    if (action === 'RECEIVE') {
      const cooldownSince = new Date();
      cooldownSince.setDate(cooldownSince.getDate() - RECEIVE_COOLDOWN_DAYS);
      const recentReceive = await prisma.dividendEvent.findFirst({
        where: {
          photoStorageId,
          action: 'RECEIVE',
          executedAt: { gte: cooldownSince },
        },
      });
      if (recentReceive) {
        return jsonError(
          'This storage received a dividend recently. Please wait 7 days.',
          409,
        );
      }

      // Also check for existing PENDING approval request
      if (needsApproval) {
        const existingRequest = await prisma.dividendApprovalRequest.findFirst({
          where: {
            photoStorageId,
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
        });
        if (existingRequest) {
          return jsonError(
            'An approval request already exists for this storage',
            409,
          );
        }
      }
    }

    activeStorages = [storage];
  } else {
    activeStorages = await prisma.photoStorage.findMany({
      where: { albumId: id, isCompoundActive: true },
    });
  }

  if (activeStorages.length === 0) {
    return jsonError('No active photo storages in this album', 400);
  }

  // --- SHARED RECEIVE: create approval requests ---
  if (needsApproval) {
    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail ?? '' },
      select: { id: true },
    });
    if (!dbUser) {
      return jsonError('User not found', 404);
    }

    const approvalResults = [];
    for (const storage of activeStorages) {
      const emoValue = calculatePhotoStorageEmo({
        photoCount: storage.photoCount,
        baseEmoPerPhoto: storage.baseEmoPerPhoto,
        compoundStartDate: storage.compoundStartDate,
        isCompoundActive: true,
      });

      const result = await createApprovalRequest(prisma, {
        albumId: id,
        photoStorageId: storage.id,
        requestedByDbUserId: dbUser.id,
        groupId: album.groupId!,
        emoValue,
      });
      approvalResults.push({ result, storageName: storage.name });
    }

    // If single-member group, it auto-executes
    const executed = approvalResults.filter(
      (r) => r.result.type === 'executed',
    );
    if (executed.length > 0) {
      return jsonSuccess({
        action: 'RECEIVE',
        processedStorages: executed.length,
        events: executed.map(({ result: r, storageName }) => {
          if (r.type !== 'executed') throw new Error('unreachable');
          return {
            id: r.event.id,
            photoStorageId: r.event.photoStorageId,
            photoStorageName: storageName,
            emoValueAtEvent: r.event.emoValueAtEvent,
            previousBaseEmo: r.event.previousBaseEmo,
            newBaseEmo: r.event.newBaseEmo,
          };
        }),
      });
    }

    // Pending approval
    const pendingResults = approvalResults.filter(
      (r) => r.result.type === 'pending',
    );
    return jsonSuccess(
      {
        action: 'RECEIVE',
        approvalRequired: true,
        approvalRequests: pendingResults.map(({ result: r, storageName }) => {
          if (r.type !== 'pending') throw new Error('unreachable');
          return {
            id: r.approvalRequest.id,
            photoStorageName: storageName,
            emoValueAtRequest: r.approvalRequest.emoValueAtRequest,
            expiresAt: r.approvalRequest.expiresAt.toISOString(),
            approvals: r.approvalRequest.approvals.map((a) => ({
              userId: a.userId,
              userName: a.user.name,
              isApproved: a.isApproved,
            })),
          };
        }),
      },
      201,
    );
  }

  // --- PRIVATE or REINVEST: immediate execution (existing logic) ---
  const result = await prisma.$transaction(async (tx) => {
    const events: Array<{
      event: Awaited<ReturnType<typeof tx.dividendEvent.create>>;
      storageName: string;
    }> = [];

    for (const storage of activeStorages) {
      const execution = await executeDividendOnStorage(tx, {
        albumId: id,
        storage,
        action,
        enforceReceiveCooldown: action === 'RECEIVE',
      });
      if (execution.status === 'skipped') {
        continue;
      }

      events.push({ event: execution.event, storageName: storage.name });
    }

    return events;
  });

  return jsonSuccess({
    action,
    processedStorages: result.length,
    events: result.map(({ event: e, storageName }) => ({
      id: e.id,
      photoStorageId: e.photoStorageId,
      photoStorageName: storageName,
      emoValueAtEvent: e.emoValueAtEvent,
      previousBaseEmo: e.previousBaseEmo,
      newBaseEmo: e.newBaseEmo,
    })),
  });
}
