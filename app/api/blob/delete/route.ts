import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth0 } from '@/lib/auth0';

const deleteBlobSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(200),
});

export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = deleteBlobSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await del(parsed.data.urls);
    return NextResponse.json(
      { deleted: parsed.data.urls.length },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to delete blobs', error);
    return NextResponse.json(
      { error: 'Failed to delete blobs' },
      { status: 500 },
    );
  }
}
