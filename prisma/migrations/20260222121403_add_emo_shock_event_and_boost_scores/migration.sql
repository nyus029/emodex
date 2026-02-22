-- AlterTable
ALTER TABLE `MoodRecord` ADD COLUMN `boostedAlbumScores` JSON NULL;

-- CreateTable
CREATE TABLE `EmoShockEvent` (
    `id` VARCHAR(191) NOT NULL,
    `albumId` VARCHAR(191) NOT NULL,
    `moodRecordId` VARCHAR(191) NOT NULL,
    `shockRate` DOUBLE NOT NULL,
    `shockedAt` DATETIME(3) NOT NULL,
    `recoveryDays` INTEGER NOT NULL DEFAULT 7,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmoShockEvent_albumId_shockedAt_idx`(`albumId`, `shockedAt`),
    INDEX `EmoShockEvent_moodRecordId_idx`(`moodRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmoShockEvent` ADD CONSTRAINT `EmoShockEvent_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmoShockEvent` ADD CONSTRAINT `EmoShockEvent_moodRecordId_fkey` FOREIGN KEY (`moodRecordId`) REFERENCES `MoodRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
