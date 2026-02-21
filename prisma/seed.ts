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

  // --- System Admin (created early so albums can reference the group) ---
  const localAdminUser = await prisma.user.upsert({
    where: { email: process.env.SYSTEM_ADMIN_BOOTSTRAP_EMAILS ?? '' },
    update: { name: 'Local System Admin' },
    create: {
      email: process.env.SYSTEM_ADMIN_BOOTSTRAP_EMAILS ?? '',
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

  const adminGroupName = 'Seed Admin Group';
  const existingAdminGroup = await prisma.group.findFirst({
    where: { groupName: adminGroupName },
    select: { id: true },
  });
  const adminGroup = existingAdminGroup
    ? await prisma.group.update({
        where: { id: existingAdminGroup.id },
        data: { adminUserId: localAdminUser.id },
      })
    : await prisma.group.create({
        data: { groupName: adminGroupName, adminUserId: localAdminUser.id },
      });

  await prisma.membership.upsert({
    where: {
      userId_groupId: {
        userId: localAdminUser.id,
        groupId: adminGroup.id,
      },
    },
    update: { role: 'ADMIN' },
    create: {
      userId: localAdminUser.id,
      groupId: adminGroup.id,
      role: 'ADMIN',
    },
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const seedAlbums = [
    {
      name: 'Seed Family Album',
      rootPath: 'seed-family-album',
      userId: 'auth0|seed-user-family',
      requiredAtAlbumCreation: false,
      createdTags: ['family', 'travel'],
      plannedDividend: sevenDaysFromNow,
      compoundStartDate: thirtyDaysAgo,
      snapshotDays: 30,
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
      snapshotDays: 30,
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
    {
      name: 'Seed Dividend Album',
      rootPath: 'seed-dividend-album',
      userId: 'auth0|seed-user-dividend',
      albumType: 'SHARED' as const,
      groupId: adminGroup.id,
      requiredAtAlbumCreation: false,
      createdTags: ['dividend', 'memories'],
      plannedDividend: sevenDaysAgo,
      compoundStartDate: thirtyDaysAgo,
      snapshotDays: 30,
      storages: [
        {
          name: 'spring-trip',
          storagePath: 'seed-dividend-album/spring-trip',
          files: [
            {
              fileName: 'sakura.jpg',
              blobPath: 'seed-dividend-album/spring-trip/sakura.jpg',
              blobUrl:
                'https://example.com/blob/seed-dividend-album/spring-trip/sakura.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 180_000,
            },
            {
              fileName: 'temple.jpg',
              blobPath: 'seed-dividend-album/spring-trip/temple.jpg',
              blobUrl:
                'https://example.com/blob/seed-dividend-album/spring-trip/temple.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 210_000,
            },
          ],
        },
        {
          name: 'summer-bbq',
          storagePath: 'seed-dividend-album/summer-bbq',
          files: [
            {
              fileName: 'grill.jpg',
              blobPath: 'seed-dividend-album/summer-bbq/grill.jpg',
              blobUrl:
                'https://example.com/blob/seed-dividend-album/summer-bbq/grill.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 150_000,
            },
          ],
        },
        {
          name: 'autumn-hike',
          storagePath: 'seed-dividend-album/autumn-hike',
          files: [
            {
              fileName: 'mountain.jpg',
              blobPath: 'seed-dividend-album/autumn-hike/mountain.jpg',
              blobUrl:
                'https://example.com/blob/seed-dividend-album/autumn-hike/mountain.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 195_000,
            },
            {
              fileName: 'sunset.jpg',
              blobPath: 'seed-dividend-album/autumn-hike/sunset.jpg',
              blobUrl:
                'https://example.com/blob/seed-dividend-album/autumn-hike/sunset.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 220_000,
            },
            {
              fileName: 'trail.jpg',
              blobPath: 'seed-dividend-album/autumn-hike/trail.jpg',
              blobUrl:
                'https://example.com/blob/seed-dividend-album/autumn-hike/trail.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 175_000,
            },
          ],
        },
      ],
    },
    {
      name: 'Seed 1Year Album',
      rootPath: 'seed-1year-album',
      userId: 'auth0|seed-user-1year',
      albumType: 'SHARED' as const,
      groupId: adminGroup.id,
      requiredAtAlbumCreation: false,
      createdTags: ['1year', 'growth'],
      plannedDividend: threeDaysAgo,
      compoundStartDate: oneYearAgo,
      snapshotDays: 365,
      storages: [
        {
          name: 'childhood',
          storagePath: 'seed-1year-album/childhood',
          files: [
            {
              fileName: 'first-steps.jpg',
              blobPath: 'seed-1year-album/childhood/first-steps.jpg',
              blobUrl:
                'https://example.com/blob/seed-1year-album/childhood/first-steps.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 200_000,
            },
            {
              fileName: 'birthday.jpg',
              blobPath: 'seed-1year-album/childhood/birthday.jpg',
              blobUrl:
                'https://example.com/blob/seed-1year-album/childhood/birthday.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 185_000,
            },
            {
              fileName: 'park.jpg',
              blobPath: 'seed-1year-album/childhood/park.jpg',
              blobUrl:
                'https://example.com/blob/seed-1year-album/childhood/park.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 170_000,
            },
            {
              fileName: 'drawing.jpg',
              blobPath: 'seed-1year-album/childhood/drawing.jpg',
              blobUrl:
                'https://example.com/blob/seed-1year-album/childhood/drawing.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 150_000,
            },
            {
              fileName: 'holiday.jpg',
              blobPath: 'seed-1year-album/childhood/holiday.jpg',
              blobUrl:
                'https://example.com/blob/seed-1year-album/childhood/holiday.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 210_000,
            },
          ],
        },
        {
          name: 'graduation',
          storagePath: 'seed-1year-album/graduation',
          files: [
            {
              fileName: 'ceremony.jpg',
              blobPath: 'seed-1year-album/graduation/ceremony.jpg',
              blobUrl:
                'https://example.com/blob/seed-1year-album/graduation/ceremony.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 230_000,
            },
            {
              fileName: 'group-photo.jpg',
              blobPath: 'seed-1year-album/graduation/group-photo.jpg',
              blobUrl:
                'https://example.com/blob/seed-1year-album/graduation/group-photo.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 250_000,
            },
            {
              fileName: 'celebration.jpg',
              blobPath: 'seed-1year-album/graduation/celebration.jpg',
              blobUrl:
                'https://example.com/blob/seed-1year-album/graduation/celebration.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 190_000,
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
        albumType: albumSeed.albumType ?? 'PRIVATE',
        groupId: albumSeed.groupId ?? null,
        createdTags: albumSeed.createdTags,
        requiredAtAlbumCreation: albumSeed.requiredAtAlbumCreation,
        plannedDividend: albumSeed.plannedDividend,
      },
      create: {
        name: albumSeed.name,
        userId: albumSeed.userId,
        rootPath: albumSeed.rootPath,
        albumType: albumSeed.albumType ?? 'PRIVATE',
        groupId: albumSeed.groupId ?? null,
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

      await prisma.photoStorage.upsert({
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

      const photoStorage = await prisma.photoStorage.findUniqueOrThrow({
        where: {
          albumId_name: {
            albumId: album.id,
            name: storageSeed.name,
          },
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

      // Generate EmoSnapshot history
      await prisma.emoSnapshot.deleteMany({
        where: { photoStorageId: photoStorage.id },
      });
      const days = albumSeed.snapshotDays ?? 30;
      const snapshotData = [];
      for (let d = 0; d < days; d++) {
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

  // Seed DividendEvents for "Seed Dividend Album"
  const dividendAlbum = await prisma.album.findUnique({
    where: { name: 'Seed Dividend Album' },
    include: { photoStorages: true },
  });

  if (dividendAlbum) {
    // Clear existing dividend events for this album
    await prisma.dividendEvent.deleteMany({
      where: { albumId: dividendAlbum.id },
    });

    const springTrip = dividendAlbum.photoStorages.find(
      (s) => s.name === 'spring-trip',
    );
    const summerBbq = dividendAlbum.photoStorages.find(
      (s) => s.name === 'summer-bbq',
    );

    // spring-trip: REINVEST completed — doubled base, reset compound
    if (springTrip) {
      const emoAtEvent = calculatePhotoStorageEmo({
        photoCount: springTrip.photoCount,
        baseEmoPerPhoto: 100,
        compoundStartDate: thirtyDaysAgo,
        isCompoundActive: true,
        asOfDate: sevenDaysAgo,
      });

      await prisma.dividendEvent.create({
        data: {
          albumId: dividendAlbum.id,
          photoStorageId: springTrip.id,
          action: 'REINVEST',
          emoValueAtEvent: emoAtEvent,
          previousBaseEmo: 100,
          newBaseEmo: 200,
          executedAt: sevenDaysAgo,
        },
      });

      await prisma.photoStorage.update({
        where: { id: springTrip.id },
        data: {
          baseEmoPerPhoto: 200,
          compoundStartDate: sevenDaysAgo,
        },
      });
    }

    // summer-bbq: RECEIVE completed — compound stopped
    if (summerBbq) {
      const emoAtEvent = calculatePhotoStorageEmo({
        photoCount: summerBbq.photoCount,
        baseEmoPerPhoto: 100,
        compoundStartDate: thirtyDaysAgo,
        isCompoundActive: true,
        asOfDate: sevenDaysAgo,
      });

      await prisma.dividendEvent.create({
        data: {
          albumId: dividendAlbum.id,
          photoStorageId: summerBbq.id,
          action: 'RECEIVE',
          emoValueAtEvent: emoAtEvent,
          previousBaseEmo: 100,
          newBaseEmo: 0,
          executedAt: sevenDaysAgo,
        },
      });

      await prisma.photoStorage.update({
        where: { id: summerBbq.id },
        data: { isCompoundActive: false },
      });
    }

    // autumn-hike: no event — remains pending
    const dividendEventCount = await prisma.dividendEvent.count({
      where: { albumId: dividendAlbum.id },
    });
    console.log(
      `Seeded dividendEvents=${dividendEventCount} for "${dividendAlbum.name}" (pending: autumn-hike)`,
    );
  }

  const totalSystemAdministrators = await prisma.systemAdministrator.count();

  console.log(
    `Seeded users=${MOCK_USERS.length + 1}, groups=3, memberships=${seedMemberships.length + 1}, albums=${seedAlbums.length}, systemAdministrators=${totalSystemAdministrators}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
