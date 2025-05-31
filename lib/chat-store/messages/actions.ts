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
      interface TextPart { type: string; text: string; [key: string]: unknown; }
      let content = "";
      if (Array.isArray(message.parts) && message.parts.length > 0) {
        const firstPart = message.parts[0] as TextPart;
        if (firstPart && typeof firstPart === 'object' && firstPart.text && typeof firstPart.text === 'string') {
          content = firstPart.text;
        }
      }
      return {
        id: message.id,
        content: content,
        role: message.role as MessageAISDK["role"],
        createdAt: message.createdAt,
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
        parts: [{ type: "text", text: message.content }] 
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
      parts: [{ type: "text", text: message.content }]
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
