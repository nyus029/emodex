-- AlterTable
ALTER TABLE `Album` ADD COLUMN `rootPath` VARCHAR(191) NULL;

-- Backfill
UPDATE `Album` SET `rootPath` = `name` WHERE `rootPath` IS NULL;

-- AlterTable
ALTER TABLE `Album` MODIFY `rootPath` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Album_name_key` ON `Album`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `Album_rootPath_key` ON `Album`(`rootPath`);

-- Drop and recreate PhotoStorage with batch semantics
DROP TABLE `PhotoStorage`;

CREATE TABLE `PhotoStorage` (
    `id` VARCHAR(191) NOT NULL,
    `albumId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `storagePath` VARCHAR(191) NOT NULL,
    `photoCount` INTEGER NOT NULL,
    `totalSizeBytes` INTEGER NOT NULL,
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
    `sizeBytes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PhotoStoragePhoto_photoStorageId_createdAt_idx`(`photoStorageId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PhotoStorage` ADD CONSTRAINT `PhotoStorage_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PhotoStoragePhoto` ADD CONSTRAINT `PhotoStoragePhoto_photoStorageId_fkey` FOREIGN KEY (`photoStorageId`) REFERENCES `PhotoStorage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
