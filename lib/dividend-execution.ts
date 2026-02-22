import type { DividendAction, Prisma } from '@prisma/client';
import { calculatePhotoStorageEmo } from '@/lib/emo-value';

export const RECEIVE_COOLDOWN_DAYS = 7;

export type ExecuteDividendResult =
  | {
      status: 'executed';
      event: Awaited<
        ReturnType<Prisma.TransactionClient['dividendEvent']['create']>
      >;
    }
  | {
      status: 'skipped';
      reason: 'receive_cooldown' | 'already_received_since_planned_dividend';
    };

export async function executeDividendOnStorage(
  tx: Prisma.TransactionClient,
  params: {
    albumId: string;
    storage: {
      id: string;
      photoCount: number;
      baseEmoPerPhoto: number;
      compoundStartDate: Date;
      isCompoundActive: boolean;
    };
    action: DividendAction;
    now?: Date;
    enforceReceiveCooldown?: boolean;
    plannedDividend?: Date | null;
    approvalRequestId?: string;
  },
): Promise<ExecuteDividendResult> {
  const {
    albumId,
    storage,
    action,
    now = new Date(),
    enforceReceiveCooldown = false,
    plannedDividend,
    approvalRequestId,
  } = params;

  if (action === 'RECEIVE') {
    if (plannedDividend) {
      const alreadyReceivedSincePlannedDividend =
        await tx.dividendEvent.findFirst({
          where: {
            photoStorageId: storage.id,
            action: 'RECEIVE',
            executedAt: { gte: plannedDividend },
          },
          select: { id: true },
        });
      if (alreadyReceivedSincePlannedDividend) {
        return {
          status: 'skipped',
          reason: 'already_received_since_planned_dividend',
        };
      }
    }

    if (enforceReceiveCooldown) {
      const cooldownSince = new Date(now);
      cooldownSince.setDate(cooldownSince.getDate() - RECEIVE_COOLDOWN_DAYS);
      const recentReceive = await tx.dividendEvent.findFirst({
        where: {
          photoStorageId: storage.id,
          action: 'RECEIVE',
          executedAt: { gte: cooldownSince },
        },
        select: { id: true },
      });
      if (recentReceive) {
        return {
          status: 'skipped',
          reason: 'receive_cooldown',
        };
      }
    }
  }

  let emoValue: number;
  if (action === 'REINVEST' && !storage.isCompoundActive) {
    const lastReceive = await tx.dividendEvent.findFirst({
      where: { photoStorageId: storage.id, action: 'RECEIVE' },
      orderBy: { executedAt: 'desc' },
      select: { emoValueAtEvent: true },
    });
    emoValue = lastReceive?.emoValueAtEvent ?? 0;
  } else {
    emoValue = calculatePhotoStorageEmo({
      photoCount: storage.photoCount,
      baseEmoPerPhoto: storage.baseEmoPerPhoto,
      compoundStartDate: storage.compoundStartDate,
      isCompoundActive: true,
    });
  }

  const previousBaseEmo = storage.baseEmoPerPhoto;

  if (action === 'REINVEST') {
    const newBaseEmo = storage.baseEmoPerPhoto * 2;
    await tx.photoStorage.update({
      where: { id: storage.id },
      data: {
        baseEmoPerPhoto: newBaseEmo,
        compoundStartDate: now,
        isCompoundActive: true,
      },
    });

    const event = await tx.dividendEvent.create({
      data: {
        albumId,
        photoStorageId: storage.id,
        action: 'REINVEST',
        emoValueAtEvent: emoValue,
        previousBaseEmo,
        newBaseEmo,
      },
    });

    return { status: 'executed', event };
  }

  await tx.photoStorage.update({
    where: { id: storage.id },
    data: { isCompoundActive: false },
  });

  const event = await tx.dividendEvent.create({
    data: {
      albumId,
      photoStorageId: storage.id,
      action: 'RECEIVE',
      emoValueAtEvent: emoValue,
      previousBaseEmo,
      newBaseEmo: 0,
      approvalRequestId,
    },
  });

  return { status: 'executed', event };
}
