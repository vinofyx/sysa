-- AlterTable
ALTER TABLE `receipt` ADD COLUMN `sms_status` ENUM('sent', 'failed', 'not_configured') NULL;
