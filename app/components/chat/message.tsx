"use client"

import { Message as MessageType } from "@ai-sdk/react"
import React from "react"
import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"
import { useChatHandlersContext } from "@/app/providers/chat-handlers-provider"

type MessageProps = {
  variant: MessageType["role"]
  children: string
  id: string
  attachments?: MessageType["experimental_attachments"]
  isLast?: boolean
  hasScrollAnchor?: boolean
  parts?: MessageType["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  createdAt?: Date | string
}

export function Message({
  variant,
  children,
  id,
  attachments,
  isLast,
  hasScrollAnchor,
  parts,
  status,
  createdAt,
}: MessageProps) {
  const { onDelete, onEdit, onReload } = useChatHandlersContext()
  const [copied, setCopied] = React.useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  // Convert createdAt to Date if it's a string
  const timestamp = createdAt
    ? typeof createdAt === "string"
      ? new Date(createdAt)
      : createdAt
    : undefined

  if (variant === "user") {
    return (
      <MessageUser
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        onEdit={onEdit}
        onDelete={onDelete}
        id={id}
        hasScrollAnchor={hasScrollAnchor}
        attachments={attachments}
        timestamp={timestamp}
      >
        {children}
      </MessageUser>
    )
  }

  if (variant === "assistant") {
    return (
      <MessageAssistant
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        isLast={isLast}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
        status={status}
        timestamp={timestamp}
      >
        {children}
      </MessageAssistant>
    )
  }

  return null
}
