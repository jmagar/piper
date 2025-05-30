"use client"

import { Conversation } from "@/app/components/chat/conversation"
import type { UIMessage } from "ai"

type PublicConversationProps = {
  messages: UIMessage[]
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