import {
  Message,
  MessageAction,
  MessageActions,
} from "@/components/prompt-kit/message"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Message as MessageAISDK } from "@ai-sdk/react"
import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils"
import {
  ArrowClockwise,
  Check,
  Copy,
  Warning,
  Robot,
  Scroll,
  CircleNotch,
  CheckCircle,
} from "@phosphor-icons/react"
import { memo, useMemo, useState } from "react"
import { getSources } from "./get-sources"
import { SourcesList } from "./sources-list"
import { InlinePartsRenderer } from "./inline-parts-renderer"
import { ToolLogViewer } from "./tool-log-viewer"

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
  const toolInvocations = useMemo(
    () =>
      parts?.filter(
        (part): part is ToolInvocationUIPart =>
          part.type === "tool-invocation"
      ) ?? [],
    [parts]
  )

  const contentNullOrEmpty = children === null || children === ""
  const isLastStreaming = status === "streaming" && isLast
  const isError = status === "error" && isLast

  const hasRunningTools = useMemo(
    () => toolInvocations.some(t => t.toolInvocation.state === "call"),
    [toolInvocations]
  )

  const getAriaLabel = () => {
    if (isError) return "Piper's response failed"
    if (isLastStreaming) return "Piper is currently pondering"
    return "Piper's response complete"
  }
  
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

        <div className="relative">
          <div
            className={cn(
              "rounded-2xl bg-slate-100 p-4 shadow-md dark:bg-slate-800"
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
                  <div className="mt-2 flex items-center">
                    <div
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                      aria-label="AI is currently generating a response"
                      role="status"
                    >
                      <div className="flex space-x-1" aria-hidden="true">
                        <div
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Actions and Tool Badge Container --- */}
        <div className="flex w-full min-h-[38px] items-start justify-between">
          {/* MessageActions on the left (visible on hover) */}
          <MessageActions
            className={cn(
              "flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100",
              (isLastStreaming || contentNullOrEmpty || isError) && "invisible" // Use invisible to reserve space
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

          {/* Tool badge on the right (always visible when tools exist) */}
          <div className="flex justify-end">
            {toolInvocations.length > 0 && (
              <div className="mt-1 flex items-center gap-1 rounded-full bg-slate-100 p-1 shadow-md dark:bg-slate-800">
                <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 dark:bg-slate-700">
                  {hasRunningTools ? (
                    <CircleNotch className="size-4 animate-spin text-amber-500" />
                  ) : (
                    <CheckCircle className="size-4 text-emerald-500" />
                  )}
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {toolInvocations.length}
                  </span>
                </div>
                <ToolLogViewer toolInvocations={toolInvocations}>
                  <button
                    className="flex size-7 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"
                    aria-label="View tool logs"
                  >
                    <Scroll className="size-4 text-slate-500 dark:text-slate-400" />
                  </button>
                </ToolLogViewer>
              </div>
            )}
          </div>
        </div>

        {sources && sources.length > 0 && <SourcesList sources={sources} />}
      </div>
    </Message>
  )
}

export const MessageAssistant = memo(MessageAssistantComponent)
