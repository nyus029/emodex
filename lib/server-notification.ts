import type { Prisma, PrismaClient } from '@prisma/client';
import { parseStorageNameToJapaneseDate } from '@/lib/invest';

type NotificationTx = PrismaClient | Prisma.TransactionClient;

const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

function buildDividendPayload(storageName: string, eventId: string) {
  const dateLabel = parseStorageNameToJapaneseDate(storageName) ?? storageName;
  return {
    title: '配当が届いています',
    body: `${dateLabel}のあなたから配当が届いています`,
    url: `/dividend/${eventId}`,
  };
}

async function resolveRecipientUserIds(
  tx: NotificationTx,
  params: {
    albumType: 'PRIVATE' | 'SHARED';
    groupId: number | null;
    initiatedByDbUserId?: number;
  },
) {
  if (params.albumType === 'SHARED' && params.groupId) {
    const memberships = await tx.membership.findMany({
      where: { groupId: params.groupId },
      select: { userId: true },
    });
    return memberships.map((m) => m.userId);
  }

  if (params.initiatedByDbUserId) {
    return [params.initiatedByDbUserId];
  }

  return [];
}

export async function enqueueDividendNotifications(
  tx: NotificationTx,
  params: {
    dividendEventId: string;
    storageName: string;
    albumType: 'PRIVATE' | 'SHARED';
    groupId: number | null;
    initiatedByDbUserId?: number;
  },
) {
  if (!('notificationDelivery' in tx) || !('membership' in tx)) return;

  const recipientUserIds = await resolveRecipientUserIds(tx, params);
  if (recipientUserIds.length === 0) return;

  const payload = buildDividendPayload(
    params.storageName,
    params.dividendEventId,
  );

  await tx.notificationDelivery.createMany({
    data: recipientUserIds.map((userId) => ({
      userId,
      dividendEventId: params.dividendEventId,
      dedupeKey: `${params.dividendEventId}:${userId}`,
      payload,
      nextAttemptAt: new Date(),
    })),
    skipDuplicates: true,
  });
}

function retryDelayMs(attemptCount: number) {
  return Math.min(
    BASE_RETRY_DELAY_MS * 2 ** Math.max(attemptCount - 1, 0),
    MAX_RETRY_DELAY_MS,
  );
}

export async function dispatchDividendNotifications(
  prisma: PrismaClient,
  limit = 100,
) {
  if (!('notificationDelivery' in prisma) || !('pushSubscription' in prisma))
    return;

  const now = new Date();
  const pending = await prisma.notificationDelivery.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: now } },
    include: {
      user: {
        select: {
          pushSubscriptions: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      },
    },
    orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  for (const job of pending) {
    const locked = await prisma.notificationDelivery.updateMany({
      where: { id: job.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attemptCount: { increment: 1 } },
    });
    if (locked.count === 0) continue;

    try {
      if (job.user.pushSubscriptions.length === 0) {
        await prisma.notificationDelivery.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            lastError: 'No active push subscription for user',
          },
        });
        continue;
      }

      await prisma.notificationDelivery.update({
        where: { id: job.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          lastError: null,
        },
      });

      await prisma.pushSubscription.updateMany({
        where: { userId: job.userId, isActive: true },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      const latest = await prisma.notificationDelivery.findUnique({
        where: { id: job.id },
        select: { attemptCount: true, maxAttempts: true },
      });
      const attempts = latest?.attemptCount ?? 1;
      const maxAttempts = latest?.maxAttempts ?? MAX_ATTEMPTS;
      const retriable = attempts < maxAttempts;

      await prisma.notificationDelivery.update({
        where: { id: job.id },
        data: retriable
          ? {
              status: 'PENDING',
              nextAttemptAt: new Date(Date.now() + retryDelayMs(attempts)),
              lastError:
                error instanceof Error ? error.message : 'Unknown error',
            }
          : {
              status: 'FAILED',
              lastError:
                error instanceof Error
                  ? error.message
                  : 'Unknown error (max retry reached)',
            },
      });
    }
  }
}
