import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toAlbumResponse, toTagArray } from '@/lib/albums';
import type { AlbumListItem } from '@/lib/albums';
import { toPathSegment } from '@/lib/path';
import {
  requireAuth,
  parseBody,
  jsonSuccess,
  jsonError,
  isPrismaUniqueConstraintError,
} from '@/lib/api-utils';

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
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

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

  return jsonSuccess(albums);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, createAlbumSchema);
  if (parsed.error) return parsed.error;

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
      return jsonError('Unable to verify group membership', 400);
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!dbUser) {
      return jsonError('User not found in database', 404);
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: dbUser.id, groupId },
      },
    });

    if (!membership) {
      return jsonError('You are not a member of this group', 403);
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

    return jsonSuccess(toAlbumResponse(album), 201);
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return jsonError(
        '同じアルバム名（またはルートパス）が既に存在します',
        409,
      );
    }

    console.error('Failed to create album', error);
    return jsonError('Internal server error', 500);
  }
}
