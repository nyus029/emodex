-- CreateTable
CREATE TABLE `MoodRecord` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sentence` TEXT NOT NULL,
    `words` JSON NOT NULL,
    `recommendationText` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `MoodRecord_userId_idx` ON `MoodRecord`(`userId`);
