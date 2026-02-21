-- After refactor_photo_storage_batch_blob, PhotoStorage was renamed to PhotoStorage_old
-- and a new PhotoStorage table was created. EmoSnapshot and DividendEvent FKs still
-- reference PhotoStorage_old. Repoint them to the current PhotoStorage table.

ALTER TABLE `EmoSnapshot` DROP FOREIGN KEY `EmoSnapshot_photoStorageId_fkey`;
ALTER TABLE `EmoSnapshot`
  ADD CONSTRAINT `EmoSnapshot_photoStorageId_fkey`
  FOREIGN KEY (`photoStorageId`) REFERENCES `PhotoStorage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DividendEvent` DROP FOREIGN KEY `DividendEvent_photoStorageId_fkey`;
ALTER TABLE `DividendEvent`
  ADD CONSTRAINT `DividendEvent_photoStorageId_fkey`
  FOREIGN KEY (`photoStorageId`) REFERENCES `PhotoStorage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
