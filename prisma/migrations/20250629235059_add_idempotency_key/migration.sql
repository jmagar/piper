/*
  Warnings:

  - You are about to drop the `Rule` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `messageId` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- First add the column as nullable
ALTER TABLE "Attachment" ADD COLUMN     "messageId" TEXT;

-- TODO: In a future migration, populate messageId for existing attachments 
-- and then make it NOT NULL once all records have valid messageId values

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "MCPServerMetric" ADD COLUMN     "totalExecutionTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalFailures" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "userId" TEXT;

-- DropTable
DROP TABLE "Rule";

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_slug_key" ON "Prompt"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_idempotencyKey_key" ON "Chat"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MCPServerMetric_totalFailures_idx" ON "MCPServerMetric"("totalFailures");

-- AddForeignKey (will be added in future migration once messageId is populated)
-- ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
