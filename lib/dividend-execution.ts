import type { PrismaClient } from '@prisma/client';
import {
  dispatchDividendNotifications,
  enqueueDividendNotifications,
} from '@/lib/server-notification';

export async function executeDueDividends(
  prisma: PrismaClient,
  params: {
    events: Array<{ id: string; photoStorageName: string }>;
    albumType: 'PRIVATE' | 'SHARED';
    groupId: number | null;
    initiatedByDbUserId?: number;
  },
) {
  for (const event of params.events) {
    await enqueueDividendNotifications(prisma, {
      dividendEventId: event.id,
      storageName: event.photoStorageName,
      albumType: params.albumType,
      groupId: params.groupId,
      initiatedByDbUserId: params.initiatedByDbUserId,
    });
  }

  await dispatchDividendNotifications(prisma);
}
