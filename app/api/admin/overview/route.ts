import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import {
  getSystemAdministratorAccessByEmail,
  listSystemAdministrators,
} from '@/lib/system-administrators';

export async function GET() {
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await getSystemAdministratorAccessByEmail(email);
  if (!access.currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [users, groups, albums, systemAdministrators] = await Promise.all([
    prisma.user.findMany({
      orderBy: { id: 'asc' },
      include: {
        memberships: {
          include: {
            group: {
              select: {
                id: true,
                groupName: true,
                adminUserId: true,
              },
            },
          },
          orderBy: { groupId: 'asc' },
        },
      },
    }),
    prisma.group.findMany({
      orderBy: { id: 'asc' },
      include: {
        adminUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { userId: 'asc' }],
        },
      },
    }),
    prisma.album.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        photoStorages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            photoCount: true,
            totalSizeBytes: true,
            createdAt: true,
          },
        },
      },
    }),
    listSystemAdministrators(),
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    currentUser: {
      id: access.currentUser.id,
      name: access.currentUser.name,
      email: access.currentUser.email,
      isRegisteredAdmin: access.isRegisteredAdmin,
      isBootstrapAdmin: access.isBootstrapAdmin,
    },
    systemAdministrators: systemAdministrators.map((admin) => ({
      id: admin.id,
      userId: admin.userId,
      userName: admin.userName,
      userEmail: admin.userEmail,
      createdByUserId: admin.createdByUserId,
      createdByUserEmail: admin.createdByUserEmail,
      createdAt: admin.createdAt,
    })),
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      groupCount: user.memberships.length,
      groups: user.memberships.map((membership) => ({
        groupId: membership.groupId,
        groupName: membership.group.groupName,
        role: membership.role,
        isGroupAdmin: membership.group.adminUserId === user.id,
      })),
    })),
    groups: groups.map((group) => ({
      id: group.id,
      groupName: group.groupName,
      adminUser: group.adminUser,
      memberCount: group.memberships.length,
      members: group.memberships.map((membership) => ({
        userId: membership.userId,
        userName: membership.user.name,
        userEmail: membership.user.email,
        role: membership.role,
      })),
    })),
    albums: albums.map((album) => {
      const totalPhotos = album.photoStorages.reduce(
        (sum, storage) => sum + storage.photoCount,
        0,
      );
      const totalSizeBytes = album.photoStorages.reduce(
        (sum, storage) => sum + Number(storage.totalSizeBytes),
        0,
      );

      return {
        id: album.id,
        name: album.name,
        ownerUserId: album.userId,
        rootPath: album.rootPath,
        createdAt: album.createdAt.toISOString(),
        photoStorageCount: album.photoStorages.length,
        totalPhotos,
        totalSizeBytes,
        photoStorages: album.photoStorages.map((storage) => ({
          id: storage.id,
          name: storage.name,
          photoCount: storage.photoCount,
          totalSizeBytes: Number(storage.totalSizeBytes),
          createdAt: storage.createdAt.toISOString(),
        })),
      };
    }),
  };

  return NextResponse.json(payload, { status: 200 });
}
