-- AlterTable
ALTER TABLE `receipt` ADD COLUMN `receipt_generated_at` DATETIME(3) NULL,
    ADD COLUMN `email_sent_at` DATETIME(3) NULL,
    ADD COLUMN `email_message_id` VARCHAR(191) NULL,
    ADD COLUMN `email_failure_reason` VARCHAR(500) NULL,
    ADD COLUMN `whatsapp_sent_at` DATETIME(3) NULL,
    ADD COLUMN `whatsapp_message_id` VARCHAR(191) NULL,
    ADD COLUMN `whatsapp_failure_reason` VARCHAR(500) NULL;
