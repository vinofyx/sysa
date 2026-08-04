-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "bank_account_name" TEXT,
ADD COLUMN     "bank_account_number" TEXT,
ADD COLUMN     "bank_ifsc_code" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "bank_branch" TEXT,
ADD COLUMN     "upi_id" TEXT,
ADD COLUMN     "upi_qr_image_url" TEXT;
