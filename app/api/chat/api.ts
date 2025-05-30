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
  content,
  attachments,
}: {
  chatId: string
  content: string
  attachments?: Attachment[]
}) {
  try {
    // Construct the 'parts' array for the message
    const messageParts: any[] = [
      { type: 'text', text: sanitizeUserInput(content) }
    ];

    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.contentType?.startsWith('image/')) {
          messageParts.push({
            type: 'image',
            image: attachment.url, // Assuming url is the direct image source or data URI
            contentType: attachment.contentType,
            name: attachment.name
          });
        } else {
          // Generic file part - structure might need verification against AI SDK v5 spec
          messageParts.push({
            type: 'file',
            file: attachment.url, // Assuming url points to the file
            name: attachment.name,
            contentType: attachment.contentType
          });
        }
      }
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        role: "user",
        parts: messageParts, // Save the constructed parts array
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
  messages, // This likely needs to be UIMessage[] or similar from AI SDK
}: {
  chatId: string
  // TODO: Update 'messages' type to reflect UIMessage structure if it's coming from AI SDK stream
  messages: Array<{ role: string; content: string; parts?: any[] }> // Temporarily allow parts
}) {
  try {
    // Extract the final assistant message from the messages array
    const assistantMessages = messages.filter((msg: { role: string; content: string }) => msg.role === 'assistant')
    
    for (const message of assistantMessages) {
      // If message.parts exists and is valid, use it. Otherwise, fallback to content for now.
      // This is a temporary measure; ideally, assistant messages also strictly use 'parts'.
      let messageData;
      if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
        messageData = {
          chatId,
          role: "assistant" as const,
          parts: message.parts,
        };
      } else {
        // Fallback: convert content to a text part
        messageData = {
          chatId,
          role: "assistant" as const,
          parts: [{ type: 'text', text: message.content || '' }],
        };
      }
      await prisma.message.create({ data: messageData });
    }

    console.log(`✅ Assistant messages stored for chat ${chatId}`)
  } catch (error) {
    console.error("❌ Failed to save assistant messages:", error)
    throw error
  }
}
