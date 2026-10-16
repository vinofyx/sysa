-- Additive only. Adds the `skipped` delivery status (existing values are
-- unchanged) and the durable delivery-retry schedule columns.

-- AlterTable
ALTER TABLE `receipt` MODIFY `sms_status` ENUM('pending', 'sent', 'failed', 'not_configured', 'skipped') NULL,
    MODIFY `email_status` ENUM('pending', 'sent', 'failed', 'not_configured', 'skipped') NULL,
    MODIFY `whatsapp_status` ENUM('pending', 'sent', 'failed', 'not_configured', 'skipped') NULL,
    MODIFY `org_email_status` ENUM('pending', 'sent', 'failed', 'not_configured', 'skipped') NULL,
    ADD COLUMN `delivery_retry_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `next_delivery_retry_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `receipt_next_delivery_retry_at_idx` ON `receipt`(`next_delivery_retry_at`);
