import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createPhotoStorageSchema,
  resolveStoragePath,
  sumFileSize,
} from '@/lib/photo-storage';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = createPhotoStorageSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const album = await prisma.album.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  const totalSizeBytes = sumFileSize(parsed.data.files);
  let storagePath = '';
  try {
    storagePath = resolveStoragePath(parsed.data.files);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid photo storage files';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const createdPhotoStorage = await prisma.photoStorage.create({
      data: {
        albumId: id,
        name: parsed.data.name,
        storagePath,
        photoCount: parsed.data.files.length,
        totalSizeBytes,
        photos: {
          create: parsed.data.files.map((file) => ({
            fileName: file.fileName,
            blobPath: file.blobPath,
            blobUrl: file.blobUrl,
            contentType: file.contentType ?? null,
            sizeBytes: file.sizeBytes,
          })),
        },
      },
      include: {
        photos: true,
      },
    });

    return NextResponse.json(
      {
        albumId: id,
        photoStorage: {
          id: createdPhotoStorage.id,
          name: createdPhotoStorage.name,
          storagePath: createdPhotoStorage.storagePath,
          photoCount: createdPhotoStorage.photoCount,
          totalSizeBytes: createdPhotoStorage.totalSizeBytes,
          createdAt: createdPhotoStorage.createdAt.toISOString(),
          photos: createdPhotoStorage.photos.map((photo) => ({
            id: photo.id,
            fileName: photo.fileName,
            blobPath: photo.blobPath,
            blobUrl: photo.blobUrl,
            contentType: photo.contentType,
            sizeBytes: photo.sizeBytes,
          })),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: '同じphoto_storage名が既に存在します' },
      { status: 409 },
    );
  }
}
