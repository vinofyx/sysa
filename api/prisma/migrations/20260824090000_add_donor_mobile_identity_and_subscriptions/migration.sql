-- AlterTable
-- Mobile (`phone`) becomes the primary donor-identification field; email is
-- now an optional additional contact channel. MySQL allows multiple NULLs
-- under a unique index, so this is safe for existing donors (all of whom
-- already have a real email).
ALTER TABLE `donor` MODIFY `email` VARCHAR(191) NULL;
ALTER TABLE `donor` ADD INDEX `donor_phone_idx`(`phone`);

-- CreateTable
CREATE TABLE `donor_subscription` (
    `id` VARCHAR(191) NOT NULL,
    `donor_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `razorpay_plan_id` VARCHAR(191) NOT NULL,
    `razorpay_subscription_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `status` ENUM('created', 'authenticated', 'active', 'pending', 'halted', 'paused', 'cancelled', 'completed', 'expired') NOT NULL DEFAULT 'created',
    `start_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `next_charge_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `donor_subscription_razorpay_subscription_id_key`(`razorpay_subscription_id`),
    INDEX `donor_subscription_donor_id_idx`(`donor_id`),
    INDEX `donor_subscription_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AlterTable
ALTER TABLE `donation` ADD COLUMN `subscription_id` VARCHAR(191) NULL;
ALTER TABLE `donation` ADD INDEX `donation_subscription_id_idx`(`subscription_id`);

-- AddForeignKey
ALTER TABLE `donation` ADD CONSTRAINT `donation_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `donor_subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donor_subscription` ADD CONSTRAINT `donor_subscription_donor_id_fkey` FOREIGN KEY (`donor_id`) REFERENCES `donor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donor_subscription` ADD CONSTRAINT `donor_subscription_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `donation_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
