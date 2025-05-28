"use client"

import { useChatSession } from "@/app/providers/chat-session-provider"
import { toast } from "@/components/ui/toast"
import type { Message as MessageAISDK } from "ai"
import { createContext, useContext, useEffect, useState } from "react"
import { writeToIndexedDB } from "../persist"
import {
  cacheMessages,
  clearMessagesForChat,
  getCachedMessages,
  setMessages as saveMessages,
} from "./api"

interface MessagesContextType {
  messages: MessageAISDK[]
  setMessages: React.Dispatch<React.SetStateAction<MessageAISDK[]>>
  refresh: () => Promise<void>
  saveAllMessages: (messages: MessageAISDK[]) => Promise<void>
  cacheAndAddMessage: (message: MessageAISDK) => Promise<void>
  resetMessages: () => Promise<void>
  deleteMessages: () => Promise<void>
}

const MessagesContext = createContext<MessagesContextType | null>(null)

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context)
    throw new Error("useMessages must be used within MessagesProvider")
  return context
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<MessageAISDK[]>([])
  const { chatId } = useChatSession()

  useEffect(() => {
    if (chatId === null) {
      setMessages([])
    }
  }, [chatId])

  useEffect(() => {
    if (!chatId) return

    const load = async () => {
      const cached = await getCachedMessages(chatId)
      setMessages(cached) // Optimistically set cached messages first

      try {
        const response = await fetch(`/api/messages/${chatId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fresh: MessageAISDK[] = await response.json();
        setMessages(fresh)
        cacheMessages(chatId, fresh)
      } catch (e: unknown) {
        console.error("Failed to fetch messages from API:", e)
        const description = e instanceof Error ? e.message : 'Unknown error';
        toast({ title: "Failed to fetch messages", description, status: "error" })
      }
    }

    load()
  }, [chatId])

  const refresh = async () => {
    if (!chatId) return

    try {
      const response = await fetch(`/api/messages/${chatId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const fresh: MessageAISDK[] = await response.json();
      setMessages(fresh)
    } catch (e: unknown) {
      console.error("Failed to refresh messages:", e);
      const description = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: "Failed to refresh messages", description, status: "error" })
    }
  }

  const cacheAndAddMessage = async (message: MessageAISDK) => {
    if (!chatId) return

    try {
      setMessages((prev) => {
        const updated = [...prev, message]
        writeToIndexedDB("messages", { id: chatId, messages: updated })
        return updated
      })
    } catch (e: unknown) {
      console.error("Failed to save message to IndexedDB:", e);
      const description = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: "Failed to save message locally", description, status: "error" })
    }
  }

  const saveAllMessages = async (newMessages: MessageAISDK[]) => {
    if (!chatId) return

    try {
      await saveMessages(chatId, newMessages)
      setMessages(newMessages)
    } catch (e: unknown) {
      console.error("Failed to save messages to DB:", e);
      const description = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: "Failed to save messages to server", description, status: "error" })
    }
  }

  const deleteMessages = async () => {
    if (!chatId) return

    setMessages([])
    try {
      await clearMessagesForChat(chatId)
    } catch (e: unknown) {
      console.error("Failed to delete messages:", e);
      const description = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: "Failed to delete messages", description, status: "error" })
    }
  }

  const resetMessages = async () => {
    if (!chatId) return
    setMessages([])
    await clearMessagesForChat(chatId) // Assuming this might also throw, though not explicitly handled before
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        setMessages,
        refresh,
        saveAllMessages,
        cacheAndAddMessage,
        resetMessages,
        deleteMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}
