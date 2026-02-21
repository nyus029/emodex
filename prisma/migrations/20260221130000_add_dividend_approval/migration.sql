-- CreateEnum
-- NOTE: MySQL doesn't have native enums at the migration level;
-- Prisma maps enum fields to VARCHAR/ENUM columns on the table.

-- CreateTable
CREATE TABLE `DividendApprovalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `albumId` VARCHAR(191) NOT NULL,
    `photoStorageId` VARCHAR(191) NOT NULL,
    `requestedByUserId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `emoValueAtRequest` DOUBLE NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DividendApprovalRequest_albumId_status_idx`(`albumId`, `status`),
    INDEX `DividendApprovalRequest_photoStorageId_idx`(`photoStorageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DividendApproval` (
    `id` VARCHAR(191) NOT NULL,
    `approvalRequestId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DividendApproval_userId_idx`(`userId`),
    UNIQUE INDEX `DividendApproval_approvalRequestId_userId_key`(`approvalRequestId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: add approvalRequestId to DividendEvent
ALTER TABLE `DividendEvent` ADD COLUMN `approvalRequestId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `DividendEvent_approvalRequestId_key` ON `DividendEvent`(`approvalRequestId`);

-- AddForeignKey
ALTER TABLE `DividendEvent` ADD CONSTRAINT `DividendEvent_approvalRequestId_fkey` FOREIGN KEY (`approvalRequestId`) REFERENCES `DividendApprovalRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DividendApprovalRequest` ADD CONSTRAINT `DividendApprovalRequest_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DividendApprovalRequest` ADD CONSTRAINT `DividendApprovalRequest_photoStorageId_fkey` FOREIGN KEY (`photoStorageId`) REFERENCES `PhotoStorage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DividendApprovalRequest` ADD CONSTRAINT `DividendApprovalRequest_requestedByUserId_fkey` FOREIGN KEY (`requestedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DividendApproval` ADD CONSTRAINT `DividendApproval_approvalRequestId_fkey` FOREIGN KEY (`approvalRequestId`) REFERENCES `DividendApprovalRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DividendApproval` ADD CONSTRAINT `DividendApproval_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
