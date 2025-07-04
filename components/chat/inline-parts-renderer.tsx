"use client"

import { MessageContent } from "@/components/prompt-kit/message"
import { cn } from "@/lib/utils"
import type { Message as MessageAISDK } from "@ai-sdk/react"

interface InlinePartsRendererProps {
  parts?: MessageAISDK["parts"]
  textContent?: string
  className?: string
  isStreaming?: boolean
}

export function InlinePartsRenderer({
  parts,
  textContent,
  className,
  isStreaming,
}: InlinePartsRendererProps) {
  // Consolidate all text content from parts, or fall back to the main textContent prop.
  // The parent MessageAssistant component is now responsible for rendering tool UI.
  const content =
    parts
      ?.filter(part => part.type === "text")
      .map(part => (part.type === "text" ? part.text : ""))
      .join("") || textContent

  if (!content) {
    return null
  }

  return (
    <MessageContent
      className={cn(
        "prose dark:prose-invert relative min-w-full bg-transparent p-0",
        isStreaming && "streaming-content",
        className
      )}
      markdown={true}
    >
      {content}
    </MessageContent>
  )
} 