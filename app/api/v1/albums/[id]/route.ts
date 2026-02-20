import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getAlbumDetail } from '@/lib/services/album-service';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const album = await getAlbumDetail(id, userId, userEmail ?? '');

  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  return NextResponse.json(album, { status: 200 });
}
