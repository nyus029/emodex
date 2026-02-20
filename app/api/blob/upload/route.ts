import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

type UploadClientPayload = {
  albumId?: string;
};

export async function POST(request: Request) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request
    .json()
    .catch(() => null)) as HandleUploadBody | null;

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = clientPayload
          ? (JSON.parse(clientPayload) as UploadClientPayload)
          : null;
        if (!payload?.albumId) {
          throw new Error('albumId is required in clientPayload');
        }
        const album = await prisma.album.findFirst({
          where: { id: payload.albumId, userId },
          select: { rootPath: true },
        });
        if (!album) {
          throw new Error('Album not found');
        }

        const normalizedPathname = pathname.startsWith('/')
          ? pathname.slice(1)
          : pathname;
        const allowedPrefix = `${album.rootPath}/`;

        if (!normalizedPathname.startsWith(allowedPrefix)) {
          throw new Error('Invalid storage path');
        }

        return {
          allowedContentTypes: ['image/*'],
          maximumSizeInBytes: 50 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Upload setup failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
