import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { toAlbumResponse } from '@/lib/albums';
import { toPathSegment } from '@/lib/path';

const createAlbumSchema = z.object({
  name: z.string().trim().min(1).max(120),
  plannedDividend: z.string().datetime().optional(),
  createdTags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  requiredAtAlbumCreation: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = createAlbumSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, plannedDividend, createdTags, requiredAtAlbumCreation } =
    parsed.data;

  const rootPath = toPathSegment(name);

  try {
    const album = await prisma.album.create({
      data: {
        name,
        userId,
        rootPath,
        plannedDividend: plannedDividend ? new Date(plannedDividend) : null,
        createdTags: createdTags ?? [],
        requiredAtAlbumCreation: requiredAtAlbumCreation ?? false,
      },
      include: {
        photoStorages: {
          include: {
            photos: true,
          },
        },
      },
    });

    return NextResponse.json(toAlbumResponse(album), { status: 201 });
  } catch (error) {
    const isUniqueConstraintError =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002') ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002');
    if (isUniqueConstraintError) {
      return NextResponse.json(
        { error: '同じアルバム名（またはルートパス）が既に存在します' },
        { status: 409 },
      );
    }

    console.error('Failed to create album', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
