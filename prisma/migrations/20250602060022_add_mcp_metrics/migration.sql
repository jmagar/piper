-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPServerMetric" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "transportType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "connectionTime" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3),
    "disconnectionTime" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "averageLatency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toolsCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MCPServerMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPToolExecution" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "callId" TEXT,
    "executionTime" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "repairAttempts" INTEGER NOT NULL DEFAULT 0,
    "repairSuccessful" BOOLEAN NOT NULL DEFAULT false,
    "inputSize" INTEGER,
    "outputSize" INTEGER,
    "outputType" TEXT,
    "aborted" BOOLEAN NOT NULL DEFAULT false,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MCPToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rule_slug_key" ON "Rule"("slug");

-- CreateIndex
CREATE INDEX "MCPServerMetric_serverId_idx" ON "MCPServerMetric"("serverId");

-- CreateIndex
CREATE INDEX "MCPServerMetric_status_idx" ON "MCPServerMetric"("status");

-- CreateIndex
CREATE INDEX "MCPServerMetric_transportType_idx" ON "MCPServerMetric"("transportType");

-- CreateIndex
CREATE INDEX "MCPToolExecution_serverId_idx" ON "MCPToolExecution"("serverId");

-- CreateIndex
CREATE INDEX "MCPToolExecution_toolName_idx" ON "MCPToolExecution"("toolName");

-- CreateIndex
CREATE INDEX "MCPToolExecution_success_idx" ON "MCPToolExecution"("success");

-- CreateIndex
CREATE INDEX "MCPToolExecution_executedAt_idx" ON "MCPToolExecution"("executedAt");

-- CreateIndex
CREATE INDEX "MCPToolExecution_errorType_idx" ON "MCPToolExecution"("errorType");

-- AddForeignKey
ALTER TABLE "MCPToolExecution" ADD CONSTRAINT "MCPToolExecution_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MCPServerMetric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
