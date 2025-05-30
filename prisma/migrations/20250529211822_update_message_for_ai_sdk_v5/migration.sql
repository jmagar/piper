-- AlterTable
ALTER TABLE "Message" DROP COLUMN "content";
ALTER TABLE "Message" ADD COLUMN "parts" JSONB NOT NULL DEFAULT '[]'::jsonb;
