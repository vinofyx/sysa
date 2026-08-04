-- CreateTable
CREATE TABLE `role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `permission` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permission_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `role_permission` (
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `admin_user` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `email_verified_at` DATETIME(3) NULL,
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `password_changed_at` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `last_login_ip` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_user_email_key`(`email`),
    INDEX `admin_user_role_id_idx`(`role_id`),
    INDEX `admin_user_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `admin_user_id` VARCHAR(191) NOT NULL,
    `refresh_token_hash` VARCHAR(191) NOT NULL,
    `user_agent` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,

    INDEX `session_admin_user_id_revoked_at_idx`(`admin_user_id`, `revoked_at`),
    INDEX `session_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `password_reset_token` (
    `id` VARCHAR(191) NOT NULL,
    `admin_user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_token_token_hash_key`(`token_hash`),
    INDEX `password_reset_token_admin_user_id_idx`(`admin_user_id`),
    INDEX `password_reset_token_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `email_verification_token` (
    `id` VARCHAR(191) NOT NULL,
    `admin_user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_verification_token_token_hash_key`(`token_hash`),
    INDEX `email_verification_token_admin_user_id_idx`(`admin_user_id`),
    INDEX `email_verification_token_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `admin_user_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NULL,
    `before_state` JSON NULL,
    `after_state` JSON NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_admin_user_id_timestamp_idx`(`admin_user_id`, `timestamp`),
    INDEX `audit_log_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `donor` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `pan_number_masked` VARCHAR(191) NULL,
    `recognition_opt_in` BOOLEAN NOT NULL DEFAULT false,
    `donor_tier` ENUM('one_time', 'monthly', 'major', 'csr') NOT NULL DEFAULT 'one_time',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `donor_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `donation_category` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `name_te` VARCHAR(191) NULL,
    `description_en` VARCHAR(191) NULL,
    `description_te` VARCHAR(191) NULL,
    `has_preset_tiers` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `donation_category_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `donation` (
    `id` VARCHAR(191) NOT NULL,
    `donor_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `appeal_id` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `payment_method` ENUM('upi', 'card', 'netbanking', 'wallet', 'bank_transfer_manual', 'cash', 'cheque') NULL,
    `payment_gateway_ref` VARCHAR(191) NULL,
    `razorpay_order_id` VARCHAR(191) NULL,
    `razorpay_signature` VARCHAR(191) NULL,
    `failure_reason` VARCHAR(191) NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `status` ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    `source` ENUM('online', 'manual') NOT NULL DEFAULT 'online',
    `frequency` ENUM('one_time', 'monthly') NOT NULL DEFAULT 'one_time',
    `internal_note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    UNIQUE INDEX `donation_payment_gateway_ref_key`(`payment_gateway_ref`),
    UNIQUE INDEX `donation_razorpay_order_id_key`(`razorpay_order_id`),
    UNIQUE INDEX `donation_idempotency_key_key`(`idempotency_key`),
    INDEX `donation_status_created_at_idx`(`status`, `created_at`),
    INDEX `donation_category_id_idx`(`category_id`),
    INDEX `donation_donor_id_idx`(`donor_id`),
    INDEX `donation_frequency_idx`(`frequency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `payment_webhook_event` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_webhook_event_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `donor_otp` (
    `id` VARCHAR(191) NOT NULL,
    `donor_email` VARCHAR(191) NOT NULL,
    `otp_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `donor_otp_donor_email_expires_at_idx`(`donor_email`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `bank_transfer_record` (
    `id` VARCHAR(191) NOT NULL,
    `donor_name` VARCHAR(191) NOT NULL,
    `donor_email` VARCHAR(191) NULL,
    `donor_phone` VARCHAR(191) NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `bank_reference_utr` VARCHAR(191) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('pending_verification', 'verified', 'rejected') NOT NULL DEFAULT 'pending_verification',
    `verified_by_admin_id` VARCHAR(191) NULL,
    `linked_donation_id` VARCHAR(191) NULL,
    `internal_note` VARCHAR(191) NULL,

    UNIQUE INDEX `bank_transfer_record_linked_donation_id_key`(`linked_donation_id`),
    INDEX `bank_transfer_record_status_submitted_at_idx`(`status`, `submitted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `receipt` (
    `id` VARCHAR(191) NOT NULL,
    `donation_id` VARCHAR(191) NOT NULL,
    `receipt_number` VARCHAR(191) NOT NULL,
    `pdf_url` VARCHAR(191) NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `receipt_donation_id_key`(`donation_id`),
    UNIQUE INDEX `receipt_receipt_number_key`(`receipt_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `appeal` (
    `id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_te` VARCHAR(191) NULL,
    `description_en` VARCHAR(191) NULL,
    `description_te` VARCHAR(191) NULL,
    `target_amount` DECIMAL(12, 2) NOT NULL,
    `raised_amount_cache` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `status` ENUM('active', 'completed', 'archived') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `committee_member` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `designation` VARCHAR(191) NOT NULL,
    `display_order` INTEGER NOT NULL,
    `photo_url` VARCHAR(191) NULL,
    `bio_en` VARCHAR(191) NULL,
    `bio_te` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `committee_member_display_order_idx`(`display_order`),
    INDEX `committee_member_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `event_news_post` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('event', 'news') NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_te` VARCHAR(191) NULL,
    `body_en` VARCHAR(191) NULL,
    `body_te` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `event_date` DATE NULL,
    `published_at` DATETIME(3) NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `featured_image_url` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `meta_title_en` VARCHAR(191) NULL,
    `meta_description_en` VARCHAR(191) NULL,
    `author_admin_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `event_news_post_slug_key`(`slug`),
    INDEX `event_news_post_type_published_at_idx`(`type`, `published_at`),
    INDEX `event_news_post_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `gallery_album` (
    `id` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `name_te` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `event_id` VARCHAR(191) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `gallery_album_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `gallery_item` (
    `id` VARCHAR(191) NOT NULL,
    `album_id` VARCHAR(191) NOT NULL,
    `media_type` ENUM('image', 'video') NOT NULL,
    `media_url` VARCHAR(191) NOT NULL,
    `cloudinary_public_id` VARCHAR(191) NULL,
    `alt_text_en` VARCHAR(191) NULL,
    `alt_text_te` VARCHAR(191) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `gallery_item_album_id_display_order_idx`(`album_id`, `display_order`),
    INDEX `gallery_item_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `volunteer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `volunteer_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `volunteer_application` (
    `id` VARCHAR(191) NOT NULL,
    `volunteer_id` VARCHAR(191) NOT NULL,
    `type` ENUM('volunteer', 'internship') NOT NULL,
    `academic_background` VARCHAR(191) NULL,
    `area_of_interest` VARCHAR(191) NULL,
    `resume_url` VARCHAR(191) NULL,
    `status` ENUM('submitted', 'under_review', 'accepted', 'not_selected') NOT NULL DEFAULT 'submitted',
    `internal_note` VARCHAR(191) NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status_updated_at` DATETIME(3) NULL,

    INDEX `volunteer_application_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `document_repo` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('registration_certificate', 'certificate_12ab', 'certificate_80g', 'pan_card', 'annual_report', 'audit_report', 'financial_statement') NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_te` VARCHAR(191) NULL,
    `file_url` VARCHAR(191) NOT NULL,
    `cloudinary_public_id` VARCHAR(191) NULL,
    `published_date` DATE NULL,
    `public_visible` BOOLEAN NOT NULL DEFAULT false,
    `uploaded_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `document_repo_category_public_visible_idx`(`category`, `public_visible`),
    INDEX `document_repo_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `contact_submission` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `message` VARCHAR(191) NOT NULL,
    `status` ENUM('new', 'in_progress', 'resolved') NOT NULL DEFAULT 'new',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `newsletter_subscriber` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subscribed` BOOLEAN NOT NULL DEFAULT true,
    `subscribed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unsubscribed_at` DATETIME(3) NULL,

    UNIQUE INDEX `newsletter_subscriber_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `page_content` (
    `id` VARCHAR(191) NOT NULL,
    `page_key` VARCHAR(191) NOT NULL,
    `blocks_en` JSON NOT NULL,
    `blocks_te` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `page_content_page_key_key`(`page_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `author_name` VARCHAR(191) NOT NULL,
    `author_role` VARCHAR(191) NULL,
    `quote_en` VARCHAR(191) NOT NULL,
    `quote_te` VARCHAR(191) NULL,
    `photo_url` VARCHAR(191) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `testimonial_active_display_order_idx`(`active`, `display_order`),
    INDEX `testimonial_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `hero_banner` (
    `id` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_te` VARCHAR(191) NULL,
    `subtitle_en` VARCHAR(191) NULL,
    `subtitle_te` VARCHAR(191) NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `cta_label_en` VARCHAR(191) NULL,
    `cta_label_te` VARCHAR(191) NULL,
    `cta_url` VARCHAR(191) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `hero_banner_active_display_order_idx`(`active`, `display_order`),
    INDEX `hero_banner_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `social_media_link` (
    `id` VARCHAR(191) NOT NULL,
    `platform` ENUM('facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'whatsapp') NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `social_media_link_platform_key`(`platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `navigation_menu_item` (
    `id` VARCHAR(191) NOT NULL,
    `label_en` VARCHAR(191) NOT NULL,
    `label_te` VARCHAR(191) NULL,
    `url` VARCHAR(191) NOT NULL,
    `location` ENUM('header', 'footer') NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `navigation_menu_item_location_display_order_idx`(`location`, `display_order`),
    INDEX `navigation_menu_item_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `site_name_en` VARCHAR(191) NOT NULL DEFAULT 'Sai Yadadri Seva Ashram',
    `site_name_te` VARCHAR(191) NULL,
    `tagline_en` VARCHAR(191) NULL,
    `tagline_te` VARCHAR(191) NULL,
    `logo_url` VARCHAR(191) NULL,
    `favicon_url` VARCHAR(191) NULL,
    `contact_address_en` VARCHAR(191) NULL,
    `contact_address_te` VARCHAR(191) NULL,
    `contact_phone` VARCHAR(191) NULL,
    `contact_email` VARCHAR(191) NULL,
    `contact_hours_en` VARCHAR(191) NULL,
    `whatsapp_number` VARCHAR(191) NULL,
    `map_latitude` DECIMAL(9, 6) NULL,
    `map_longitude` DECIMAL(9, 6) NULL,
    `default_meta_title` VARCHAR(191) NULL,
    `default_meta_description` VARCHAR(191) NULL,
    `default_og_image_url` VARCHAR(191) NULL,
    `footer_text_en` VARCHAR(191) NULL,
    `footer_text_te` VARCHAR(191) NULL,
    `copyright_text` VARCHAR(191) NULL,
    `maintenance_mode` BOOLEAN NOT NULL DEFAULT false,
    `bank_account_name` VARCHAR(191) NULL,
    `bank_account_number` VARCHAR(191) NULL,
    `bank_ifsc_code` VARCHAR(191) NULL,
    `bank_name` VARCHAR(191) NULL,
    `bank_branch` VARCHAR(191) NULL,
    `upi_id` VARCHAR(191) NULL,
    `upi_qr_image_url` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `activity` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_te` VARCHAR(191) NULL,
    `description_en` VARCHAR(191) NULL,
    `description_te` VARCHAR(191) NULL,
    `icon_or_image_url` VARCHAR(191) NULL,
    `linked_category_id` VARCHAR(191) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `activity_slug_key`(`slug`),
    INDEX `activity_active_display_order_idx`(`active`, `display_order`),
    INDEX `activity_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `volunteer_assignment` (
    `id` VARCHAR(191) NOT NULL,
    `volunteer_id` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `description_en` VARCHAR(191) NULL,
    `assigned_date` DATE NOT NULL,
    `status` ENUM('assigned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'assigned',
    `assigned_by_admin_id` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `volunteer_assignment_volunteer_id_status_idx`(`volunteer_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `event_category` (
    `id` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `name_te` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `event_category_slug_key`(`slug`),
    INDEX `event_category_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `event` (
    `id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NULL,
    `title_en` VARCHAR(191) NOT NULL,
    `title_te` VARCHAR(191) NULL,
    `description_en` VARCHAR(191) NULL,
    `description_te` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `capacity` INTEGER NULL,
    `registration_deadline` DATETIME(3) NULL,
    `featured_image_url` VARCHAR(191) NULL,
    `status` ENUM('draft', 'published', 'cancelled', 'completed') NOT NULL DEFAULT 'draft',
    `meta_title_en` VARCHAR(191) NULL,
    `meta_description_en` VARCHAR(191) NULL,
    `created_by_admin_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `event_slug_key`(`slug`),
    INDEX `event_status_start_date_idx`(`status`, `start_date`),
    INDEX `event_category_id_idx`(`category_id`),
    INDEX `event_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `event_registration` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('registered', 'cancelled', 'waitlisted') NOT NULL DEFAULT 'registered',
    `checked_in` BOOLEAN NOT NULL DEFAULT false,
    `checked_in_at` DATETIME(3) NULL,

    INDEX `event_registration_event_id_status_idx`(`event_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_user` ADD CONSTRAINT `admin_user_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_token` ADD CONSTRAINT `password_reset_token_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verification_token` ADD CONSTRAINT `email_verification_token_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donation` ADD CONSTRAINT `donation_donor_id_fkey` FOREIGN KEY (`donor_id`) REFERENCES `donor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donation` ADD CONSTRAINT `donation_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `donation_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donation` ADD CONSTRAINT `donation_appeal_id_fkey` FOREIGN KEY (`appeal_id`) REFERENCES `appeal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transfer_record` ADD CONSTRAINT `bank_transfer_record_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `donation_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transfer_record` ADD CONSTRAINT `bank_transfer_record_verified_by_admin_id_fkey` FOREIGN KEY (`verified_by_admin_id`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_transfer_record` ADD CONSTRAINT `bank_transfer_record_linked_donation_id_fkey` FOREIGN KEY (`linked_donation_id`) REFERENCES `donation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt` ADD CONSTRAINT `receipt_donation_id_fkey` FOREIGN KEY (`donation_id`) REFERENCES `donation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appeal` ADD CONSTRAINT `appeal_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `donation_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_news_post` ADD CONSTRAINT `event_news_post_author_admin_id_fkey` FOREIGN KEY (`author_admin_id`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_album` ADD CONSTRAINT `gallery_album_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_item` ADD CONSTRAINT `gallery_item_album_id_fkey` FOREIGN KEY (`album_id`) REFERENCES `gallery_album`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volunteer_application` ADD CONSTRAINT `volunteer_application_volunteer_id_fkey` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volunteer_application` ADD CONSTRAINT `volunteer_application_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_repo` ADD CONSTRAINT `document_repo_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `page_content` ADD CONSTRAINT `page_content_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `navigation_menu_item` ADD CONSTRAINT `navigation_menu_item_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `navigation_menu_item`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity` ADD CONSTRAINT `activity_linked_category_id_fkey` FOREIGN KEY (`linked_category_id`) REFERENCES `donation_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volunteer_assignment` ADD CONSTRAINT `volunteer_assignment_volunteer_id_fkey` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volunteer_assignment` ADD CONSTRAINT `volunteer_assignment_assigned_by_admin_id_fkey` FOREIGN KEY (`assigned_by_admin_id`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `event_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_created_by_admin_id_fkey` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_registration` ADD CONSTRAINT `event_registration_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

