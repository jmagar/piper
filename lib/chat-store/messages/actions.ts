"use server";

import { prisma } from "@/lib/prisma";
import type { Message as MessageAISDK } from "ai";

export async function getMessagesFromDb(
  chatId: string
): Promise<MessageAISDK[]> {
  try {
    const messages = await prisma.message.findMany({
        include: {
            attachments: true,
        },
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });

    return messages.map((message) => {
      // Type assertion for message with content field (matches actual DB schema)
      const messageWithContent = message as typeof message & { content: string };
      
      // Parse parts if they exist
      let parts: MessageAISDK["parts"] = undefined;
      if (message.parts && Array.isArray(message.parts)) {
        parts = message.parts as MessageAISDK["parts"];
      }
      
      return {
        id: messageWithContent.id,
        content: messageWithContent.content || "",
        role: messageWithContent.role as MessageAISDK["role"],
        createdAt: messageWithContent.createdAt,
        parts: parts, // Include the structured parts
        experimental_attachments: [],
      };
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return [];
  }
}

export async function insertMessageToDb(chatId: string, message: MessageAISDK) {
  try {
    await prisma.message.create({
      data: {
        id: message.id,
        chatId,
        role: message.role,
        content: message.content, // Use content field matching database schema
        parts: message.parts ? JSON.parse(JSON.stringify(message.parts)) : undefined, // Convert to JSON for Prisma
      }
    });
  } catch (error) {
    console.error("Error inserting message:", error);
  }
}

export async function insertMessagesToDb(chatId: string, messages: MessageAISDK[]) {
  try {
    const messageData = messages.map((message) => ({
      id: message.id,
      chatId,
      role: message.role,
      content: message.content, // Use content field matching database schema
      parts: message.parts ? JSON.parse(JSON.stringify(message.parts)) : undefined, // Convert to JSON for Prisma
    }));
    await prisma.message.createMany({
      data: messageData
    });
  } catch (error) {
    console.error("Error inserting messages:", error);
  }
}

export async function deleteMessagesFromDb(chatId: string) {
  try {
    await prisma.message.deleteMany({
      where: { chatId }
    });
  } catch (error) {
    console.error("Failed to clear messages from database:", error);
  }
}
