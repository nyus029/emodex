-- Fix: Re-add compound interest columns to PhotoStorage that were lost during
-- the refactor migration (20260220162000_refactor_photo_storage_batch_blob),
-- which recreated the PhotoStorage table from scratch without them.
ALTER TABLE `PhotoStorage`
  ADD COLUMN `baseEmoPerPhoto` INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN `compoundStartDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `isCompoundActive` BOOLEAN NOT NULL DEFAULT true;
