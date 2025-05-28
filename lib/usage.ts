import { FREE_MODELS_IDS } from "@/lib/config"
import { prisma } from "@/lib/prisma"

const isFreeModel = (modelId: string) => FREE_MODELS_IDS.includes(modelId)
const isProModel = (modelId: string) => !isFreeModel(modelId)

// Admin has unlimited usage, but we still track for analytics
const ADMIN_DAILY_LIMIT = 999999
const ADMIN_PRO_LIMIT = 999999

/**
 * Gets or creates usage record for admin user
 */
async function getOrCreateUsage(userId: string = "admin") {
  let usage = await prisma.usage.findUnique({
    where: { userId }
  })

  if (!usage) {
    usage = await prisma.usage.create({
      data: { userId }
    })
  }

  return usage
}

/**
 * Checks the admin's daily usage (unlimited in admin-only mode, but tracked for analytics)
 */
export async function checkUsage(userId: string = "admin") {
  const usage = await getOrCreateUsage(userId)

  // Reset daily counter if the day has changed (using UTC)
  const now = new Date()
  let dailyCount = usage.dailyMessageCount
  const lastReset = usage.dailyReset

  const isNewDay =
    !lastReset ||
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate()

  if (isNewDay) {
    dailyCount = 0
    await prisma.usage.update({
      where: { userId },
      data: { 
        dailyMessageCount: 0, 
        dailyReset: now 
      }
    })
  }

  // Admin has unlimited usage, but we track it
  return {
    usage,
    dailyCount,
    dailyLimit: ADMIN_DAILY_LIMIT,
  }
}

/**
 * Increments message usage counters for admin analytics
 */
export async function incrementUsage(userId: string = "admin"): Promise<void> {
  const usage = await getOrCreateUsage(userId)

  await prisma.usage.update({
    where: { userId },
    data: {
      messageCount: usage.messageCount + 1,
      dailyMessageCount: usage.dailyMessageCount + 1,
      lastActiveAt: new Date(),
    }
  })
}

/**
 * Checks pro model usage for admin (unlimited but tracked)
 */
export async function checkProUsage(userId: string = "admin") {
  const usage = await getOrCreateUsage(userId)

  let dailyProCount = usage.dailyProMessageCount
  const now = new Date()
  const lastReset = usage.dailyProReset

  const isNewDay =
    !lastReset ||
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate()

  if (isNewDay) {
    dailyProCount = 0
    await prisma.usage.update({
      where: { userId },
      data: {
        dailyProMessageCount: 0,
        dailyProReset: now,
      }
    })
  }

  // Admin has unlimited pro usage
  return {
    dailyProCount,
    limit: ADMIN_PRO_LIMIT,
  }
}

/**
 * Increments pro model usage for admin analytics
 */
export async function incrementProUsage(userId: string = "admin") {
  const usage = await getOrCreateUsage(userId)

  await prisma.usage.update({
    where: { userId },
    data: {
      dailyProMessageCount: usage.dailyProMessageCount + 1,
      lastActiveAt: new Date(),
    }
  })
}

/**
 * Checks usage by model type for admin (always unlimited)
 */
export async function checkUsageByModel(
  userId: string = "admin",
  modelId: string
) {
  if (isProModel(modelId)) {
    return await checkProUsage(userId)
  }
  return await checkUsage(userId)
}

/**
 * Increments usage by model type for admin analytics
 */
export async function incrementUsageByModel(
  userId: string = "admin",
  modelId: string
) {
  if (isProModel(modelId)) {
    return await incrementProUsage(userId)
  }
  return await incrementUsage(userId)
}
