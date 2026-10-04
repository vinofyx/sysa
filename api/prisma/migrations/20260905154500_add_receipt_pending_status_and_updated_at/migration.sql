-- AlterTable
ALTER TABLE `receipt` MODIFY `sms_status` ENUM('pending', 'sent', 'failed', 'not_configured') NULL;
ALTER TABLE `receipt` MODIFY `email_status` ENUM('pending', 'sent', 'failed', 'not_configured') NULL;
ALTER TABLE `receipt` MODIFY `whatsapp_status` ENUM('pending', 'sent', 'failed', 'not_configured') NULL;
ALTER TABLE `receipt` ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
