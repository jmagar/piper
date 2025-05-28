-- CreateTable
CREATE TABLE "AdminSetting" (
    "id" TEXT NOT NULL DEFAULT 'default_admin_settings',
    "systemPrompt" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);
