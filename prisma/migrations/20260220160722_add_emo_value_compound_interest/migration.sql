/*
  Warnings:

  - You are about to drop the `PhotoStorage_old` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `PhotoStorage` ADD COLUMN `baseEmoPerPhoto` INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN `compoundStartDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `isCompoundActive` BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE IF EXISTS `PhotoStorage_old`;

-- CreateTable
CREATE TABLE `EmoSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `photoStorageId` VARCHAR(191) NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `emoValue` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmoSnapshot_photoStorageId_snapshotDate_idx`(`photoStorageId`, `snapshotDate`),
    UNIQUE INDEX `EmoSnapshot_photoStorageId_snapshotDate_key`(`photoStorageId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DividendEvent` (
    `id` VARCHAR(191) NOT NULL,
    `albumId` VARCHAR(191) NOT NULL,
    `photoStorageId` VARCHAR(191) NOT NULL,
    `action` ENUM('REINVEST', 'RECEIVE') NOT NULL,
    `emoValueAtEvent` DOUBLE NOT NULL,
    `previousBaseEmo` INTEGER NOT NULL,
    `newBaseEmo` INTEGER NOT NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DividendEvent_albumId_executedAt_idx`(`albumId`, `executedAt`),
    INDEX `DividendEvent_photoStorageId_idx`(`photoStorageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmoSnapshot` ADD CONSTRAINT `EmoSnapshot_photoStorageId_fkey` FOREIGN KEY (`photoStorageId`) REFERENCES `PhotoStorage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DividendEvent` ADD CONSTRAINT `DividendEvent_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DividendEvent` ADD CONSTRAINT `DividendEvent_photoStorageId_fkey` FOREIGN KEY (`photoStorageId`) REFERENCES `PhotoStorage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
