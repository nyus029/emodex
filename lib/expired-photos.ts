import { del } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

const PHOTO_VISIBLE_DAYS = 7;
const BLOB_DELETE_BATCH_SIZE = 200;

export async function deleteExpiredPhotos(): Promise<{
  storagesProcessed: number;
  blobsDeleted: number;
}> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PHOTO_VISIBLE_DAYS);

  // Find RECEIVE events older than 7 days where storage is still inactive
  const expiredEvents = await prisma.dividendEvent.findMany({
    where: {
      action: 'RECEIVE',
      executedAt: { lt: cutoff },
      photoStorage: { isCompoundActive: false },
    },
    select: { photoStorageId: true },
    distinct: ['photoStorageId'],
  });

  if (expiredEvents.length === 0) {
    return { storagesProcessed: 0, blobsDeleted: 0 };
  }

  const storageIds = expiredEvents.map((e) => e.photoStorageId);

  // Get photos that still have blob URLs
  const photos = await prisma.photoStoragePhoto.findMany({
    where: {
      photoStorageId: { in: storageIds },
      NOT: { blobUrl: '' },
    },
    select: { id: true, blobUrl: true },
  });

  if (photos.length === 0) {
    return { storagesProcessed: storageIds.length, blobsDeleted: 0 };
  }

  // Delete blobs in batches
  const urls = photos.map((p) => p.blobUrl);
  for (let i = 0; i < urls.length; i += BLOB_DELETE_BATCH_SIZE) {
    const batch = urls.slice(i, i + BLOB_DELETE_BATCH_SIZE);
    await del(batch);
  }

  // Clear blobUrl on deleted photos
  await prisma.photoStoragePhoto.updateMany({
    where: { id: { in: photos.map((p) => p.id) } },
    data: { blobUrl: '' },
  });

  return { storagesProcessed: storageIds.length, blobsDeleted: photos.length };
}
