// "server-only"; // Temporarily removed as it seems to cause 500 errors with Turbopack

import { prisma } from "@/lib/prisma"
import { sanitizeUserInput } from "@/lib/sanitize"
import type { Attachment } from "@ai-sdk/ui-utils"

/**
 * Admin-only validation - no user tracking needed
 */
export async function validateAndTrackUsage() {
  // In admin-only mode, we don't need to validate users or track usage
  // Just return true to indicate validation passed
  return true
}

/**
 * Log user message to database using Prisma
 */
export async function logUserMessage({
  chatId,
  userId, // Added userId
  content,
  attachments,
}: {
  chatId: string
  userId?: string // Added userId as optional
  content: string
  attachments?: Attachment[]
}) {
  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        userId: userId, // Added userId
        role: "user",
        content: sanitizeUserInput(content),
      }
    })

    // Store attachments if any
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        await prisma.attachment.create({
          data: {
            chatId,
            fileName: attachment.name || 'unknown',
            fileType: attachment.contentType || 'unknown',
            fileSize: 0, // Will be updated when file is actually saved
            filePath: attachment.url || '',
          }
        })
      }
    }

    console.log(`✅ User message logged for chat ${chatId}`)
    return message
  } catch (error) {
    console.error("❌ Error saving user message:", error)
    throw error
  }
}

/**
 * Track special agent usage - simplified for admin-only mode
 */
export async function trackSpecialAgentUsage() {
  // In admin-only mode, no usage tracking needed
  console.log("ℹ️ Special agent usage tracked (admin-only mode)")
}

/**
 * Store assistant message using Prisma
 */
export async function storeAssistantMessage({
  chatId,
  messages,
}: {
  chatId: string
  messages: Array<{ role: string; content: string }>
}) {
  try {
    // Extract the final assistant message from the messages array
    const assistantMessages = messages.filter((msg: { role: string; content: string }) => msg.role === 'assistant')
    
    for (const message of assistantMessages) {
      await prisma.message.create({
        data: {
          chatId,
          role: "assistant",
          content: message.content || '',
        }
      })
    }

    console.log(`✅ Assistant messages stored for chat ${chatId}`)
  } catch (error) {
    console.error("❌ Failed to save assistant messages:", error)
    throw error
  }
}
