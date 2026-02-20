-- Backfill NULL names with email address
UPDATE `User` SET `name` = `email` WHERE `name` IS NULL;

-- Add picture column if it doesn't exist
ALTER TABLE `User` ADD COLUMN `picture` VARCHAR(191) NULL;

-- Make name non-nullable
ALTER TABLE `User` MODIFY `name` VARCHAR(191) NOT NULL;
