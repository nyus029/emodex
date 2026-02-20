import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { toAlbumResponse } from '@/lib/albums';
import { findAccessibleAlbum } from '@/lib/album-access';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const accessibleAlbum = await findAccessibleAlbum(
    id,
    userId,
    userEmail ?? '',
  );

  if (!accessibleAlbum) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      group: true,
      photoStorages: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          photos: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });

  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  return NextResponse.json(toAlbumResponse(album), { status: 200 });
}
