import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toAlbumResponse } from '@/lib/albums';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
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
