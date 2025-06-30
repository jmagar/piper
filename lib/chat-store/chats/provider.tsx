"use client"

import { toast } from "@/components/ui/toast"
import { createContext, useContext, useEffect, useState } from "react"
import type { Chats } from "../types"
import {
  createNewChat as createNewChatFromDb,
  deleteChat as deleteChatFromDb,
  fetchAndCacheChats,
  updateChatAgent as updateChatAgentFromDb,
  updateChatModel as updateChatModelFromDb,
  updateChatTitle,
  type CreateNewChatArgs,
} from "./api"

interface ChatsContextType {
  chats: Chats[];
  refresh: () => Promise<void>;
  isLoading: boolean;
  updateTitle: (id: string, title: string) => Promise<void>;
  deleteChat: (
    id: string,
    currentChatId?: string,
    redirect?: () => void
  ) => Promise<void>;
  setChats: React.Dispatch<React.SetStateAction<Chats[]>>;
  createNewChat: (args: CreateNewChatArgs) => Promise<Chats | undefined>;
  resetChats: () => Promise<void>;
  getChatById: (id: string) => Chats | undefined;
  updateChatModel: (id: string, model: string) => Promise<void>;
  updateChatAgent: (
    chatId: string,
    agentId: string | null
  ) => Promise<void>;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
}
const ChatsContext = createContext<ChatsContextType | null>(null)

export function useChats() {
  const context = useContext(ChatsContext)
  if (!context) throw new Error("useChats must be used within ChatsProvider")
  return context
}

export function ChatsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [chats, setChats] = useState<Chats[]>([]); // Always initialize as empty array
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const fresh = await fetchAndCacheChats()
        // Ensure we always have an array, never undefined/null
        setChats(Array.isArray(fresh) ? fresh : [])
      } catch (error) {
        console.error("Error loading chats:", error)
        // Ensure chats is always an array even on error
        setChats([])
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const refresh = async () => {
    try {
      const fresh = await fetchAndCacheChats()
      // Ensure we always have an array, never undefined/null
      setChats(Array.isArray(fresh) ? fresh : [])
    } catch (error) {
      console.error("Error refreshing chats:", error)
      // Keep existing chats on error, but ensure it's still an array
      setChats(prevChats => Array.isArray(prevChats) ? prevChats : [])
    }
  }

  const updateTitle = async (id: string, title: string) => {
    const prev = [...chats]
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
    try {
      await updateChatTitle(id, title)
    } catch {
      setChats(prev)
      toast({ title: "Failed to update title", status: "error" })
    }
  }

  const deleteChat = async (
    id: string,
    currentChatId?: string,
    redirect?: () => void
  ) => {
    const prev = [...chats]
    setChats((prev) => prev.filter((c) => c.id !== id))

    try {
      await deleteChatFromDb(id)
      if (id === currentChatId && redirect) redirect()
    } catch {
      setChats(prev)
      toast({ title: "Failed to delete chat", status: "error" })
    }
  }

  const createNewChat = async (
    args: CreateNewChatArgs
  ): Promise<Chats | undefined> => {
    try {
      // Call the API to create the chat. The API handles idempotency and may return an existing chat.
      const newChat = await createNewChatFromDb(args)

      if (!newChat || !newChat.id) {
        throw new Error("Failed to create chat: Invalid response from server")
      }

      // Critical Fix: Check if this chat already exists in our state
      // This handles the case where the API returns an existing chat due to idempotency
      setChats(prevChats => {
        const currentChats = Array.isArray(prevChats) ? prevChats : []
        
        // If the chat already exists in our state, don't add it again
        const existingChatIndex = currentChats.findIndex(chat => chat.id === newChat.id)
        if (existingChatIndex !== -1) {
          // Chat already exists - this was an idempotent response
          // Update the existing chat with the latest data from the server
          const updatedChats = [...currentChats]
          updatedChats[existingChatIndex] = newChat
          return updatedChats
        }
        
        // Chat doesn't exist - this is a genuinely new chat
        // Add it to the front and sort by creation date
        return [newChat, ...currentChats].sort(
          (a, b) =>
            +new Date(b.createdAt || "") - +new Date(a.createdAt || "")
        )
      })

      return newChat
    } catch (error) {
      console.error("Error creating new chat:", error)
      toast({ title: "Failed to create chat", status: "error" })
      return undefined
    }
  }

  const resetChats = async () => {
    setChats([])
  }

  const getChatById = (id: string) => {
    // Defensive check to prevent runtime errors during initialization
    if (!chats || !Array.isArray(chats)) {
      console.warn("getChatById: chats is not initialized yet, returning undefined")
      return undefined
    }
    const chat = chats.find((c) => c.id === id)
    return chat
  }

  const updateChatModel = async (id: string, model: string) => {
    await updateChatModelFromDb(id, model)
  }

  const updateChatAgent = async (
    chatId: string,
    agentId: string | null
  ) => {
    await updateChatAgentFromDb(chatId, agentId)
  }

  return (
    <ChatsContext.Provider
      value={{
        chats,
        refresh,
        updateTitle,
        deleteChat,
        setChats,
        createNewChat,
        resetChats,
        getChatById,
        updateChatModel,
        updateChatAgent,
        isLoading,
        activeChatId,
        setActiveChatId,
      }}
    >
      {children}
    </ChatsContext.Provider>
  )
}
