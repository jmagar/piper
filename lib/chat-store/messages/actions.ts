"use server";

import { prisma } from "@/lib/prisma";
import type { Message as MessageAISDK } from "ai";

export async function getMessagesFromDb(
  chatId: string
): Promise<MessageAISDK[]> {
  try {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });

    return messages.map((message) => {
      // Type assertion for message with content field (matches actual DB schema)
      const messageWithContent = message as typeof message & { content: string };
      
      return {
        id: messageWithContent.id,
        content: messageWithContent.content || "",
        role: messageWithContent.role as MessageAISDK["role"],
        createdAt: messageWithContent.createdAt,
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
        chatId,
        role: message.role,
        content: message.content // Use content field matching database schema
      }
    });
  } catch (error) {
    console.error("Error inserting message:", error);
  }
}

export async function insertMessagesToDb(chatId: string, messages: MessageAISDK[]) {
  try {
    const messageData = messages.map((message) => ({
      chatId,
      role: message.role,
      content: message.content // Use content field matching database schema
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
