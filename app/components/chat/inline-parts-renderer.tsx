"use client"

import { MessageContent } from "@/components/prompt-kit/message"
import { cn } from "@/lib/utils"
import type { Message as MessageAISDK } from "@ai-sdk/react"
import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils"
import { Spinner, Wrench, CaretDown, CheckCircle as Check, Code, ArrowRight, Play } from "@phosphor-icons/react"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

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
  if (!parts || parts.length === 0) {
    // Fallback to just text content if no parts
    if (textContent) {
      return (
        <MessageContent
          className={cn(
            "prose dark:prose-invert relative min-w-full bg-transparent p-0",
            "prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-strong:font-medium prose-table:block prose-table:overflow-y-auto",
            isStreaming && "streaming-content",
            className
          )}
          markdown={true}
        >
          {textContent}
        </MessageContent>
      )
    }
    return null
  }

  // Check if textContent is already included in parts as a text part
  const hasTextParts = parts.some(part => part.type === 'text')
  const shouldRenderTextContent = textContent && !hasTextParts

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {parts.map((part, index) => (
        <PartRenderer key={`${part.type}-${index}`} part={part} />
      ))}
      
      {/* Only render textContent if it's not already included in parts */}
      {shouldRenderTextContent && (
        <MessageContent
          className={cn(
            "prose dark:prose-invert relative min-w-full bg-transparent p-0",
            "prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-strong:font-medium prose-table:block prose-table:overflow-y-auto",
            isStreaming && "streaming-content"
          )}
          markdown={true}
        >
          {textContent}
        </MessageContent>
      )}
    </div>
  )
}

interface PartRendererProps {
  part: NonNullable<MessageAISDK["parts"]>[number]
}

function PartRenderer({ part }: PartRendererProps) {
  switch (part.type) {
    case "text":
      return (
        <MessageContent
          className="prose dark:prose-invert relative min-w-full bg-transparent p-0 prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-strong:font-medium prose-table:block prose-table:overflow-y-auto"
          markdown={true}
        >
          {part.text || ""}
        </MessageContent>
      )

    case "tool-invocation":
      return <InlineToolInvocation toolData={part as ToolInvocationUIPart} />

    case "reasoning":
      return (
        <div className="bg-muted/30 border-l-4 border-blue-500 p-3 rounded-r-md">
          <div className="text-xs font-medium text-muted-foreground mb-1">Reasoning</div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {part.reasoning || ""}
          </div>
        </div>
      )

    case "step-start":
      return (
        <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 p-3 rounded-r-md">
          <div className="flex items-center gap-2">
            <Play className="size-4 text-green-600 dark:text-green-400" />
            <div className="text-xs font-medium text-green-600 dark:text-green-400">
              Starting Step
            </div>
          </div>
          {(part as { description?: string }).description && (
            <div className="text-sm text-green-700 dark:text-green-300 mt-1">
              {(part as { description?: string }).description}
            </div>
          )}
        </div>
      )

    default:
      // Handle other part types generically - but don't show the error for now
      console.warn(`Unhandled part type: ${part.type}`, part)
      return null
  }
}

interface InlineToolInvocationProps {
  toolData: ToolInvocationUIPart
}

function InlineToolInvocation({ toolData }: InlineToolInvocationProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { toolInvocation } = toolData
  const { state, toolName, args } = toolInvocation
  const isLoading = state === "call" || state === "partial-call"
  const isCompleted = state === "result"
  const result = isCompleted && 'result' in toolInvocation ? toolInvocation.result : undefined

  const renderToolResult = () => {
    if (!result) {
      return (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 italic">
          No result data available
        </div>
      )
    }

    // Handle different result formats
    if (typeof result === "string") {
      return (
        <div className="relative">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )
    }

    if (Array.isArray(result)) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
              {result.length} items
            </div>
            <span className="text-gray-600 dark:text-gray-400">returned</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md border overflow-hidden">
            <pre className="p-3 text-xs font-mono overflow-auto max-h-60 leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )
    }

    if (typeof result === "object" && result !== null) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full font-medium">
              Object
            </div>
            <span className="text-gray-600 dark:text-gray-400">result</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md border overflow-hidden">
            <pre className="p-3 text-xs font-mono overflow-auto max-h-60 leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
        <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          {String(result)}
        </div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-blue-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-300/60 dark:border-blue-800/60 dark:from-blue-950/30 dark:to-indigo-950/20 dark:hover:border-blue-700/60">
      {/* Animated background on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/0 to-indigo-100/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-blue-900/0 dark:to-indigo-900/0" />
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-200"
      >
        {/* Tool icon with enhanced styling */}
        <div className="flex-shrink-0 p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/50 transition-colors duration-200 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50">
          <Wrench className="size-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        
        {/* Tool name with enhanced typography */}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">
            {toolName}
          </div>
          <div className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
            Tool execution
          </div>
        </div>
        
        {/* Enhanced status indicators */}
        <AnimatePresence mode="popLayout" initial={false}>
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              key="loading"
              className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm"
            >
              <Spinner className="size-3.5 animate-spin" />
              <span>Running</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              key="completed"
              className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm"
            >
              <Check className="size-3.5" />
              <span>Completed</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Expand/collapse indicator */}
        <CaretDown
          className={cn(
            "size-4 text-blue-500 dark:text-blue-400 transition-transform duration-200 flex-shrink-0",
            isExpanded ? "rotate-180" : ""
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="overflow-hidden border-t border-blue-200/60 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/20"
          >
            <div className="p-4 space-y-4">
              {/* Arguments Section */}
              {args && Object.keys(args).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/50">
                      <Code className="size-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                      Arguments
                    </span>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-700/50 rounded-md p-3 backdrop-blur-sm">
                    <div className="space-y-2">
                      {Object.entries(args).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-3 group">
                          <ArrowRight className="size-3 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-xs text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-800/70 px-2 py-0.5 rounded">
                                {key}
                              </span>
                            </div>
                            <div className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100/70 dark:bg-gray-800/70 p-2 rounded border break-all">
                              {typeof value === "object"
                                ? JSON.stringify(value, null, 2)
                                : String(value)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Result Section */}
              {isCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/50">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">
                      Result
                    </span>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 border border-emerald-200/50 dark:border-emerald-700/50 rounded-md p-3 backdrop-blur-sm">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderToolResult()}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 