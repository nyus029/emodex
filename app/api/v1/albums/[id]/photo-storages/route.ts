import { prisma } from '@/lib/prisma';
import { findAccessibleAlbum } from '@/lib/album-access';
import {
  createPhotoStorageSchema,
  resolveStoragePath,
  sumFileSize,
} from '@/lib/photo-storage';
import { toTagArray } from '@/lib/albums';
import {
  requireAuth,
  parseBody,
  jsonSuccess,
  jsonError,
  isPrismaUniqueConstraintError,
} from '@/lib/api-utils';
import type { RouteContext } from '@/types/api';

export async function POST(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const { id } = await context.params;
  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, createPhotoStorageSchema);
  if (parsed.error) return parsed.error;

  const album = await findAccessibleAlbum(id, userId, userEmail ?? '');

  if (!album) {
    return jsonError('Album not found', 404);
  }

  const totalSizeBytes = BigInt(sumFileSize(parsed.data.files));
  let storagePath = '';
  try {
    storagePath = resolveStoragePath(parsed.data.files);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid photo storage files';
    return jsonError(message, 400);
  }

  try {
    if (!storagePath.startsWith(`${album.rootPath}/`)) {
      return jsonError('Invalid storage path', 400);
    }

    const incomingTags = parsed.data.tags ?? [];

    const [createdPhotoStorage] = await prisma.$transaction(async (tx) => {
      const photoStorage = await tx.photoStorage.create({
        data: {
          albumId: id,
          name: parsed.data.name,
          storagePath,
          photoCount: parsed.data.files.length,
          totalSizeBytes,
          tags: incomingTags,
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

      if (incomingTags.length > 0) {
        const currentAlbum = await tx.album.findUnique({
          where: { id },
          select: { storageTags: true },
        });
        const existing = toTagArray(currentAlbum?.storageTags ?? null);
        const merged = Array.from(new Set([...existing, ...incomingTags]));
        await tx.album.update({
          where: { id },
          data: { storageTags: merged },
        });
      }

      return [photoStorage];
    });

    return jsonSuccess(
      {
        albumId: id,
        photoStorage: {
          id: createdPhotoStorage.id,
          name: createdPhotoStorage.name,
          storagePath: createdPhotoStorage.storagePath,
          photoCount: createdPhotoStorage.photoCount,
          totalSizeBytes: Number(createdPhotoStorage.totalSizeBytes),
          tags: Array.isArray(createdPhotoStorage.tags)
            ? createdPhotoStorage.tags
            : [],
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
      201,
    );
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return jsonError('同じphoto_storage名が既に存在します', 409);
    }

    console.error('Failed to create photo storage', error);
    return jsonError('Internal server error', 500);
  }
}
