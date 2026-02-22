import type { PrismaClient } from '@prisma/client';
import { executeDividendOnStorage } from '@/lib/dividend-execution';

const APPROVAL_EXPIRY_DAYS = 7;

/**
 * Create a dividend approval request for a SHARED album's RECEIVE action.
 * Creates approval records for every group member and auto-approves the requester.
 */
export async function createApprovalRequest(
  prisma: PrismaClient,
  params: {
    albumId: string;
    photoStorageId: string;
    requestedByDbUserId: number;
    groupId: number;
    emoValue: number;
  },
) {
  const { albumId, photoStorageId, requestedByDbUserId, groupId, emoValue } =
    params;

  const memberships = await prisma.membership.findMany({
    where: { groupId },
    select: { userId: true },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + APPROVAL_EXPIRY_DAYS);

  const request = await prisma.dividendApprovalRequest.create({
    data: {
      albumId,
      photoStorageId,
      requestedByUserId: requestedByDbUserId,
      emoValueAtRequest: emoValue,
      expiresAt,
      approvals: {
        create: memberships.map((m) => ({
          userId: m.userId,
          isApproved: m.userId === requestedByDbUserId,
          approvedAt: m.userId === requestedByDbUserId ? new Date() : null,
        })),
      },
    },
    include: {
      approvals: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  // Check if auto-completed (single member group)
  const allApproved = request.approvals.every((a) => a.isApproved);
  if (allApproved) {
    return executeApprovedDividend(prisma, request.id);
  }

  return { type: 'pending' as const, approvalRequest: request };
}

/**
 * Approve a dividend approval request for the given user.
 * If all members have approved, executes the dividend.
 */
export async function approveRequest(
  prisma: PrismaClient,
  requestId: string,
  dbUserId: number,
) {
  const approvalRequest = await prisma.dividendApprovalRequest.findUnique({
    where: { id: requestId },
    include: {
      approvals: true,
      photoStorage: true,
      album: true,
    },
  });

  if (!approvalRequest) {
    return { error: 'Approval request not found', status: 404 };
  }

  if (approvalRequest.status !== 'PENDING') {
    return {
      error: `Approval request is already ${approvalRequest.status.toLowerCase()}`,
      status: 409,
    };
  }

  if (new Date() > approvalRequest.expiresAt) {
    await prisma.dividendApprovalRequest.update({
      where: { id: requestId },
      data: { status: 'EXPIRED' },
    });
    return { error: 'Approval request has expired', status: 410 };
  }

  const userApproval = approvalRequest.approvals.find(
    (a) => a.userId === dbUserId,
  );
  if (!userApproval) {
    return { error: 'You are not a member of this approval', status: 403 };
  }

  if (userApproval.isApproved) {
    return { error: 'You have already approved this request', status: 409 };
  }

  await prisma.dividendApproval.update({
    where: { id: userApproval.id },
    data: { isApproved: true, approvedAt: new Date() },
  });

  // Re-check all approvals
  const updatedApprovals = await prisma.dividendApproval.findMany({
    where: { approvalRequestId: requestId },
  });
  const allApproved = updatedApprovals.every((a) => a.isApproved);

  if (allApproved) {
    return executeApprovedDividend(prisma, requestId);
  }

  const approvedCount = updatedApprovals.filter((a) => a.isApproved).length;
  return {
    type: 'approved' as const,
    approvedCount,
    totalCount: updatedApprovals.length,
  };
}

/**
 * Execute a fully-approved dividend: create DividendEvent and update PhotoStorage.
 */
async function executeApprovedDividend(
  prisma: PrismaClient,
  requestId: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const req = await tx.dividendApprovalRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        photoStorage: true,
        album: { select: { plannedDividend: true } },
      },
    });

    const storage = req.photoStorage;

    const execution = await executeDividendOnStorage(tx, {
      albumId: req.albumId,
      storage,
      action: 'RECEIVE',
      approvalRequestId: requestId,
      enforceReceiveCooldown: false,
      plannedDividend: req.album.plannedDividend,
    });
    if (execution.status === 'skipped') {
      throw new Error(`Dividend execution skipped: ${execution.reason}`);
    }

    await tx.dividendApprovalRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', completedAt: new Date() },
    });

    return { event: execution.event, storageName: storage.name };
  });

  return {
    type: 'executed' as const,
    event: result.event,
    storageName: result.storageName,
  };
}
