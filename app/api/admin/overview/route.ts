import { prisma } from '@/lib/prisma';
import { listSystemAdministrators } from '@/lib/system-administrators';
import { requireAdminAuth, jsonSuccess } from '@/lib/api-utils';

export async function GET() {
  const admin = await requireAdminAuth();
  if (admin.error) return admin.error;

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
      id: admin.currentUser.id,
      name: admin.currentUser.name,
      email: admin.currentUser.email,
      isRegisteredAdmin: admin.isRegisteredAdmin,
      isBootstrapAdmin: admin.isBootstrapAdmin,
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

  return jsonSuccess(payload);
}
