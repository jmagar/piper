"server-only"; // Ensures this module only runs on the server

import { prisma } from "@/lib/prisma"
import type { Message as MessageAISDK } from "ai"
import type { Message } from "@/app/types/database.types"
import { readFromIndexedDB, writeToIndexedDB } from "../persist"

export async function getMessagesFromDb(
  chatId: string
): Promise<MessageAISDK[]> {
  try {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    })

    return messages.map((message: Message) => ({
      id: message.id,
      content: message.content,
      role: message.role as MessageAISDK["role"],
      createdAt: message.createdAt,
      experimental_attachments: [], // Will be populated from attachments table if needed
    }))
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    return []
  }
}

async function insertMessageToDb(chatId: string, message: MessageAISDK) {
  try {
    await prisma.message.create({
      data: {
        chatId,
        role: message.role,
        content: message.content,
      }
    })
  } catch (error) {
    console.error("Error inserting message:", error)
  }
}

async function insertMessagesToDb(chatId: string, messages: MessageAISDK[]) {
  try {
    const messageData = messages.map((message) => ({
      chatId,
      role: message.role,
      content: message.content,
    }))

    await prisma.message.createMany({
      data: messageData
    })
  } catch (error) {
    console.error("Error inserting messages:", error)
  }
}

async function deleteMessagesFromDb(chatId: string) {
  try {
    await prisma.message.deleteMany({
      where: { chatId }
    })
  } catch (error) {
    console.error("Failed to clear messages from database:", error)
  }
}

type ChatMessageEntry = {
  id: string
  messages: MessageAISDK[]
}

export async function getCachedMessages(
  chatId: string
): Promise<MessageAISDK[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId)

  if (!entry || Array.isArray(entry)) return []

  return (entry.messages || []).sort(
    (a, b) => +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
  )
}

export async function cacheMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function addMessage(
  chatId: string,
  message: MessageAISDK
): Promise<void> {
  await insertMessageToDb(chatId, message)
  const current = await getCachedMessages(chatId)

  console.log("current", current)

  const updated = [...current, message]
  console.log("updated", updated)

  await writeToIndexedDB("messages", { id: chatId, messages: updated })
}

export async function setMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await insertMessagesToDb(chatId, messages)
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function clearMessagesCache(chatId: string): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages: [] })
}

export async function clearMessagesForChat(chatId: string): Promise<void> {
  await deleteMessagesFromDb(chatId)
  await clearMessagesCache(chatId)
}
