/*
  Warnings:

  - A unique constraint covering the columns `[serverId]` on the table `MCPServerMetric` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MCPToolExecution" DROP CONSTRAINT "MCPToolExecution_serverId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "MCPServerMetric_serverId_key" ON "MCPServerMetric"("serverId");

-- AddForeignKey
ALTER TABLE "MCPToolExecution" ADD CONSTRAINT "MCPToolExecution_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MCPServerMetric"("serverId") ON DELETE RESTRICT ON UPDATE CASCADE;
