"use client"

import { createContext, useContext, ReactNode } from "react"

type ChatHandlers = {
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
}

const ChatHandlersContext = createContext<ChatHandlers | undefined>(undefined)

export const ChatHandlersProvider = ({
  children,
  handlers,
}: {
  children: ReactNode
  handlers: ChatHandlers
}) => {
  return (
    <ChatHandlersContext.Provider value={handlers}>
      {children}
    </ChatHandlersContext.Provider>
  )
}

export const useChatHandlersContext = () => {
  const context = useContext(ChatHandlersContext)
  if (!context) {
    throw new Error(
      "useChatHandlersContext must be used within a ChatHandlersProvider"
    )
  }
  return context
} 