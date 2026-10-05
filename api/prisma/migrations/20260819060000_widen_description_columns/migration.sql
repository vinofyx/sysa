-- AlterTable
-- Fixes schema/migration drift: schema.prisma has always declared these four
-- columns as `@db.Text` (see DonationCategory.descriptionEn/descriptionTe,
-- Activity.descriptionEn/descriptionTe), but the init migration created them
-- as the Prisma String default of VARCHAR(191). Any description longer than
-- 191 characters fails with Prisma error P2000 ("value too long for the
-- column's type") on insert/update — confirmed while seeding a fresh
-- database; the real donation-category and activity descriptions already in
-- use are well over 191 characters. TEXT (up to ~65,535 bytes) matches what
-- schema.prisma has always specified; no data can be lost by widening.
ALTER TABLE `donation_category` MODIFY `description_en` TEXT NULL;
ALTER TABLE `donation_category` MODIFY `description_te` TEXT NULL;
ALTER TABLE `activity` MODIFY `description_en` TEXT NULL;
ALTER TABLE `activity` MODIFY `description_te` TEXT NULL;
