import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { calculatePhotoStorageEmo } from '../lib/emo-value';

const MOCK_USERS = [
  { email: 'user-1@example.com', name: 'User One' },
  { email: 'user-2@example.com', name: 'User Two' },
  { email: 'user-3@example.com', name: 'User Three' },
  { email: 'user-4@example.com', name: 'User Four' },
];

async function main() {
  const usersByEmail = new Map<string, number>();

  for (const user of MOCK_USERS) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: user,
    });
    usersByEmail.set(user.email, upsertedUser.id);
  }

  const tripGroupAdminId = usersByEmail.get('user-1@example.com');
  const familyGroupAdminId = usersByEmail.get('user-2@example.com');
  if (!tripGroupAdminId || !familyGroupAdminId) {
    throw new Error('Seed users were not prepared correctly');
  }

  const tripGroupName = 'Seed Trip Group';
  const familyGroupName = 'Seed Family Group';

  const existingTripGroup = await prisma.group.findFirst({
    where: { groupName: tripGroupName },
    select: { id: true },
  });
  const existingFamilyGroup = await prisma.group.findFirst({
    where: { groupName: familyGroupName },
    select: { id: true },
  });

  const tripGroup = existingTripGroup
    ? await prisma.group.update({
        where: { id: existingTripGroup.id },
        data: { adminUserId: tripGroupAdminId },
      })
    : await prisma.group.create({
        data: { groupName: tripGroupName, adminUserId: tripGroupAdminId },
      });

  const familyGroup = existingFamilyGroup
    ? await prisma.group.update({
        where: { id: existingFamilyGroup.id },
        data: { adminUserId: familyGroupAdminId },
      })
    : await prisma.group.create({
        data: { groupName: familyGroupName, adminUserId: familyGroupAdminId },
      });

  const userThreeId = usersByEmail.get('user-3@example.com');
  const userFourId = usersByEmail.get('user-4@example.com');
  if (!userThreeId || !userFourId) {
    throw new Error('Seed users were not prepared correctly');
  }

  const seedMemberships = [
    {
      userId: tripGroupAdminId,
      groupId: tripGroup.id,
      role: 'ADMIN' as const,
    },
    {
      userId: userThreeId,
      groupId: tripGroup.id,
      role: 'MEMBER' as const,
    },
    {
      userId: familyGroupAdminId,
      groupId: familyGroup.id,
      role: 'ADMIN' as const,
    },
    {
      userId: userFourId,
      groupId: familyGroup.id,
      role: 'MEMBER' as const,
    },
  ];

  for (const membership of seedMemberships) {
    await prisma.membership.upsert({
      where: {
        userId_groupId: {
          userId: membership.userId,
          groupId: membership.groupId,
        },
      },
      update: { role: membership.role },
      create: membership,
    });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const seedAlbums = [
    {
      name: 'Seed Family Album',
      rootPath: 'seed-family-album',
      userId: 'auth0|seed-user-family',
      requiredAtAlbumCreation: false,
      createdTags: ['family', 'travel'],
      plannedDividend: sevenDaysFromNow,
      compoundStartDate: thirtyDaysAgo,
      storages: [
        {
          name: 'day-1',
          storagePath: 'seed-family-album/day-1',
          files: [
            {
              fileName: 'beach.jpg',
              blobPath: 'seed-family-album/day-1/beach.jpg',
              blobUrl:
                'https://example.com/blob/seed-family-album/day-1/beach.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 128_000,
            },
            {
              fileName: 'lunch.jpg',
              blobPath: 'seed-family-album/day-1/lunch.jpg',
              blobUrl:
                'https://example.com/blob/seed-family-album/day-1/lunch.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 156_000,
            },
          ],
        },
      ],
    },
    {
      name: 'Seed Event Album',
      rootPath: 'seed-event-album',
      userId: 'auth0|seed-user-event',
      requiredAtAlbumCreation: true,
      createdTags: ['event', 'friends'],
      plannedDividend: null as Date | null,
      compoundStartDate: thirtyDaysAgo,
      storages: [
        {
          name: 'opening',
          storagePath: 'seed-event-album/opening',
          files: [
            {
              fileName: 'stage.png',
              blobPath: 'seed-event-album/opening/stage.png',
              blobUrl:
                'https://example.com/blob/seed-event-album/opening/stage.png',
              contentType: 'image/png',
              sizeBytes: 240_000,
            },
          ],
        },
      ],
    },
  ];

  for (const albumSeed of seedAlbums) {
    const album = await prisma.album.upsert({
      where: { name: albumSeed.name },
      update: {
        userId: albumSeed.userId,
        rootPath: albumSeed.rootPath,
        createdTags: albumSeed.createdTags,
        requiredAtAlbumCreation: albumSeed.requiredAtAlbumCreation,
        plannedDividend: albumSeed.plannedDividend,
      },
      create: {
        name: albumSeed.name,
        userId: albumSeed.userId,
        rootPath: albumSeed.rootPath,
        createdTags: albumSeed.createdTags,
        requiredAtAlbumCreation: albumSeed.requiredAtAlbumCreation,
        plannedDividend: albumSeed.plannedDividend,
      },
    });

    for (const storageSeed of albumSeed.storages) {
      const totalSizeBytes = storageSeed.files.reduce(
        (total, file) => total + file.sizeBytes,
        0,
      );
      const photoStorage = await prisma.photoStorage.upsert({
        where: {
          albumId_name: {
            albumId: album.id,
            name: storageSeed.name,
          },
        },
        update: {
          storagePath: storageSeed.storagePath,
          photoCount: storageSeed.files.length,
          totalSizeBytes: BigInt(totalSizeBytes),
          compoundStartDate: albumSeed.compoundStartDate,
        },
        create: {
          albumId: album.id,
          name: storageSeed.name,
          storagePath: storageSeed.storagePath,
          photoCount: storageSeed.files.length,
          totalSizeBytes: BigInt(totalSizeBytes),
          compoundStartDate: albumSeed.compoundStartDate,
        },
      });

      await prisma.photoStoragePhoto.deleteMany({
        where: { photoStorageId: photoStorage.id },
      });
      await prisma.photoStoragePhoto.createMany({
        data: storageSeed.files.map((file) => ({
          photoStorageId: photoStorage.id,
          fileName: file.fileName,
          blobPath: file.blobPath,
          blobUrl: file.blobUrl,
          contentType: file.contentType,
          sizeBytes: BigInt(file.sizeBytes),
        })),
      });

      // Generate 30 days of EmoSnapshot history
      await prisma.emoSnapshot.deleteMany({
        where: { photoStorageId: photoStorage.id },
      });
      const snapshotData = [];
      for (let d = 0; d < 30; d++) {
        const snapshotDate = new Date(albumSeed.compoundStartDate);
        snapshotDate.setDate(snapshotDate.getDate() + d);
        snapshotDate.setHours(0, 0, 0, 0);

        const emoValue = calculatePhotoStorageEmo({
          photoCount: storageSeed.files.length,
          baseEmoPerPhoto: 100,
          compoundStartDate: albumSeed.compoundStartDate,
          isCompoundActive: true,
          asOfDate: snapshotDate,
        });

        snapshotData.push({
          photoStorageId: photoStorage.id,
          snapshotDate,
          emoValue,
        });
      }
      await prisma.emoSnapshot.createMany({ data: snapshotData });
    }
  }

  const localAdminUser = await prisma.user.upsert({
    where: { email: 'renlijinjiubao808@gmail.com' },
    update: { name: 'Local System Admin' },
    create: {
      email: 'renlijinjiubao808@gmail.com',
      name: 'Local System Admin',
    },
  });
  await prisma.systemAdministrator.upsert({
    where: { userId: localAdminUser.id },
    update: { createdByUserId: localAdminUser.id },
    create: {
      userId: localAdminUser.id,
      createdByUserId: localAdminUser.id,
    },
  });
  const totalSystemAdministrators = await prisma.systemAdministrator.count();

  console.log(
    `Seeded users=${MOCK_USERS.length}, groups=2, memberships=${seedMemberships.length}, albums=${seedAlbums.length}, systemAdministrators=${totalSystemAdministrators}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
