-- AlterTable
ALTER TABLE "event_news_post" ADD COLUMN     "category" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
