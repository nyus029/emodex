import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

const deleteBlobSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(200),
});

export async function POST(request: Request) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = deleteBlobSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const uniqueUrls = [...new Set(parsed.data.urls)];

  const ownedPhotos = await prisma.photoStoragePhoto.findMany({
    where: {
      blobUrl: { in: uniqueUrls },
      photoStorage: {
        album: { userId },
      },
    },
    select: { blobUrl: true },
    distinct: ['blobUrl'],
  });

  if (ownedPhotos.length !== uniqueUrls.length) {
    return NextResponse.json(
      { error: 'Forbidden: one or more URLs do not belong to you' },
      { status: 403 },
    );
  }

  try {
    await del(uniqueUrls);
    return NextResponse.json({ deleted: uniqueUrls.length }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete blobs', error);
    return NextResponse.json(
      { error: 'Failed to delete blobs' },
      { status: 500 },
    );
  }
}
