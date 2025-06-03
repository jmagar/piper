"use client"

import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import React, { useEffect, useState } from "react"
import { codeToHtml } from "shiki"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose group relative w-full flex-col overflow-hidden",
        "bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900 dark:to-slate-950",
        "border border-slate-200/60 dark:border-slate-700/60",
        "rounded-xl shadow-sm hover:shadow-md transition-all duration-300",
        "ring-1 ring-slate-900/5 dark:ring-slate-100/5",
        "backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.02] via-transparent to-purple-500/[0.02] dark:from-blue-400/[0.03] dark:to-purple-400/[0.03] pointer-events-none" />
      
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "tsx",
  theme = "github-light",
  className,
  ...props
}: CodeBlockCodeProps) {
  const { theme: appTheme } = useTheme()
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)

  useEffect(() => {
    async function highlight() {
      const html = await codeToHtml(code, {
        lang: language,
        theme: appTheme === "dark" ? "github-dark" : "github-light",
      })
      setHighlightedHtml(html)
    }
    highlight()
  }, [code, language, theme, appTheme])

  const classNames = cn(
    "w-full overflow-x-auto",
    "[&>pre]:px-5 [&>pre]:py-4 [&>pre]:!bg-transparent",
    "[&>pre]:font-mono [&>pre]:text-[0.875rem] [&>pre]:leading-[1.6]",
    "[&>pre]:font-normal [&>pre]:tracking-[0.01em]",
    "[&>pre>code]:block [&>pre>code]:w-full [&>pre>code]:font-mono",
    "[&>pre>code]:text-[0.875rem] [&>pre>code]:leading-[1.6]",
    "[&>pre>code]:font-normal [&>pre>code]:tracking-[0.01em]",
    "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600",
    // Enhanced font rendering
    "[&>pre]:subpixel-antialiased [&>pre]:[text-rendering:optimizeLegibility]",
    "[&>pre>code]:subpixel-antialiased [&>pre>code]:[text-rendering:optimizeLegibility]",
    className
  )

  // SSR fallback: render plain code if not hydrated yet
  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre className="px-5 py-4 font-mono text-[0.875rem] leading-[1.6] font-normal tracking-[0.01em] bg-transparent subpixel-antialiased">
        <code className="block w-full font-mono text-[0.875rem] leading-[1.6] font-normal tracking-[0.01em] subpixel-antialiased">
          {code}
        </code>
      </pre>
    </div>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between relative",
        "bg-gradient-to-r from-slate-100/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80",
        "border-b border-slate-200/60 dark:border-slate-700/60",
        "backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
