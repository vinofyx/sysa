-- CreateEnum
CREATE TYPE "DonorTier" AS ENUM ('one_time', 'monthly', 'major', 'csr');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('upi', 'card', 'netbanking', 'wallet', 'bank_transfer_manual', 'cash', 'cheque');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "DonationSource" AS ENUM ('online', 'manual');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('event', 'news');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "VolunteerApplicationType" AS ENUM ('volunteer', 'internship');

-- CreateEnum
CREATE TYPE "VolunteerApplicationStatus" AS ENUM ('submitted', 'under_review', 'accepted', 'not_selected');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('registration_certificate', 'certificate_12ab', 'certificate_80g', 'annual_report', 'audit_report', 'financial_statement');

-- CreateEnum
CREATE TYPE "ContactSubmissionStatus" AS ENUM ('new', 'in_progress', 'resolved');

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_token" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_state" JSONB,
    "after_state" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pan_number_masked" TEXT,
    "recognition_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "donor_tier" "DonorTier" NOT NULL DEFAULT 'one_time',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_te" TEXT,
    "description_en" TEXT,
    "description_te" TEXT,
    "has_preset_tiers" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation" (
    "id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "appeal_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_gateway_ref" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'pending',
    "source" "DonationSource" NOT NULL DEFAULT 'online',
    "internal_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt" (
    "id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "pdf_url" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeal" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_te" TEXT,
    "description_en" TEXT,
    "description_te" TEXT,
    "target_amount" DECIMAL(12,2) NOT NULL,
    "raised_amount_cache" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "status" "AppealStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "photo_url" TEXT,
    "bio_en" TEXT,
    "bio_te" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committee_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_news_post" (
    "id" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_te" TEXT,
    "body_en" TEXT,
    "body_te" TEXT,
    "slug" TEXT NOT NULL,
    "event_date" DATE,
    "published_at" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'draft',
    "featured_image_url" TEXT,
    "meta_title_en" TEXT,
    "meta_description_en" TEXT,
    "author_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_news_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_album" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_te" TEXT,
    "category" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_item" (
    "id" TEXT NOT NULL,
    "album_id" TEXT NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "media_url" TEXT NOT NULL,
    "alt_text_en" TEXT,
    "alt_text_te" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_application" (
    "id" TEXT NOT NULL,
    "volunteer_id" TEXT NOT NULL,
    "type" "VolunteerApplicationType" NOT NULL,
    "academic_background" TEXT,
    "area_of_interest" TEXT,
    "resume_url" TEXT,
    "status" "VolunteerApplicationStatus" NOT NULL DEFAULT 'submitted',
    "internal_note" TEXT,
    "reviewed_by" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_updated_at" TIMESTAMP(3),

    CONSTRAINT "volunteer_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_repo" (
    "id" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_te" TEXT,
    "file_url" TEXT NOT NULL,
    "published_date" DATE,
    "public_visible" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_repo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" "ContactSubmissionStatus" NOT NULL DEFAULT 'new',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_content" (
    "id" TEXT NOT NULL,
    "page_key" TEXT NOT NULL,
    "blocks_en" JSONB NOT NULL,
    "blocks_te" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "page_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- CreateIndex
CREATE INDEX "admin_user_role_id_idx" ON "admin_user"("role_id");

-- CreateIndex
CREATE INDEX "admin_user_email_idx" ON "admin_user"("email");

-- CreateIndex
CREATE INDEX "session_admin_user_id_revoked_at_idx" ON "session"("admin_user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "session_expires_at_idx" ON "session"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_hash_key" ON "password_reset_token"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_token_admin_user_id_idx" ON "password_reset_token"("admin_user_id");

-- CreateIndex
CREATE INDEX "password_reset_token_expires_at_idx" ON "password_reset_token"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_token_token_hash_key" ON "email_verification_token"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_token_admin_user_id_idx" ON "email_verification_token"("admin_user_id");

-- CreateIndex
CREATE INDEX "email_verification_token_expires_at_idx" ON "email_verification_token"("expires_at");

-- CreateIndex
CREATE INDEX "audit_log_admin_user_id_timestamp_idx" ON "audit_log"("admin_user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "donor_email_key" ON "donor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "donation_category_code_key" ON "donation_category"("code");

-- CreateIndex
CREATE INDEX "donation_status_created_at_idx" ON "donation"("status", "created_at");

-- CreateIndex
CREATE INDEX "donation_category_id_idx" ON "donation"("category_id");

-- CreateIndex
CREATE INDEX "donation_donor_id_idx" ON "donation"("donor_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_donation_id_key" ON "receipt"("donation_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_receipt_number_key" ON "receipt"("receipt_number");

-- CreateIndex
CREATE INDEX "committee_member_display_order_idx" ON "committee_member"("display_order");

-- CreateIndex
CREATE UNIQUE INDEX "event_news_post_slug_key" ON "event_news_post"("slug");

-- CreateIndex
CREATE INDEX "event_news_post_type_published_at_idx" ON "event_news_post"("type", "published_at");

-- CreateIndex
CREATE INDEX "gallery_item_album_id_display_order_idx" ON "gallery_item"("album_id", "display_order");

-- CreateIndex
CREATE INDEX "volunteer_email_idx" ON "volunteer"("email");

-- CreateIndex
CREATE INDEX "volunteer_application_status_idx" ON "volunteer_application"("status");

-- CreateIndex
CREATE INDEX "document_repo_category_public_visible_idx" ON "document_repo"("category", "public_visible");

-- CreateIndex
CREATE UNIQUE INDEX "page_content_page_key_key" ON "page_content"("page_key");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_token" ADD CONSTRAINT "email_verification_token_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "donation_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_appeal_id_fkey" FOREIGN KEY ("appeal_id") REFERENCES "appeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "donation_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_news_post" ADD CONSTRAINT "event_news_post_author_admin_id_fkey" FOREIGN KEY ("author_admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_item" ADD CONSTRAINT "gallery_item_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "gallery_album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_application" ADD CONSTRAINT "volunteer_application_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_application" ADD CONSTRAINT "volunteer_application_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_repo" ADD CONSTRAINT "document_repo_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_content" ADD CONSTRAINT "page_content_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

