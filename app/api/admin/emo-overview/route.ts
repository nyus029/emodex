import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { getSystemAdministratorAccessByEmail } from '@/lib/system-administrators';
import {
  calculatePhotoStorageEmo,
  calculateAlbumEmo,
  calculateDayOverDayChange,
} from '@/lib/emo-value';

export async function GET() {
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await getSystemAdministratorAccessByEmail(email);
  if (!access.currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [albums, recentSnapshots, recentDividendEvents] = await Promise.all([
    prisma.album.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        photoStorages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            photoCount: true,
            baseEmoPerPhoto: true,
            compoundStartDate: true,
            isCompoundActive: true,
          },
        },
      },
    }),
    prisma.emoSnapshot.findMany({
      where: { snapshotDate: { gte: sevenDaysAgo } },
      orderBy: { snapshotDate: 'desc' },
      include: {
        photoStorage: {
          select: {
            name: true,
            album: { select: { name: true } },
          },
        },
      },
    }),
    prisma.dividendEvent.findMany({
      orderBy: { executedAt: 'desc' },
      take: 20,
      include: {
        album: { select: { name: true } },
        photoStorage: { select: { name: true } },
      },
    }),
  ]);

  let totalEmoValue = 0;

  const albumsPayload = albums.map((album) => {
    const storageParams = album.photoStorages.map((s) => ({
      photoCount: s.photoCount,
      baseEmoPerPhoto: s.baseEmoPerPhoto,
      compoundStartDate: s.compoundStartDate,
      isCompoundActive: s.isCompoundActive,
    }));

    const currentEmoValue =
      Math.round(calculateAlbumEmo(storageParams) * 100) / 100;
    totalEmoValue += currentEmoValue;

    const dayOverDayChange = calculateDayOverDayChange(storageParams);

    return {
      id: album.id,
      name: album.name,
      currentEmoValue,
      dayOverDayChange,
      photoStorages: album.photoStorages.map((s) => ({
        id: s.id,
        name: s.name,
        photoCount: s.photoCount,
        baseEmoPerPhoto: s.baseEmoPerPhoto,
        compoundStartDate: s.compoundStartDate.toISOString(),
        isCompoundActive: s.isCompoundActive,
        currentEmoValue:
          Math.round(
            calculatePhotoStorageEmo({
              photoCount: s.photoCount,
              baseEmoPerPhoto: s.baseEmoPerPhoto,
              compoundStartDate: s.compoundStartDate,
              isCompoundActive: s.isCompoundActive,
            }) * 100,
          ) / 100,
      })),
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    totalEmoValue: Math.round(totalEmoValue * 100) / 100,
    albums: albumsPayload,
    recentSnapshots: recentSnapshots.map((s) => ({
      photoStorageId: s.photoStorageId,
      photoStorageName: s.photoStorage.name,
      albumName: s.photoStorage.album.name,
      snapshotDate: s.snapshotDate.toISOString().split('T')[0],
      emoValue: Math.round(s.emoValue * 100) / 100,
    })),
    recentDividendEvents: recentDividendEvents.map((e) => ({
      id: e.id,
      albumName: e.album.name,
      photoStorageName: e.photoStorage.name,
      action: e.action,
      emoValueAtEvent: Math.round(e.emoValueAtEvent * 100) / 100,
      previousBaseEmo: e.previousBaseEmo,
      newBaseEmo: e.newBaseEmo,
      executedAt: e.executedAt.toISOString(),
    })),
  };

  return NextResponse.json(payload, { status: 200 });
}
