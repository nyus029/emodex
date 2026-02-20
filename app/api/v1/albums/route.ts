import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { toAlbumResponse } from '@/lib/albums';
import type { AlbumListItem } from '@/lib/albums';
import { toPathSegment } from '@/lib/path';

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

  const ownAlbums = await prisma.album.findMany({
    where: { userId },
    include: {
      group: true,
      _count: { select: { photoStorages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let sharedAlbums: typeof ownAlbums = [];
  if (userEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (dbUser) {
      const memberships = await prisma.membership.findMany({
        where: { userId: dbUser.id },
        select: { groupId: true },
      });
      const groupIds = memberships.map((m) => m.groupId);

      if (groupIds.length > 0) {
        sharedAlbums = await prisma.album.findMany({
          where: {
            albumType: 'SHARED',
            groupId: { in: groupIds },
            NOT: { userId },
          },
          include: {
            group: true,
            _count: { select: { photoStorages: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }
  }

  const toTagArray = (tags: Prisma.JsonValue | null): string[] => {
    if (!Array.isArray(tags)) return [];
    return tags.filter((tag): tag is string => typeof tag === 'string');
  };

  const toListItem = (album: (typeof ownAlbums)[number]): AlbumListItem => ({
    id: album.id,
    name: album.name,
    albumType: album.albumType,
    rootPath: album.rootPath,
    groupId: album.groupId,
    groupName: album.group?.groupName ?? null,
    createdTags: toTagArray(album.createdTags),
    photoStorageCount: album._count.photoStorages,
  });

  const albums = [
    ...ownAlbums.map(toListItem),
    ...sharedAlbums.map(toListItem),
  ];

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

  const {
    name,
    albumType,
    groupId,
    plannedDividend,
    createdTags,
    requiredAtAlbumCreation,
  } = parsed.data;

  const resolvedAlbumType = albumType ?? 'PRIVATE';

  if (resolvedAlbumType === 'SHARED' && groupId) {
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unable to verify group membership' },
        { status: 400 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 },
      );
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: dbUser.id, groupId },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 },
      );
    }
  }

  const rootPath = toPathSegment(name);

  try {
    const album = await prisma.album.create({
      data: {
        name,
        userId,
        rootPath,
        albumType: resolvedAlbumType,
        groupId: resolvedAlbumType === 'SHARED' ? (groupId ?? null) : null,
        plannedDividend: plannedDividend ? new Date(plannedDividend) : null,
        createdTags: createdTags ?? [],
        requiredAtAlbumCreation: requiredAtAlbumCreation ?? false,
      },
      include: {
        group: true,
        photoStorages: {
          include: {
            photos: true,
          },
        },
      },
    });

    return NextResponse.json(toAlbumResponse(album), { status: 201 });
  } catch (error) {
    const isUniqueConstraintError =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002') ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002');
    if (isUniqueConstraintError) {
      return NextResponse.json(
        { error: '同じアルバム名（またはルートパス）が既に存在します' },
        { status: 409 },
      );
    }

    console.error('Failed to create album', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
