-- Contact details and WhatsApp opt-in submitted with each donation.
-- Nullable: existing rows keep falling back to the donor record.
ALTER TABLE `donation`
  ADD COLUMN `receipt_email` VARCHAR(255) NULL,
  ADD COLUMN `receipt_phone` VARCHAR(20) NULL,
  ADD COLUMN `whatsapp_receipt_consent` BOOLEAN NULL;
