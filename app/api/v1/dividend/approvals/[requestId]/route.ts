import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import { approveRequest } from '@/lib/dividend-approval';
import { requireAuth, jsonSuccess, jsonError, roundEmo } from '@/lib/api-utils';
import type { RouteContext } from '@/types/api';

/**
 * GET /api/v1/dividend/approvals/{requestId}
 * Returns the detail of a dividend approval request with all approvals.
 */
export async function GET(
  _request: Request,
  context: RouteContext<{ requestId: string }>,
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const { requestId } = await context.params;

  const approvalRequest = await prisma.dividendApprovalRequest.findUnique({
    where: { id: requestId },
    include: {
      album: {
        select: { id: true, name: true, albumType: true, groupId: true },
      },
      photoStorage: {
        select: { id: true, name: true, photoCount: true, tags: true },
      },
      requestedByUser: { select: { id: true, name: true } },
      approvals: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      dividendEvent: {
        select: { id: true, emoValueAtEvent: true, executedAt: true },
      },
    },
  });

  if (!approvalRequest) {
    return jsonError('Approval request not found', 404);
  }

  // Verify access
  const album = await findAccessibleAlbum(
    approvalRequest.albumId,
    userId,
    userEmail ?? '',
  );
  if (!album) {
    return jsonError('Approval request not found', 404);
  }

  // Check if expired
  if (
    approvalRequest.status === 'PENDING' &&
    new Date() > approvalRequest.expiresAt
  ) {
    await prisma.dividendApprovalRequest.update({
      where: { id: requestId },
      data: { status: 'EXPIRED' },
    });
    approvalRequest.status = 'EXPIRED';
  }

  const approvedCount = approvalRequest.approvals.filter(
    (a) => a.isApproved,
  ).length;

  return jsonSuccess({
    id: approvalRequest.id,
    status: approvalRequest.status,
    album: {
      id: approvalRequest.album.id,
      name: approvalRequest.album.name,
    },
    photoStorage: {
      id: approvalRequest.photoStorage.id,
      name: approvalRequest.photoStorage.name,
      photoCount: approvalRequest.photoStorage.photoCount,
      tags: (approvalRequest.photoStorage.tags as string[]) ?? [],
    },
    requestedBy: {
      id: approvalRequest.requestedByUser.id,
      name: approvalRequest.requestedByUser.name,
    },
    emoValueAtRequest: roundEmo(approvalRequest.emoValueAtRequest),
    expiresAt: approvalRequest.expiresAt.toISOString(),
    completedAt: approvalRequest.completedAt?.toISOString() ?? null,
    createdAt: approvalRequest.createdAt.toISOString(),
    approvedCount,
    totalCount: approvalRequest.approvals.length,
    approvals: approvalRequest.approvals.map((a) => ({
      userId: a.user.id,
      userName: a.user.name,
      isApproved: a.isApproved,
      approvedAt: a.approvedAt?.toISOString() ?? null,
    })),
    dividendEvent: approvalRequest.dividendEvent
      ? {
          id: approvalRequest.dividendEvent.id,
          emoValueAtEvent: roundEmo(
            approvalRequest.dividendEvent.emoValueAtEvent,
          ),
          executedAt: approvalRequest.dividendEvent.executedAt.toISOString(),
        }
      : null,
  });
}

/**
 * POST /api/v1/dividend/approvals/{requestId}
 * Approve a dividend approval request.
 */
export async function POST(
  _request: Request,
  context: RouteContext<{ requestId: string }>,
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userEmail } = auth.session;

  const { requestId } = await context.params;

  const dbUser = await prisma.user.findUnique({
    where: { email: userEmail ?? '' },
    select: { id: true },
  });
  if (!dbUser) {
    return jsonError('User not found', 404);
  }

  const result = await approveRequest(prisma, requestId, dbUser.id);

  if ('error' in result) {
    return jsonError(result.error, result.status);
  }

  if (result.type === 'executed') {
    return jsonSuccess({
      status: 'APPROVED',
      executed: true,
      dividendEvent: {
        id: result.event.id,
        photoStorageName: result.storageName,
        emoValueAtEvent: result.event.emoValueAtEvent,
      },
    });
  }

  return jsonSuccess({
    status: 'PENDING',
    executed: false,
    approvedCount: result.approvedCount,
    totalCount: result.totalCount,
  });
}
