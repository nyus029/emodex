import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth0 } from '@/lib/auth0';
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
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = createPhotoStorageSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const album = await prisma.album.findFirst({
    where: { id, userId },
    select: { id: true, rootPath: true },
  });

  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  const totalSizeBytes = BigInt(sumFileSize(parsed.data.files));
  let storagePath = '';
  try {
    storagePath = resolveStoragePath(parsed.data.files);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid photo storage files';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (!storagePath.startsWith(`${album.rootPath}/`)) {
      return NextResponse.json(
        { error: 'Invalid storage path' },
        { status: 400 },
      );
    }

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
            sizeBytes: BigInt(file.sizeBytes),
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
          totalSizeBytes: Number(createdPhotoStorage.totalSizeBytes),
          createdAt: createdPhotoStorage.createdAt.toISOString(),
          photos: createdPhotoStorage.photos.map((photo) => ({
            id: photo.id,
            fileName: photo.fileName,
            blobPath: photo.blobPath,
            blobUrl: photo.blobUrl,
            contentType: photo.contentType,
            sizeBytes: Number(photo.sizeBytes),
          })),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const uniqueTarget =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target)
        ? error.meta.target.map(String)
        : [];
    const isUniqueConstraintError =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002') ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002');
    if (
      isUniqueConstraintError &&
      (uniqueTarget.length === 0 ||
        uniqueTarget.includes('PhotoStorage_albumId_name_key') ||
        (uniqueTarget.includes('albumId') && uniqueTarget.includes('name')))
    ) {
      return NextResponse.json(
        { error: '同じphoto_storage名が既に存在します' },
        { status: 409 },
      );
    }

    console.error('Failed to create photo storage', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
