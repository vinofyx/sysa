-- AlterTable
ALTER TABLE `receipt` ADD COLUMN `org_email_status` ENUM('pending', 'sent', 'failed', 'not_configured') NULL,
    ADD COLUMN `org_email_sent_at` DATETIME(3) NULL,
    ADD COLUMN `org_email_message_id` VARCHAR(191) NULL,
    ADD COLUMN `org_email_failure_reason` VARCHAR(500) NULL;
