-- AlterTable
ALTER TABLE `event` MODIFY COLUMN `description_en` TEXT NULL, MODIFY COLUMN `description_te` TEXT NULL;

-- AlterTable
ALTER TABLE `event_news_post` MODIFY COLUMN `body_en` TEXT NULL, MODIFY COLUMN `body_te` TEXT NULL;
