import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import {
  calculateAlbumEmo,
  calculateDayOverDayChange,
  type StorageParams,
} from '@/lib/emo-value';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const album = await findAccessibleAlbum(id, userId, userEmail ?? '');
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  const photoStorages = await prisma.photoStorage.findMany({
    where: { albumId: id },
    select: {
      photoCount: true,
      baseEmoPerPhoto: true,
      compoundStartDate: true,
      isCompoundActive: true,
    },
  });

  const storages: StorageParams[] = photoStorages.map((ps) => ({
    photoCount: ps.photoCount,
    baseEmoPerPhoto: ps.baseEmoPerPhoto,
    compoundStartDate: ps.compoundStartDate,
    isCompoundActive: ps.isCompoundActive,
  }));

  const emoValue = calculateAlbumEmo(storages);
  const dayOverDayChange = calculateDayOverDayChange(storages);

  return NextResponse.json(
    {
      albumBasicInfo: {
        name: album.name,
        createdAt: album.createdAt.toISOString().split('T')[0],
        plannedDividend: album.plannedDividend?.toISOString() ?? null,
      },
      emoValueInfo: {
        emoValue: Math.round(emoValue * 100) / 100,
        dayOverDayChange,
      },
    },
    { status: 200 },
  );
}
