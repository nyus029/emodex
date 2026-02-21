DROP TABLE IF EXISTS `SystemAdministrator`;

CREATE TABLE `SystemAdministrator` (
  `id` VARCHAR(191) NOT NULL,
  `userId` INTEGER NOT NULL,
  `createdByUserId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SystemAdministrator_userId_key` (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SystemAdministrator`
  ADD CONSTRAINT `SystemAdministrator_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SystemAdministrator`
  ADD CONSTRAINT `SystemAdministrator_createdByUserId_fkey`
  FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
