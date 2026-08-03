-- CreateEnum
CREATE TYPE "DonationFrequency" AS ENUM ('one_time', 'monthly');

-- CreateEnum
CREATE TYPE "BankTransferStatus" AS ENUM ('pending_verification', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'whatsapp');

-- CreateEnum
CREATE TYPE "NavLocation" AS ENUM ('header', 'footer');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('assigned', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('registered', 'cancelled', 'waitlisted');

-- AlterEnum
ALTER TYPE "DocumentCategory" ADD VALUE 'pan_card';

-- AlterTable
ALTER TABLE "donation" ADD COLUMN     "frequency" "DonationFrequency" NOT NULL DEFAULT 'one_time';

-- AlterTable
ALTER TABLE "committee_member" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "event_news_post" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "gallery_album" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "event_id" TEXT;

-- AlterTable
ALTER TABLE "gallery_item" ADD COLUMN     "cloudinary_public_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "document_repo" ADD COLUMN     "cloudinary_public_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "bank_transfer_record" (
    "id" TEXT NOT NULL,
    "donor_name" TEXT NOT NULL,
    "donor_email" TEXT,
    "donor_phone" TEXT,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "bank_reference_utr" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BankTransferStatus" NOT NULL DEFAULT 'pending_verification',
    "verified_by_admin_id" TEXT,
    "linked_donation_id" TEXT,
    "internal_note" TEXT,

    CONSTRAINT "bank_transfer_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonial" (
    "id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_role" TEXT,
    "quote_en" TEXT NOT NULL,
    "quote_te" TEXT,
    "photo_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_banner" (
    "id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_te" TEXT,
    "subtitle_en" TEXT,
    "subtitle_te" TEXT,
    "image_url" TEXT NOT NULL,
    "cta_label_en" TEXT,
    "cta_label_te" TEXT,
    "cta_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hero_banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_media_link" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_media_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_menu_item" (
    "id" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_te" TEXT,
    "url" TEXT NOT NULL,
    "location" "NavLocation" NOT NULL,
    "parent_id" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "navigation_menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "site_name_en" TEXT NOT NULL DEFAULT 'Sai Yadadri Seva Ashram',
    "site_name_te" TEXT,
    "tagline_en" TEXT,
    "tagline_te" TEXT,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "contact_address_en" TEXT,
    "contact_address_te" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "contact_hours_en" TEXT,
    "whatsapp_number" TEXT,
    "map_latitude" DECIMAL(9,6),
    "map_longitude" DECIMAL(9,6),
    "default_meta_title" TEXT,
    "default_meta_description" TEXT,
    "default_og_image_url" TEXT,
    "footer_text_en" TEXT,
    "footer_text_te" TEXT,
    "copyright_text" TEXT,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_te" TEXT,
    "description_en" TEXT,
    "description_te" TEXT,
    "icon_or_image_url" TEXT,
    "linked_category_id" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_assignment" (
    "id" TEXT NOT NULL,
    "volunteer_id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_en" TEXT,
    "assigned_date" DATE NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'assigned',
    "assigned_by_admin_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_category" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_te" TEXT,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "category_id" TEXT,
    "title_en" TEXT NOT NULL,
    "title_te" TEXT,
    "description_en" TEXT,
    "description_te" TEXT,
    "slug" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "location" TEXT,
    "capacity" INTEGER,
    "registration_deadline" TIMESTAMP(3),
    "featured_image_url" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "meta_title_en" TEXT,
    "meta_description_en" TEXT,
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registration" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'registered',
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMP(3),

    CONSTRAINT "event_registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfer_record_linked_donation_id_key" ON "bank_transfer_record"("linked_donation_id");

-- CreateIndex
CREATE INDEX "bank_transfer_record_status_submitted_at_idx" ON "bank_transfer_record"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "testimonial_active_display_order_idx" ON "testimonial"("active", "display_order");

-- CreateIndex
CREATE INDEX "testimonial_deleted_at_idx" ON "testimonial"("deleted_at");

-- CreateIndex
CREATE INDEX "hero_banner_active_display_order_idx" ON "hero_banner"("active", "display_order");

-- CreateIndex
CREATE INDEX "hero_banner_deleted_at_idx" ON "hero_banner"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_media_link_platform_key" ON "social_media_link"("platform");

-- CreateIndex
CREATE INDEX "navigation_menu_item_location_display_order_idx" ON "navigation_menu_item"("location", "display_order");

-- CreateIndex
CREATE INDEX "navigation_menu_item_deleted_at_idx" ON "navigation_menu_item"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "activity_slug_key" ON "activity"("slug");

-- CreateIndex
CREATE INDEX "activity_active_display_order_idx" ON "activity"("active", "display_order");

-- CreateIndex
CREATE INDEX "activity_deleted_at_idx" ON "activity"("deleted_at");

-- CreateIndex
CREATE INDEX "volunteer_assignment_volunteer_id_status_idx" ON "volunteer_assignment"("volunteer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_category_slug_key" ON "event_category"("slug");

-- CreateIndex
CREATE INDEX "event_category_deleted_at_idx" ON "event_category"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_slug_key" ON "event"("slug");

-- CreateIndex
CREATE INDEX "event_status_start_date_idx" ON "event"("status", "start_date");

-- CreateIndex
CREATE INDEX "event_category_id_idx" ON "event"("category_id");

-- CreateIndex
CREATE INDEX "event_deleted_at_idx" ON "event"("deleted_at");

-- CreateIndex
CREATE INDEX "event_registration_event_id_status_idx" ON "event_registration"("event_id", "status");

-- CreateIndex
CREATE INDEX "donation_frequency_idx" ON "donation"("frequency");

-- CreateIndex
CREATE INDEX "committee_member_deleted_at_idx" ON "committee_member"("deleted_at");

-- CreateIndex
CREATE INDEX "event_news_post_deleted_at_idx" ON "event_news_post"("deleted_at");

-- CreateIndex
CREATE INDEX "gallery_album_deleted_at_idx" ON "gallery_album"("deleted_at");

-- CreateIndex
CREATE INDEX "gallery_item_deleted_at_idx" ON "gallery_item"("deleted_at");

-- CreateIndex
CREATE INDEX "document_repo_deleted_at_idx" ON "document_repo"("deleted_at");

-- AddForeignKey
ALTER TABLE "bank_transfer_record" ADD CONSTRAINT "bank_transfer_record_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "donation_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfer_record" ADD CONSTRAINT "bank_transfer_record_verified_by_admin_id_fkey" FOREIGN KEY ("verified_by_admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfer_record" ADD CONSTRAINT "bank_transfer_record_linked_donation_id_fkey" FOREIGN KEY ("linked_donation_id") REFERENCES "donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_album" ADD CONSTRAINT "gallery_album_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_menu_item" ADD CONSTRAINT "navigation_menu_item_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "navigation_menu_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_linked_category_id_fkey" FOREIGN KEY ("linked_category_id") REFERENCES "donation_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignment" ADD CONSTRAINT "volunteer_assignment_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignment" ADD CONSTRAINT "volunteer_assignment_assigned_by_admin_id_fkey" FOREIGN KEY ("assigned_by_admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

