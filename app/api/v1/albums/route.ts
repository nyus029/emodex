import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth0 } from '@/lib/auth0';
import { listAlbums, createAlbum } from '@/lib/services/album-service';

const createAlbumSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    albumType: z.enum(['PRIVATE', 'SHARED']).optional(),
    groupId: z.number().int().positive().optional(),
    plannedDividend: z.string().datetime().optional(),
    createdTags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    requiredAtAlbumCreation: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.albumType === 'SHARED' && !data.groupId) return false;
      return true;
    },
    { message: 'groupId is required for SHARED albums', path: ['groupId'] },
  );

export async function GET() {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const albums = await listAlbums(userId, userEmail);
  return NextResponse.json(albums, { status: 200 });
}

export async function POST(request: Request) {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  const userEmail = session?.user?.email as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = createAlbumSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await createAlbum(userId, userEmail, parsed.data);

  if (!result.success) {
    const statusMap = {
      MEMBERSHIP_UNVERIFIABLE: 400,
      USER_NOT_FOUND: 404,
      NOT_A_MEMBER: 403,
      DUPLICATE: 409,
      INTERNAL: 500,
    } as const;
    const messageMap = {
      MEMBERSHIP_UNVERIFIABLE: 'Unable to verify group membership',
      USER_NOT_FOUND: 'User not found in database',
      NOT_A_MEMBER: 'You are not a member of this group',
      DUPLICATE: result.error.kind === 'DUPLICATE' ? result.error.message : '',
      INTERNAL: result.error.kind === 'INTERNAL' ? result.error.message : '',
    } as const;
    return NextResponse.json(
      { error: messageMap[result.error.kind] },
      { status: statusMap[result.error.kind] },
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}
