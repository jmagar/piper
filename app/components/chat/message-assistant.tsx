import {
  Message,
  MessageAction,
  MessageActions,
} from "@/components/prompt-kit/message"
import { cn } from "@/lib/utils"
import type { Message as MessageAISDK } from "@ai-sdk/react"
import { ArrowClockwise, Check, Copy, Warning } from "@phosphor-icons/react"
import { memo, useMemo } from "react"
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
}: MessageAssistantProps) => {
  const sources = useMemo(() => getSources(parts), [parts])

  const contentNullOrEmpty = children === null || children === ""
  const isLastStreaming = status === "streaming" && isLast
  const isError = status === "error" && isLast

  // Format content for streaming responses to ensure proper line breaks
  const formattedContent = useMemo(() => {
    if (isLastStreaming && children && !children.startsWith('\n')) {
      return `\n${children}`
    }
    return children
  }, [isLastStreaming, children])

  // Accessibility announcements
  const getAriaLabel = () => {
    if (isError) return "AI response failed"
    if (isLastStreaming) return "AI is currently responding"
    return "AI response complete"
  }

  // Calculate response stats for streaming
  const responseStats = useMemo(() => {
    if (!children || !isLastStreaming) return null
    
    const wordCount = children.trim().split(/\s+/).filter(word => word.length > 0).length
    const charCount = children.length
    
    return { wordCount, charCount }
  }, [children, isLastStreaming])

  return (
    <Message
      className={cn(
        "group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
    >
      <div 
        className={cn("flex min-w-full flex-col gap-2", isLast && "pb-8")}
        aria-label={getAriaLabel()}
        role="region"
        aria-live={isLastStreaming ? "polite" : "off"}
      >
        {/* Error state */}
        {isError && (
          <div 
            className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm"
            role="alert"
            aria-label="AI response error"
          >
            <Warning className="size-4 text-destructive" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Response failed to generate</p>
              <p className="text-muted-foreground mt-1">
                {children || "The AI response encountered an error. Please try again."}
              </p>
            </div>
            <button
              onClick={onReload}
              className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors focus:ring-2 focus:ring-destructive/50 focus:outline-none"
              aria-label="Retry generating AI response"
            >
              Retry
            </button>
          </div>
        )}

        {/* Normal content with inline parts rendering */}
        {!isError && !contentNullOrEmpty && (
          <div className="relative">
            <InlinePartsRenderer 
              parts={parts}
              textContent={formattedContent}
              isStreaming={isLastStreaming}
            />
            
            {/* Streaming indicator with stats */}
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
                  <span className="font-medium">AI is responding...</span>
                </div>
                
                {/* Response progress stats */}
                {responseStats && responseStats.wordCount > 0 && (
                  <div className="text-xs text-muted-foreground/70">
                    {responseStats.wordCount} word{responseStats.wordCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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

// Memoize the component for better performance during streaming
export const MessageAssistant = memo(MessageAssistantComponent, (prevProps, nextProps) => {
  // Custom comparison for streaming optimization
  if (prevProps.status === "streaming" && nextProps.status === "streaming") {
    // Only re-render if content actually changed during streaming
    return prevProps.children === nextProps.children
  }
  
  // For non-streaming states, do deep comparison
  return (
    prevProps.children === nextProps.children &&
    prevProps.status === nextProps.status &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.copied === nextProps.copied &&
    prevProps.hasScrollAnchor === nextProps.hasScrollAnchor &&
    JSON.stringify(prevProps.parts) === JSON.stringify(nextProps.parts)
  )
})
