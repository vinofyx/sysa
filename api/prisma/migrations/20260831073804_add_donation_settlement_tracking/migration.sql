-- CreateEnum (MySQL represents Prisma enums as inline ENUM columns, not separate types)

-- AlterTable
ALTER TABLE `donation`
  ADD COLUMN `razorpay_payment_status` VARCHAR(191) NULL,
  ADD COLUMN `razorpay_fee` DECIMAL(12, 2) NULL,
  ADD COLUMN `razorpay_tax` DECIMAL(12, 2) NULL,
  ADD COLUMN `net_amount` DECIMAL(12, 2) NULL,
  ADD COLUMN `settlement_status` ENUM('not_settled', 'pending', 'settled', 'failed', 'unknown') NULL,
  ADD COLUMN `razorpay_settlement_id` VARCHAR(191) NULL,
  ADD COLUMN `razorpay_settlement_utr` VARCHAR(191) NULL,
  ADD COLUMN `settled_at` DATETIME(3) NULL,
  ADD COLUMN `refund_amount` DECIMAL(12, 2) NULL,
  ADD COLUMN `payment_synced_at` DATETIME(3) NULL;
