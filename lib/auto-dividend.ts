import { prisma } from '@/lib/prisma';
import { executeDividendOnStorage } from '@/lib/dividend-execution';

export async function executeDueDividends(now = new Date()) {
  const candidateStorages = await prisma.photoStorage.findMany({
    where: {
      isCompoundActive: true,
      album: {
        plannedDividend: { lte: now },
      },
    },
    include: {
      album: {
        select: {
          id: true,
          plannedDividend: true,
        },
      },
    },
  });

  const dueStorages = [];
  const skippedReasonCounts: Record<string, number> = {
    already_received_since_planned_dividend: 0,
    receive_cooldown: 0,
  };

  for (const storage of candidateStorages) {
    const plannedDividend = storage.album.plannedDividend;
    if (!plannedDividend) continue;

    const receiveSincePlanned = await prisma.dividendEvent.findFirst({
      where: {
        photoStorageId: storage.id,
        action: 'RECEIVE',
        executedAt: { gte: plannedDividend },
      },
      select: { id: true },
    });

    if (receiveSincePlanned) {
      skippedReasonCounts.already_received_since_planned_dividend += 1;
      continue;
    }

    dueStorages.push(storage);
  }

  let createdEvents = 0;

  for (const storage of dueStorages) {
    const execution = await prisma.$transaction(async (tx) => {
      return executeDividendOnStorage(tx, {
        albumId: storage.album.id,
        storage,
        action: 'RECEIVE',
        now,
        enforceReceiveCooldown: true,
        plannedDividend: storage.album.plannedDividend,
      });
    });

    if (execution.status === 'executed') {
      createdEvents += 1;
    } else {
      skippedReasonCounts[execution.reason] =
        (skippedReasonCounts[execution.reason] ?? 0) + 1;
    }
  }

  return {
    processedStorages: dueStorages.length,
    createdEvents,
    skippedReasonCounts,
  };
}
