import {
  Message,
  MessageAction,
  MessageActions,
} from "@/components/prompt-kit/message"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Message as MessageAISDK } from "@ai-sdk/react"
import { ArrowClockwise, Check, Copy, Warning, Robot } from "@phosphor-icons/react"
import { memo, useMemo, useState } from "react"
import { getSources } from "./get-sources"
import { SourcesList } from "./sources-list"
import { InlinePartsRenderer } from "./inline-parts-renderer"

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
  parts?: MessageAISDK["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  timestamp?: Date
}

const MessageAssistantComponent = ({
  children,
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  parts,
  status,
  timestamp,
}: MessageAssistantProps) => {
  const [showTimestamp, setShowTimestamp] = useState(false)
  const sources = useMemo(() => getSources(parts), [parts])

  const contentNullOrEmpty = children === null || children === ""
  const isLastStreaming = status === "streaming" && isLast
  const isError = status === "error" && isLast

  const getAriaLabel = () => {
    if (isError) return "Piper's response failed"
    if (isLastStreaming) return "Piper is currently pondering"
    return "Piper's response complete"
  }
  
  const responseStats = useMemo(() => {
    if (!children || !isLastStreaming) return null
    
    const wordCount = children.trim().split(/\s+/).filter(word => word.length > 0).length
    return { wordCount }
  }, [children, isLastStreaming])
  
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date)
  }

  return (
    <Message
      className={cn(
        "group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <Avatar className="size-8 shrink-0 mt-1">
        <AvatarImage src="/assistant-avatar.svg" alt="Assistant" />
        <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
          <Robot className="size-4 text-slate-500 dark:text-slate-400" />
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex min-w-0 flex-1 flex-col gap-2 relative", isLast && "pb-8")}>
        {showTimestamp && timestamp && (
          <div className="absolute -top-6 right-0 z-10 text-xs text-muted-foreground">
            {formatTimestamp(timestamp)}
          </div>
        )}

        <div 
          className={cn(
            "rounded-2xl border bg-background p-4 shadow-sm",
            "border-input"
          )}
          aria-label={getAriaLabel()}
          role="region"
          aria-live={isLastStreaming ? "polite" : "off"}
        >
          {isError && (
            <div 
              className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-red-50 p-3 text-sm dark:bg-red-900/20"
              role="alert"
              aria-label="AI response error"
            >
              <Warning className="size-5 text-destructive" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Response failed to generate</p>
                <p className="text-muted-foreground mt-1">
                  {children || "Piper encountered an error. Please try again."}
                </p>
              </div>
              <button
                onClick={onReload}
                className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 focus:outline-none focus:ring-2 focus:ring-destructive/50"
                aria-label="Retry generating AI response"
              >
                Retry
              </button>
            </div>
          )}

          {!isError && !contentNullOrEmpty && (
            <div className="relative">
              <InlinePartsRenderer 
                parts={parts}
                textContent={children}
                isStreaming={isLastStreaming}
              />
              
              {isLastStreaming && (
                <div className="mt-2 flex items-center justify-between">
                  <div 
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                    aria-label="AI is currently generating a response"
                    role="status"
                  >
                    <div className="flex space-x-1" aria-hidden="true">
                      <div className="animate-pulse rounded-full bg-current w-1.5 h-1.5" style={{ animationDelay: '0ms' }}></div>
                      <div className="animate-pulse rounded-full bg-current w-1.5 h-1.5" style={{ animationDelay: '150ms' }}></div>
                      <div className="animate-pulse rounded-full bg-current w-1.5 h-1.5" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="font-medium">Pondering...</span>
                  </div>
                  
                  {responseStats && responseStats.wordCount > 0 && (
                    <div className="text-xs text-muted-foreground/70">
                      {responseStats.wordCount} word{responseStats.wordCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {sources && sources.length > 0 && <SourcesList sources={sources} />}

        {Boolean(isLastStreaming || contentNullOrEmpty || isError) ? null : (
          <MessageActions
            className={cn(
              "-ml-2 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100"
            )}
          >
            <MessageAction
              tooltip={copied ? "Copied!" : "Copy text"}
              side="bottom"
            >
              <button
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition focus:ring-2 focus:ring-accent focus:outline-none"
                aria-label="Copy text"
                onClick={copyToClipboard}
                type="button"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </MessageAction>
            <MessageAction tooltip="Regenerate" side="bottom" delayDuration={0}>
              <button
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition focus:ring-2 focus:ring-accent focus:outline-none"
                aria-label="Regenerate response"
                onClick={onReload}
                type="button"
              >
                <ArrowClockwise className="size-4" />
              </button>
            </MessageAction>
          </MessageActions>
        )}
      </div>
    </Message>
  )
}

export const MessageAssistant = memo(MessageAssistantComponent)
