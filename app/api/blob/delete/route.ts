import { del } from '@vercel/blob';
import { z } from 'zod';
import {
  requireAuth,
  parseBody,
  jsonSuccess,
  jsonError,
} from '@/lib/api-utils';

const deleteBlobSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(200),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, deleteBlobSchema);
  if (parsed.error) return parsed.error;

  try {
    await del(parsed.data.urls);
    return jsonSuccess({ deleted: parsed.data.urls.length });
  } catch (error) {
    console.error('Failed to delete blobs', error);
    return jsonError('Failed to delete blobs', 500);
  }
}
