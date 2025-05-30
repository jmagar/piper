"server-only"; // Ensures this module only runs on the server

import { prisma } from "@/lib/prisma"
import type { UIMessage, UIMessagePart, DataUIPart } from "ai"
import { Prisma } from "@prisma/client"; // Ensure Prisma namespace is imported for JsonValue

// Define the shape of our custom data parts for UIMessage
export type PiperUIDataParts = {
  // This key will result in a part with type "data-createdAtInfo"
  createdAtInfo: Date;
};


import { readFromIndexedDB, writeToIndexedDB } from "../persist"

export async function getMessagesFromDb(
  chatId: string
): Promise<UIMessage<unknown, PiperUIDataParts>[]> {
  try {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    })

    return messages.map((dbMessage: { id: string; role: string; parts: Prisma.JsonValue; createdAt: Date; chatId: string }) => ({
      id: dbMessage.id,
      // Assuming message.parts from Prisma (type Json) is compatible with UIMessage['parts']
      // or can be cast. Prisma typically returns Json fields as parsed objects.
      role: dbMessage.role as UIMessage<unknown, PiperUIDataParts>['role'],
      // Combine existing parts from DB (if any, assuming they are compatible) 
      // with our custom createdAtInfo data part.
      // Note: This assumes dbMessage.parts is an array of UIMessagePart-like objects.
      // If dbMessage.parts is not already an array or needs transformation, this logic will need adjustment.
      parts: [
        // Assuming dbMessage.parts from Prisma (type JsonValue) is an array of parts 
        // compatible with UIMessagePart, excluding our 'data-createdAtInfo' part.
        ...((dbMessage.parts as UIMessagePart<PiperUIDataParts>[]) || []),
        { type: 'data-createdAtInfo', data: dbMessage.createdAt } as DataUIPart<PiperUIDataParts>
      ],
      // experimental_attachments: [], // Re-evaluate attachments with UIMessage.parts if needed
    }))
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    return []
  }
}

async function insertMessageToDb(chatId: string, message: UIMessage<unknown, PiperUIDataParts>) {
  try {
    await prisma.message.create({
      data: {
        chatId,
        role: message.role,
        parts: message.parts as Prisma.InputJsonValue, // Store all UIMessage parts, including our custom 'data-createdAtInfo'
      }
    })
  } catch (error) {
    console.error("Error inserting message:", error)
  }
}

async function insertMessagesToDb(chatId: string, messages: UIMessage<unknown, PiperUIDataParts>[]) {
  try {
    const messageData = messages.map((message) => ({
      chatId,
      role: message.role,
      parts: message.parts as Prisma.InputJsonValue, // Store the UIMessage parts
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
  messages: UIMessage<unknown, PiperUIDataParts>[]
}

export async function getCachedMessages(
  chatId: string
): Promise<UIMessage<unknown, PiperUIDataParts>[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId)

  if (!entry || Array.isArray(entry)) return []

  return (entry.messages || []).sort(
    (a, b) => {
      const createdAtAPart = a.parts.find(
        (part): part is DataUIPart<PiperUIDataParts> & { type: 'data-createdAtInfo' } => part.type === 'data-createdAtInfo'
      );
      const createdAtBPart = b.parts.find(
        (part): part is DataUIPart<PiperUIDataParts> & { type: 'data-createdAtInfo' } => part.type === 'data-createdAtInfo'
      );
      const createdAtA = createdAtAPart ? createdAtAPart.data : undefined;
      const createdAtB = createdAtBPart ? createdAtBPart.data : undefined;
      return +new Date(createdAtA || 0) - +new Date(createdAtB || 0);
    }
  )
}

export async function cacheMessages(
  chatId: string,
  messages: UIMessage<unknown, PiperUIDataParts>[]
): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function addMessage(
  chatId: string,
  message: UIMessage<unknown, PiperUIDataParts>
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
  messages: UIMessage<unknown, PiperUIDataParts>[]
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
