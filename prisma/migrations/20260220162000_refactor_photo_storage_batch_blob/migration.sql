-- Alter Album table for ownership and normalized paths
ALTER TABLE `Album`
  ADD COLUMN `userId` VARCHAR(191) NULL,
  ADD COLUMN `rootPath` VARCHAR(191) NULL;

-- Backfill user and normalized root path from legacy records
UPDATE `Album`
SET
  `userId` = COALESCE(`userId`, 'legacy-user'),
  `rootPath` = CASE
    WHEN `rootPath` IS NOT NULL AND `rootPath` <> '' THEN `rootPath`
    ELSE REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REPLACE(REPLACE(TRIM(`name`), '/', '-'), '\\', '-'),
          '[[:space:]]+',
          '-'
        ),
        '-+',
        '-'
      ),
      '^-+|-+$',
      ''
    )
  END;

-- Fallback after normalization
UPDATE `Album`
SET `rootPath` = CONCAT('untitled-', RIGHT(`id`, 8))
WHERE `rootPath` IS NULL OR `rootPath` = '';

-- De-duplicate Album.name before creating unique index
WITH ranked_album_name AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (PARTITION BY `name` ORDER BY `id`) AS rn
  FROM `Album`
)
UPDATE `Album` a
JOIN ranked_album_name r ON a.`id` = r.`id`
SET a.`name` = CONCAT(a.`name`, '-', RIGHT(a.`id`, 8))
WHERE r.rn > 1;

-- De-duplicate Album.rootPath before creating unique index
WITH ranked_album_root_path AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (PARTITION BY `rootPath` ORDER BY `id`) AS rn
  FROM `Album`
)
UPDATE `Album` a
JOIN ranked_album_root_path r ON a.`id` = r.`id`
SET a.`rootPath` = CONCAT(a.`rootPath`, '-', RIGHT(a.`id`, 8))
WHERE r.rn > 1;

ALTER TABLE `Album`
  MODIFY `userId` VARCHAR(191) NOT NULL,
  MODIFY `rootPath` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `Album_name_key` ON `Album`(`name`);
CREATE UNIQUE INDEX `Album_rootPath_key` ON `Album`(`rootPath`);

-- Preserve legacy PhotoStorage rows
RENAME TABLE `PhotoStorage` TO `PhotoStorage_old`;

CREATE TABLE `PhotoStorage` (
  `id` VARCHAR(191) NOT NULL,
  `albumId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `storagePath` VARCHAR(191) NOT NULL,
  `photoCount` INTEGER NOT NULL,
  `totalSizeBytes` BIGINT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PhotoStorage_albumId_createdAt_idx`(`albumId`, `createdAt`),
  UNIQUE INDEX `PhotoStorage_albumId_name_key`(`albumId`, `name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PhotoStoragePhoto` (
  `id` VARCHAR(191) NOT NULL,
  `photoStorageId` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `blobPath` VARCHAR(191) NOT NULL,
  `blobUrl` VARCHAR(191) NOT NULL,
  `contentType` VARCHAR(191) NULL,
  `sizeBytes` BIGINT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PhotoStoragePhoto_photoStorageId_createdAt_idx`(`photoStorageId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PhotoStorageMigrationMap` (
  `albumId` VARCHAR(191) NOT NULL,
  `storagePath` VARCHAR(191) NOT NULL,
  `photoStorageId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL,
  `photoCount` INTEGER NOT NULL,
  `totalSizeBytes` BIGINT NOT NULL,
  PRIMARY KEY (`albumId`, `storagePath`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `PhotoStorageMigrationMap` (
  `albumId`,
  `storagePath`,
  `photoStorageId`,
  `name`,
  `createdAt`,
  `photoCount`,
  `totalSizeBytes`
)
SELECT
  t.`albumId`,
  t.`derivedStoragePath`,
  LOWER(REPLACE(UUID(), '-', '')) AS `photoStorageId`,
  CONCAT(
    CASE
      WHEN SUBSTRING_INDEX(t.`derivedStoragePath`, '/', -1) = '' THEN 'legacy'
      ELSE SUBSTRING_INDEX(t.`derivedStoragePath`, '/', -1)
    END,
    '-',
    LEFT(MD5(t.`derivedStoragePath`), 6)
  ) AS `name`,
  MIN(t.`createdAt`) AS `createdAt`,
  COUNT(*) AS `photoCount`,
  SUM(CAST(t.`sizeBytes` AS SIGNED)) AS `totalSizeBytes`
FROM (
  SELECT
    old.`albumId`,
    old.`fileName`,
    old.`storageKey`,
    old.`contentType`,
    old.`sizeBytes`,
    COALESCE(old.`addedAt`, old.`createdAt`) AS `createdAt`,
    CASE
      WHEN old.`storageKey` IS NULL OR old.`storageKey` = '' THEN CONCAT(album.`rootPath`, '/legacy')
      WHEN LOCATE('/', old.`storageKey`) = 0 THEN CONCAT(album.`rootPath`, '/legacy')
      ELSE REGEXP_REPLACE(old.`storageKey`, '/[^/]+$', '')
    END AS `derivedStoragePath`
  FROM `PhotoStorage_old` old
  INNER JOIN `Album` album ON album.`id` = old.`albumId`
) t
GROUP BY t.`albumId`, t.`derivedStoragePath`;

INSERT INTO `PhotoStorage` (
  `id`,
  `albumId`,
  `name`,
  `storagePath`,
  `photoCount`,
  `totalSizeBytes`,
  `createdAt`
)
SELECT
  `photoStorageId`,
  `albumId`,
  `name`,
  `storagePath`,
  `photoCount`,
  `totalSizeBytes`,
  `createdAt`
FROM `PhotoStorageMigrationMap`;

INSERT INTO `PhotoStoragePhoto` (
  `id`,
  `photoStorageId`,
  `fileName`,
  `blobPath`,
  `blobUrl`,
  `contentType`,
  `sizeBytes`,
  `createdAt`
)
SELECT
  LOWER(REPLACE(UUID(), '-', '')) AS `id`,
  map.`photoStorageId`,
  old.`fileName`,
  COALESCE(old.`storageKey`, CONCAT(map.`storagePath`, '/', old.`fileName`)) AS `blobPath`,
  '' AS `blobUrl`,
  old.`contentType`,
  CAST(old.`sizeBytes` AS SIGNED) AS `sizeBytes`,
  COALESCE(old.`addedAt`, old.`createdAt`) AS `createdAt`
FROM `PhotoStorage_old` old
INNER JOIN `Album` album ON album.`id` = old.`albumId`
INNER JOIN `PhotoStorageMigrationMap` map
  ON map.`albumId` = old.`albumId`
  AND map.`storagePath` = CASE
    WHEN old.`storageKey` IS NULL OR old.`storageKey` = '' THEN CONCAT(album.`rootPath`, '/legacy')
    WHEN LOCATE('/', old.`storageKey`) = 0 THEN CONCAT(album.`rootPath`, '/legacy')
    ELSE REGEXP_REPLACE(old.`storageKey`, '/[^/]+$', '')
  END;

ALTER TABLE `PhotoStorage`
  ADD CONSTRAINT `PhotoStorage_albumId_fkey`
  FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PhotoStoragePhoto`
  ADD CONSTRAINT `PhotoStoragePhoto_photoStorageId_fkey`
  FOREIGN KEY (`photoStorageId`) REFERENCES `PhotoStorage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE `PhotoStorageMigrationMap`;
DROP TABLE `PhotoStorage_old`;
