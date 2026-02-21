CREATE TABLE `SystemAdministrator` (
  `id` VARCHAR(191) NOT NULL,
  `auth0UserId` VARCHAR(191) NOT NULL,
  `createdBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SystemAdministrator_auth0UserId_key` (`auth0UserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
