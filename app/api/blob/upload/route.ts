import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { findAccessibleAlbum } from '@/lib/album-access';
import { requireAuth, jsonSuccess, jsonError } from '@/lib/api-utils';

type UploadClientPayload = {
  albumId?: string;
};

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const body = (await request
    .json()
    .catch(() => null)) as HandleUploadBody | null;

  if (!body) {
    return jsonError('Invalid request body', 400);
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

        const album = await findAccessibleAlbum(
          payload.albumId,
          userId,
          userEmail ?? '',
        );
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

    return jsonSuccess(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Upload setup failed';
    return jsonError(message, 400);
  }
}
