"use client"

import { Conversation } from "@/app/components/chat/conversation"

type Message = {
  id: string
  content: string
  role: "user" | "assistant"
  createdAt: Date
}

type PublicConversationProps = {
  messages: Message[]
}

export function PublicConversation({ messages }: PublicConversationProps) {
  return (
    <Conversation
      messages={messages}
      status={undefined}
      onDelete={() => {}} // No editing on public view
      onEdit={() => {}} // No editing on public view  
      onReload={() => {}} // No reloading on public view
    />
  )
} 