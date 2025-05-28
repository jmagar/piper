-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'admin',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "dailyMessageCount" INTEGER NOT NULL DEFAULT 0,
    "dailyProMessageCount" INTEGER NOT NULL DEFAULT 0,
    "dailyReset" TIMESTAMP(3),
    "dailyProReset" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usage_userId_key" ON "Usage"("userId");
