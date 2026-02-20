import { z } from 'zod';

export const createPhotoStorageSchema = z.object({
  name: z.string().trim().min(1).max(191),
  files: z
    .array(
      z.object({
        fileName: z.string().trim().min(1).max(191),
        blobPath: z.string().trim().min(1).max(191),
        blobUrl: z.string().url().max(191),
        contentType: z.string().trim().min(1).max(191).optional(),
        sizeBytes: z
          .number()
          .int()
          .positive()
          .max(1024 * 1024 * 1024),
      }),
    )
    .min(1)
    .max(200),
});

export type CreatePhotoStorageInput = z.infer<typeof createPhotoStorageSchema>;

export function resolveStoragePath(
  files: CreatePhotoStorageInput['files'],
): string {
  const storagePath = files[0]?.blobPath.split('/').slice(0, -1).join('/');

  if (!storagePath) {
    throw new Error('Invalid blob path');
  }

  const hasDifferentStoragePath = files.some(
    (file) => file.blobPath.split('/').slice(0, -1).join('/') !== storagePath,
  );

  if (hasDifferentStoragePath) {
    throw new Error('files must belong to the same storage path');
  }

  return storagePath;
}

export function sumFileSize(files: CreatePhotoStorageInput['files']): number {
  return files.reduce((sum, file) => sum + file.sizeBytes, 0);
}
