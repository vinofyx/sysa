-- Additive only: new nullable/defaulted columns and one index. Safe to apply
-- to a database with existing donors/receipts.

-- AlterTable
ALTER TABLE `donor` ADD COLUMN `whatsapp_receipt_consent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `whatsapp_consent_updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `receipt` ADD COLUMN `whatsapp_delivery_status` VARCHAR(20) NULL,
    ADD COLUMN `whatsapp_delivery_updated_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `receipt_whatsapp_message_id_idx` ON `receipt`(`whatsapp_message_id`);
