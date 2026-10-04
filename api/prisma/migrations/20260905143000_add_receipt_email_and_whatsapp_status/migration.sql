-- AlterTable
ALTER TABLE `receipt` ADD COLUMN `email_status` ENUM('sent', 'failed', 'not_configured') NULL;
ALTER TABLE `receipt` ADD COLUMN `whatsapp_status` ENUM('sent', 'failed', 'not_configured') NULL;
