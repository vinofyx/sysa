-- AlterTable
-- Adds masked-Aadhaar (mirrors the existing pan_number_masked column — raw
-- Aadhaar is never stored) and postal-address fields to `donor`, so the
-- donation receipt can print complete donor information and identity
-- documents can satisfy "at least one of PAN or Aadhaar" without ever
-- persisting a raw Aadhaar number.
ALTER TABLE `donor` ADD COLUMN `aadhaar_number_masked` VARCHAR(191) NULL;
ALTER TABLE `donor` ADD COLUMN `address` TEXT NULL;
ALTER TABLE `donor` ADD COLUMN `city` VARCHAR(191) NULL;
ALTER TABLE `donor` ADD COLUMN `pincode` VARCHAR(191) NULL;
ALTER TABLE `donor` ADD COLUMN `state` VARCHAR(191) NULL;
