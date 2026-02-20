import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { createPhotoStorageSchema } from '@/lib/photo-storage';
import { createPhotoStorage } from '@/lib/services/album-service';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;
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

  const result = await createPhotoStorage(
    id,
    userId,
    userEmail ?? '',
    parsed.data,
  );

  if (!result.success) {
    const statusMap = {
      ALBUM_NOT_FOUND: 404,
      INVALID_STORAGE_PATH: 400,
      DUPLICATE: 409,
      INTERNAL: 500,
    } as const;
    return NextResponse.json(
      { error: result.error.message },
      { status: statusMap[result.error.kind] },
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}
