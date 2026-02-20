import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import { calculatePhotoStorageEmo } from '@/lib/emo-value';

const dividendSchema = z.object({
  action: z.enum(['REINVEST', 'RECEIVE']),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  if (!album.plannedDividend || album.plannedDividend > new Date()) {
    return NextResponse.json(
      { error: 'Dividend date has not been reached yet' },
      { status: 400 },
    );
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = dividendSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { action } = parsed.data;

  const activeStorages = await prisma.photoStorage.findMany({
    where: { albumId: id, isCompoundActive: true },
  });

  if (activeStorages.length === 0) {
    return NextResponse.json(
      { error: 'No active photo storages in this album' },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const events = [];

    for (const storage of activeStorages) {
      const emoValue = calculatePhotoStorageEmo({
        photoCount: storage.photoCount,
        baseEmoPerPhoto: storage.baseEmoPerPhoto,
        compoundStartDate: storage.compoundStartDate,
        isCompoundActive: true,
      });

      const previousBaseEmo = storage.baseEmoPerPhoto;

      if (action === 'REINVEST') {
        const newBaseEmo = storage.baseEmoPerPhoto * 2;
        await tx.photoStorage.update({
          where: { id: storage.id },
          data: {
            baseEmoPerPhoto: newBaseEmo,
            compoundStartDate: new Date(),
          },
        });

        const event = await tx.dividendEvent.create({
          data: {
            albumId: id,
            photoStorageId: storage.id,
            action: 'REINVEST',
            emoValueAtEvent: emoValue,
            previousBaseEmo,
            newBaseEmo,
          },
        });
        events.push(event);
      } else {
        await tx.photoStorage.update({
          where: { id: storage.id },
          data: { isCompoundActive: false },
        });

        const event = await tx.dividendEvent.create({
          data: {
            albumId: id,
            photoStorageId: storage.id,
            action: 'RECEIVE',
            emoValueAtEvent: emoValue,
            previousBaseEmo,
            newBaseEmo: 0,
          },
        });
        events.push(event);
      }
    }

    return events;
  });

  return NextResponse.json(
    {
      action,
      processedStorages: result.length,
      events: result.map((e) => ({
        id: e.id,
        photoStorageId: e.photoStorageId,
        emoValueAtEvent: e.emoValueAtEvent,
        previousBaseEmo: e.previousBaseEmo,
        newBaseEmo: e.newBaseEmo,
      })),
    },
    { status: 200 },
  );
}
