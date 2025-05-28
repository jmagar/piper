"use client"

import { toast } from "@/components/ui/toast"
import { createContext, useContext, useEffect, useState } from "react"
import { MODEL_DEFAULT } from "../../config"
import type { Chats } from "../types"
import {
  createNewChat as createNewChatFromDb,
  deleteChat as deleteChatFromDb,
  fetchAndCacheChats,
  getCachedChats,
  updateChatAgent as updateChatAgentFromDb,
  updateChatModel as updateChatModelFromDb,
  updateChatTitle,
} from "./api"

interface ChatsContextType {
  chats: Chats[]
  refresh: () => Promise<void>
  isLoading: boolean
  updateTitle: (id: string, title: string) => Promise<void>
  deleteChat: (
    id: string,
    currentChatId?: string,
    redirect?: () => void
  ) => Promise<void>
  setChats: React.Dispatch<React.SetStateAction<Chats[]>>
  createNewChat: (
    title?: string,
    model?: string
  ) => Promise<Chats | undefined>
  resetChats: () => Promise<void>
  getChatById: (id: string) => Chats | undefined
  updateChatModel: (id: string, model: string) => Promise<void>
  updateChatAgent: (
    chatId: string,
    agentId: string | null
  ) => Promise<void>
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
  const [isLoading, setIsLoading] = useState(false)
  const [chats, setChats] = useState<Chats[]>([])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const cached = await getCachedChats()
      setChats(cached)

      try {
        const fresh = await fetchAndCacheChats()
        setChats(fresh)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const refresh = async () => {
    const fresh = await fetchAndCacheChats()
    setChats(fresh)
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
    title?: string,
    model?: string
  ) => {
    const prev = [...chats]

    try {
      const newChat = await createNewChatFromDb(
        title,
        model || MODEL_DEFAULT
      )
      setChats((prev) =>
        prev
          .concat(newChat)
          .sort(
            (a, b) =>
              +new Date(b.createdAt || "") - +new Date(a.createdAt || "")
          )
      )
      return newChat
    } catch {
      setChats(prev)
      toast({ title: "Failed to create chat", status: "error" })
    }
  }

  const resetChats = async () => {
    setChats([])
  }

  const getChatById = (id: string) => {
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
      }}
    >
      {children}
    </ChatsContext.Provider>
  )
}
