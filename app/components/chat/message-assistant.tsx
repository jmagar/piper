import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import { cn } from "@/lib/utils"
import type { UIMessage as MessageAISDK } from "@ai-sdk/react"
import { ArrowClockwise, Check, Copy } from "@phosphor-icons/react"
import { getSources } from "./get-sources"
import { Reasoning } from "./reasoning"
import { SourcesList } from "./sources-list"
import { ToolInvocation } from "./tool-invocation"

type MessageAssistantProps = {
  children?: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
  parts?: MessageAISDK["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
}

export function MessageAssistant({
  children,
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  parts,
  status,
}: MessageAssistantProps) {
  const sources = getSources(parts || [])

  const toolInvocationParts = parts?.filter(
    (part): part is Extract<MessageAISDK["parts"][number], { type: 'tool-invocation' }> => part.type === "tool-invocation"
  )
  const reasoningParts = parts?.find((part): part is Extract<MessageAISDK["parts"][number], { type: 'reasoning' }> => part.type === "reasoning")

  // Extract text content from parts
  let extractedTextContent = '';
  if (parts && parts.length > 0) {
    const textPart = parts.find((part): part is Extract<MessageAISDK['parts'][number], { type: 'text' }> => part.type === 'text');
    if (textPart) {
      extractedTextContent = textPart.text;
    }
  }
  // Fallback to children if parts don't provide text content, though ideally parts should be the source of truth
  if (!extractedTextContent && children) {
    extractedTextContent = children;
  }

  const contentNullOrEmpty = extractedTextContent === null || extractedTextContent === ""

  const isLastStreaming = status === "streaming" && isLast

  return (
    <Message
      className={cn(
        "group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
    >
      <div className={cn("flex min-w-full flex-col gap-2", isLast && "pb-8")}>
        {/* Assuming reasoning content is in reasoningParts.value for ReasoningUIPart */}
        {reasoningParts && typeof reasoningParts.text === 'string' && reasoningParts.text.trim() !== '' && (
          <Reasoning reasoning={reasoningParts.text} />
        )}

        {toolInvocationParts && toolInvocationParts.length > 0 && (
          <ToolInvocation toolInvocations={toolInvocationParts} />
        )}

        {contentNullOrEmpty ? null : (
          <MessageContent
            className={cn(
              "prose dark:prose-invert relative min-w-full bg-transparent p-0",
              "prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-strong:font-medium prose-table:block prose-table:overflow-y-auto"
            )}
            markdown={true}
          >
            {extractedTextContent}
          </MessageContent>
        )}

        {sources && sources.length > 0 && <SourcesList sources={sources} />}

        {Boolean(isLastStreaming || contentNullOrEmpty) ? null : (
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
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
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
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
                aria-label="Regenerate"
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
