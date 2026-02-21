-- AlterTable: Add albumType enum column to Album
ALTER TABLE `Album` ADD COLUMN `albumType` ENUM('PRIVATE', 'SHARED') NOT NULL DEFAULT 'PRIVATE';

-- AlterTable: Add groupId FK column to Album
ALTER TABLE `Album` ADD COLUMN `groupId` INTEGER NULL;

-- AlterTable: Add tags JSON column to PhotoStorage
ALTER TABLE `PhotoStorage` ADD COLUMN `tags` JSON NULL;

-- AddForeignKey: Album.groupId -> Group.id
ALTER TABLE `Album` ADD CONSTRAINT `Album_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
