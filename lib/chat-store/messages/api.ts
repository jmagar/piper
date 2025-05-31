import type { Message as MessageAISDK } from "ai";
import { readFromIndexedDB, writeToIndexedDB } from "../persist";
import {
  getMessagesFromDb as getMessagesFromDbAction, // Alias to avoid name clash
  insertMessageToDb,
  insertMessagesToDb,
  deleteMessagesFromDb,
} from "./actions";

type ChatMessageEntry = {
  id: string;
  messages: MessageAISDK[];
};

export async function getMessagesFromDb(
  chatId: string
): Promise<MessageAISDK[]> {
  // This function now primarily serves as a wrapper if needed,
  // or could be removed if provider calls action directly.
  // For now, it calls the server action.
  try {
    return await getMessagesFromDbAction(chatId);
  } catch (error) {
    console.error("Failed to fetch messages via api.ts wrapper:", error);
    return [];
  }
}

export async function getCachedMessages(
  chatId: string
): Promise<MessageAISDK[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId);

  if (!entry || Array.isArray(entry)) return [];

  return (entry.messages || []).sort(
    (a, b) => +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
  );
}

export async function cacheMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages });
}

export async function addMessage(
  chatId: string,
  message: MessageAISDK
): Promise<void> {
  await insertMessageToDb(chatId, message); // Call Server Action
  const current = await getCachedMessages(chatId);
  const updated = [...current, message];
  await writeToIndexedDB("messages", { id: chatId, messages: updated });
}

export async function setMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await insertMessagesToDb(chatId, messages); // Call Server Action
  await writeToIndexedDB("messages", { id: chatId, messages });
}

export async function clearMessagesCache(chatId: string): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages: [] });
}

export async function clearMessagesForChat(chatId: string): Promise<void> {
  await deleteMessagesFromDb(chatId); // Call Server Action
  await clearMessagesCache(chatId);
}
