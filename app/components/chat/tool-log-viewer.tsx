"use client"

import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Wrench } from "@phosphor-icons/react"

interface ToolLogViewerProps {
  toolInvocations: ToolInvocationUIPart[]
  children: React.ReactNode // The trigger element
}

export function ToolLogViewer({
  toolInvocations,
  children,
}: ToolLogViewerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="max-w-3xl w-screen" side="top" align="end">
        <div className="max-h-[70vh] overflow-y-auto p-1">
          <div className="flex flex-col gap-2">
            {toolInvocations.map((tool, index) => (
              <ToolLogEntry
                key={`${tool.toolInvocation.toolName}-${index}`}
                tool={tool}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ToolLogEntryProps {
  tool: ToolInvocationUIPart
}

function ToolLogEntry({ tool }: ToolLogEntryProps) {
  const { toolName, args, state } = tool.toolInvocation

  const result: unknown =
    state === "result" ? tool.toolInvocation.result : undefined

  // --- Type-safe parsing for human-readable results ---

  // 1. Define the specific shape we're looking for
  type TextContentItem = { type: "text"; text: string }
  type ResultWithContent = { content: TextContentItem[] }

  // 2. Create a type guard to safely check the unknown result
  const isResultWithContent = (data: unknown): data is ResultWithContent => {
    return (
      typeof data === "object" &&
      data !== null &&
      "content" in data &&
      Array.isArray((data as { content: unknown }).content) &&
      ((data as { content: unknown[] }).content.every(
        item =>
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          (item as { type: unknown }).type === "text" &&
          "text" in item &&
          typeof (item as { text: unknown }).text === "string"
      ))
    )
  }

  // 3. Use the type guard to safely extract the text
  let readableText: string | null = null
  if (isResultWithContent(result)) {
    readableText = result.content.map(item => item.text).join("\n")
  }

  const formattedResult =
    result !== undefined ? JSON.stringify(result, null, 2) : undefined

  // Error handling needs to be revisited based on SDK specifics
  const formattedError = undefined

  return (
    <div className="rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center gap-2 text-sm">
        <Wrench className="size-4 flex-shrink-0 text-slate-500" />
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
          {toolName}
        </span>
      </div>
      <div className="mt-2 space-y-2">
        <div>
          <h4 className="text-xs font-semibold uppercase text-slate-500">
            Arguments
          </h4>
          <pre className="mt-1 overflow-x-auto rounded bg-slate-100 p-2 font-mono text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
            <code>{JSON.stringify(args, null, 2)}</code>
          </pre>
        </div>
        {formattedResult && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-slate-500">
              Result
            </h4>
            <pre className="mt-1 overflow-x-auto rounded bg-slate-100 p-2 font-mono text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              {/* Prefer the clean text, but fall back to the raw JSON */}
              <code>{readableText ?? formattedResult}</code>
            </pre>
          </div>
        )}
        {formattedError && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-destructive">
              Error
            </h4>
            <pre className="mt-1 overflow-x-auto rounded bg-destructive/10 p-2 font-mono text-xs text-destructive/80">
              <code>{formattedError}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
} 