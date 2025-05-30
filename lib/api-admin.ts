import { prisma } from "./prisma"
import { fetchClient } from "./fetch"
import {
  API_ROUTE_UPDATE_CHAT_MODEL,
} from "./routes"

/**
 * Updates the model for an existing chat
 */
export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_MODEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, model }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update chat model: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

/**
 * Get all chats for the admin user
 */
export async function getChats() {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    return chats
  } catch (error) {
    console.error("Error fetching chats:", error)
    throw error
  }
}

/**
 * Get a specific chat by ID
 */
export async function getChat(chatId: string) {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        attachments: true
      }
    })
    return chat
  } catch (error) {
    console.error("Error fetching chat:", error)
    throw error
  }
}

/**
 * Create a new chat
 */
export async function createChat(title: string, model?: string, systemPrompt?: string) {
  try {
    const chat = await prisma.chat.create({
      data: {
        title,
        model,
        systemPrompt
      }
    })
    return chat
  } catch (error) {
    console.error("Error creating chat:", error)
    throw error
  }
}

/**
 * Add a message to a chat
 */
export async function addMessage(chatId: string, content: string, role: string) {
  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        parts: [{ type: 'text' as const, text: content }],
        role
      }
    })
    return message
  } catch (error) {
    console.error("Error adding message:", error)
    throw error
  }
}

/**
 * Add an attachment to a chat
 */
export async function addAttachment(
  chatId: string, 
  fileName: string, 
  fileType: string, 
  fileSize: number, 
  filePath: string
) {
  try {
    const attachment = await prisma.attachment.create({
      data: {
        chatId,
        fileName,
        fileType,
        fileSize,
        filePath
      }
    })
    return attachment
  } catch (error) {
    console.error("Error adding attachment:", error)
    throw error
  }
} 