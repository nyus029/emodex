import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

type UploadClientPayload = {
  albumId?: string;
  storagePath?: string;
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
        if (!clientPayload) {
          throw new Error('clientPayload is required');
        }

        const parsedPayload = JSON.parse(clientPayload) as UploadClientPayload;

        if (!parsedPayload.storagePath || !parsedPayload.albumId) {
          throw new Error(
            'albumId and storagePath are required in clientPayload',
          );
        }

        if (!pathname.startsWith(`${parsedPayload.storagePath}/`)) {
          throw new Error('Invalid upload path');
        }

        const album = await prisma.album.findFirst({
          where: { id: parsedPayload.albumId, userId },
          select: { rootPath: true },
        });
        if (!album) {
          throw new Error('Album not found');
        }

        if (!parsedPayload.storagePath.startsWith(`${album.rootPath}/`)) {
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
