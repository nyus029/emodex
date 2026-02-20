import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

        const parsedPayload = JSON.parse(clientPayload) as {
          storagePath?: string;
        };

        if (!parsedPayload.storagePath) {
          throw new Error('storagePath is required in clientPayload');
        }

        if (!pathname.startsWith(`${parsedPayload.storagePath}/`)) {
          throw new Error('Invalid upload path');
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
