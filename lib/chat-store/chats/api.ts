"use server";
import { readFromIndexedDB, writeToIndexedDB } from "@/lib/chat-store/persist"
import type { Chat } from "@/lib/chat-store/types"
import { prisma } from "@/lib/prisma" // Keep for other functions, will address them later if needed
import { serverFetch } from "../../server-fetch"
import {
  API_ROUTE_UPDATE_CHAT_MODEL,
} from "../../routes"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function getChatsForUserInDb(): Promise<Chat[]> {
  try {
    const response = await fetch(`${APP_URL}/api/chats/user`) // Fetch from the new API route
    if (!response.ok) {
      console.error("Failed to fetch user chats from API:", response.statusText)
      return []
    }
    const chats: Chat[] = await response.json()
    // The API route /api/chats/user should ideally return data in the Chat[] format.
    // If it returns raw Prisma data, mapping might still be needed here.
    // For now, assuming API returns compatible Chat[] structure.
    // The API includes messages, so the mapping for messages might not be needed if API returns full objects.
    // However, the original mapping also initialized attachments: [].
    return chats.map(chat => ({
      ...chat, // Spread the chat data from API
      messages: chat.messages || [], // Ensure messages is an array
      attachments: chat.attachments || [], // Ensure attachments is an array, or initialize if not present
    }))
  } catch (error) {
    console.error("Error fetching chats via API:", error)
    return []
  }
}

export async function updateChatTitleInDb(id: string, title: string) {
  try {
    await prisma.chat.update({
      where: { id },
      data: { title }
    })
  } catch (error) {
    console.error("Error updating chat title:", error)
    throw error
  }
}

export async function deleteChatInDb(id: string) {
  try {
    // Delete messages first (cascade should handle this, but being explicit)
    await prisma.message.deleteMany({
      where: { chatId: id }
    })
    
    // Delete attachments
    await prisma.attachment.deleteMany({
      where: { chatId: id }
    })
    
    // Delete chat
    await prisma.chat.delete({
      where: { id }
    })
  } catch (error) {
    console.error("Error deleting chat:", error)
    throw error
  }
}

export async function getAllUserChatsInDb(): Promise<Chat[]> {
  return getChatsForUserInDb()
}

export async function createChatInDb(
  title: string,
  model: string,
  systemPrompt: string
): Promise<string> { // Returns string or throws
  try {
    const chat = await prisma.chat.create({
      data: {
        title,
        model,
        systemPrompt
      }
    });
    return chat.id;
  } catch (error) {
    console.error("Error creating chat in DB:", error);
    throw new Error(`Failed to create chat in database: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function fetchAndCacheChats(): Promise<Chat[]> {
  try {
    const chats = await getChatsForUserInDb()
    await writeToIndexedDB("chats", chats)
    return chats
  } catch (error) {
    console.error("Error fetching and caching chats:", error)
    return await getCachedChats()
  }
}

export async function getCachedChats(): Promise<Chat[]> {
  try {
    // Explicitly acknowledge that readFromIndexedDB might return a nested array
    const storedValue = await readFromIndexedDB<Chat[] | Chat[][]>("chats")

    if (Array.isArray(storedValue)) {
      if (storedValue.length === 0) {
        return [] // An empty array is a valid Chat[]
      }
      // Check if the first element is itself an array, indicating Chat[][]
      if (Array.isArray(storedValue[0])) {
        console.warn(
          "getCachedChats: Detected a nested array (Chat[][]) in IndexedDB for 'chats'. " +
          "This is unexpected. Returning the first sub-array if valid, or empty array."
        )
        // Attempt to recover by taking the first sub-array. This assumes a structure like [[chat1, chat2], ...]
        // and that the first sub-array is the intended Chat[]. This is a workaround.
        const firstSubArray = storedValue[0] as Chat[]
        return Array.isArray(firstSubArray) ? firstSubArray : []
      }
      // If not a nested array, then it should be Chat[]
      return storedValue as Chat[]
    }
    // If storedValue is not an array (e.g., null, undefined), return empty array
    return []
  } catch (error) {
    console.error("Error reading cached chats:", error)
    return []
  }
}

export async function updateChatTitle(
  id: string,
  title: string
): Promise<void> {
  await updateChatTitleInDb(id, title)
  const all = await getCachedChats()
  const updated = all.map((c) =>
    c.id === id ? { ...c, title } : c
  )
  await writeToIndexedDB("chats", updated)
}

export async function deleteChat(id: string): Promise<void> {
  await deleteChatInDb(id)
  const all = await getCachedChats()
  await writeToIndexedDB(
    "chats",
    all.filter((c) => c.id !== id)
  )
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const allChats = await getCachedChats()
  return allChats.find((c) => c.id === chatId) || null
}

export async function getUserChats(): Promise<Chat[]> {
  const data = await getAllUserChatsInDb()
  await writeToIndexedDB("chats", data)
  return data
}

export async function createChat(
  title: string,
  model: string,
  systemPrompt: string
): Promise<string> {
  const id = await createChatInDb(title, model, systemPrompt)
  const finalId = id ?? crypto.randomUUID()

  const newChat: Chat = {
    id: finalId,
    title,
    model,
    systemPrompt: systemPrompt,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
    attachments: [],
    agentId: null,
  }

  const currentChats = await getCachedChats()
  currentChats.unshift(newChat)
  await writeToIndexedDB("chats", currentChats)

  return finalId
}

export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await serverFetch(API_ROUTE_UPDATE_CHAT_MODEL, {
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

    const all = await getCachedChats()
    const updated = all.map((c) =>
      c.id === chatId ? { ...c, model } : c
    )
    await writeToIndexedDB("chats", updated)

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

export async function createNewChat(
  title?: string,
  model?: string
): Promise<Chat> {
  const response = await serverFetch("/api/create-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      model,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(`Failed to create chat: ${errorData.error || "Unknown error"}`)
  }

  const data = await response.json()
  
  if (!data.chat) {
    throw new Error("Failed to create chat: No chat returned")
  }
  
  const newChat = data.chat as Chat
  
  const currentChats = await getCachedChats()
  currentChats.unshift(newChat)
  await writeToIndexedDB("chats", currentChats)
  
  return newChat
}

export async function updateChatAgent(
  chatId: string,
  agentId: string | null
) {
  try {
    await prisma.chat.update({
      where: { id: chatId },
      data: { agentId }
    })
    
    // Update cache
    const all = await getCachedChats()
    const updated = all.map((c) =>
      c.id === chatId ? { ...c, agentId: agentId } : c
    )
    await writeToIndexedDB("chats", updated)
  } catch (error) {
    console.error("Error updating chat agent:", error)
    throw error
  }
}
