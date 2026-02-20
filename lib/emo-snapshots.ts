import { prisma } from '@/lib/prisma';
import { calculatePhotoStorageEmo } from '@/lib/emo-value';

export async function createDailySnapshots(): Promise<{
  upserted: number;
  date: string;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeStorages = await prisma.photoStorage.findMany({
    where: { isCompoundActive: true },
    select: {
      id: true,
      photoCount: true,
      baseEmoPerPhoto: true,
      compoundStartDate: true,
      isCompoundActive: true,
    },
  });

  let upserted = 0;

  for (const storage of activeStorages) {
    const emoValue = calculatePhotoStorageEmo({
      photoCount: storage.photoCount,
      baseEmoPerPhoto: storage.baseEmoPerPhoto,
      compoundStartDate: storage.compoundStartDate,
      isCompoundActive: true,
      asOfDate: today,
    });

    await prisma.emoSnapshot.upsert({
      where: {
        photoStorageId_snapshotDate: {
          photoStorageId: storage.id,
          snapshotDate: today,
        },
      },
      update: { emoValue },
      create: {
        photoStorageId: storage.id,
        snapshotDate: today,
        emoValue,
      },
    });

    upserted++;
  }

  return {
    upserted,
    date: today.toISOString().split('T')[0],
  };
}
