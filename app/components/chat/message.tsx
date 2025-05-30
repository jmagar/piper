import { UIMessage as MessageType } from "@ai-sdk/react"
import React, { useState } from "react"
import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"

type MessageProps = {
  variant: MessageType["role"]
  children?: string // Made optional as content will come from parts
  id: string
  // attachments?: MessageType["experimental_attachments"] // Removed: attachments are now part of 'parts'
  isLast?: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  hasScrollAnchor?: boolean
  parts?: MessageType["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
}

export function Message({
  variant,
  children,
  id,
  // attachments, // Removed, attachments are now part of 'parts'
  isLast,
  onDelete,
  onEdit,
  onReload,
  hasScrollAnchor,
  parts,
  status,
}: MessageProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    // This function is now primarily for the assistant's copy button, 
    // which might copy a summarized or specific part. 
    // MessageUser has its own copy logic passed via prop.
    // For assistant, if children (old way) exists, use it, otherwise it's complex from parts.
    // This will be refined when MessageAssistant handles its own copy logic based on parts.
    navigator.clipboard.writeText(children || "") 
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  // Extract text content for user messages, assuming simple text for now.
  // More complex user messages (e.g. with images) would require parts handling in MessageUser too.
  let userTextContent = '';
  if (variant === 'user' && parts && parts.length > 0) {
    // Use MessageType['parts'][number] to correctly type an individual part
    const textPart = parts.find((part: MessageType['parts'][number]) => part.type === 'text');
    if (textPart && textPart.type === 'text') {
      userTextContent = textPart.text;
    }
  }

  if (variant === "user") {
    return (
      <MessageUser
        copied={copied}
        copyToClipboardAction={() => navigator.clipboard.writeText(userTextContent || children || '')}
        onReloadAction={onReload}
        onEditAction={onEdit}
        onDeleteAction={onDelete}
        id={id}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
      >
        {userTextContent || children || ''}
      </MessageUser>
    )
  }

  if (variant === "assistant") {
    return (
      <MessageAssistant
        // children prop is removed; content is solely from parts
        copied={copied}
        // copyToClipboard for assistant messages will need to be handled within MessageAssistant based on its rendered parts
        copyToClipboard={copyToClipboard} // This might need adjustment in MessageAssistant
        onReload={onReload}
        isLast={isLast}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
        status={status}
      />
    )
  }

  return null
}
