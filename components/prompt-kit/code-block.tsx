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
        "not-prose group relative w-full overflow-hidden",
        "border border-slate-200/80 dark:border-slate-700/80",
        "rounded-xl shadow-sm hover:shadow-md transition-all duration-300",
        "ring-1 ring-slate-900/5 dark:ring-slate-100/10",
        "backdrop-blur-sm",
        "bg-gradient-to-br from-slate-50/90 to-slate-100/60 dark:from-slate-900/95 dark:to-slate-800/90",
        className
      )}
      {...props}
    >
      {/* Enhanced gradient overlay with better contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.015] via-transparent to-purple-500/[0.015] dark:from-blue-400/[0.02] dark:to-purple-400/[0.02] pointer-events-none" />
      
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
        // Use better theme options for improved contrast
        theme: appTheme === "dark" ? "github-dark-default" : "github-light-default",
      })
      setHighlightedHtml(html)
    }
    highlight()
  }, [code, language, theme, appTheme])

  const classNames = cn(
    "w-full overflow-x-auto",
    "[&>pre]:px-5 [&>pre]:py-4 [&>pre]:m-0",
    "[&>pre]:font-mono [&>pre]:text-[0.875rem] [&>pre]:leading-[1.6]",
    "[&>pre]:font-normal [&>pre]:tracking-[0.01em]",
    "[&>pre]:bg-transparent [&>pre]:border-0",
    "[&>pre>code]:block [&>pre>code]:w-full [&>pre>code]:font-mono",
    "[&>pre>code]:text-[0.875rem] [&>pre>code]:leading-[1.6]",
    "[&>pre>code]:font-normal [&>pre>code]:tracking-[0.01em]",
    "[&>pre>code]:bg-transparent [&>pre>code]:p-0",
    "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-400/50 dark:scrollbar-thumb-slate-500/50",
    "scrollbar-thumb-rounded-full hover:scrollbar-thumb-slate-400/70 dark:hover:scrollbar-thumb-slate-500/70",
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
      <pre className="px-5 py-4 m-0 font-mono text-[0.875rem] leading-[1.6] font-normal tracking-[0.01em] bg-transparent border-0 subpixel-antialiased text-slate-800 dark:text-slate-200">
        <code className="block w-full font-mono text-[0.875rem] leading-[1.6] font-normal tracking-[0.01em] bg-transparent p-0 subpixel-antialiased">
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
        "bg-gradient-to-r from-slate-100/95 to-slate-50/95 dark:from-slate-800/95 dark:to-slate-750/95",
        "border-b border-slate-200/80 dark:border-slate-600/60",
        "backdrop-blur-sm h-12",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
