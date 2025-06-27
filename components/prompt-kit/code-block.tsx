"use client"

import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import React, { useEffect, useState } from "react"
import { codeToHtml } from "shiki"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose group relative w-full overflow-hidden",
        "border-2 border-transparent bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 dark:from-pink-400/30 dark:via-purple-400/30 dark:to-cyan-400/30",
        "rounded-2xl shadow-2xl hover:shadow-pink-500/20 dark:hover:shadow-purple-500/30 transition-all duration-700 ease-out",
        "ring-2 ring-gradient-to-r ring-purple-500/30 dark:ring-cyan-400/40",
        "backdrop-blur-xl",
        "bg-gradient-to-br from-rose-50/95 via-purple-50/90 to-cyan-50/95",
        "dark:bg-gradient-to-br dark:from-slate-900/98 dark:via-purple-900/95 dark:to-indigo-900/90",
        "hover:ring-purple-500/50 dark:hover:ring-cyan-400/60",
        "hover:shadow-purple-500/25 dark:hover:shadow-cyan-500/25",
        "transform hover:scale-[1.003] transition-transform duration-400",
        "before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-r before:from-pink-500 before:via-purple-500 before:to-cyan-500 before:opacity-60 before:-z-10",
        "after:absolute after:inset-[2px] after:rounded-2xl after:bg-gradient-to-br after:from-white/95 after:via-purple-50/90 after:to-cyan-50/95 dark:after:from-slate-900/98 dark:after:via-purple-900/95 dark:after:to-indigo-900/90 after:-z-10",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/[0.08] via-purple-500/[0.06] to-cyan-500/[0.08] dark:from-pink-400/[0.12] dark:via-purple-400/[0.10] dark:to-cyan-400/[0.12] pointer-events-none rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-rose-100/30 via-purple-100/20 to-cyan-100/30 dark:via-purple-800/20 dark:from-purple-900/30 dark:to-indigo-800/30 pointer-events-none rounded-2xl" />
      
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-300/[0.3] to-transparent dark:via-purple-300/[0.2] -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-out pointer-events-none rounded-2xl" />
      
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-200/50 via-purple-200/30 to-cyan-200/50 dark:from-purple-700/40 dark:via-indigo-700/30 dark:to-cyan-700/40 pointer-events-none" />
      
      <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full opacity-60 animate-pulse" />
      <div className="absolute top-6 right-8 w-1 h-1 bg-gradient-to-r from-purple-400 to-cyan-500 rounded-full opacity-40 animate-pulse delay-300" />
      <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full opacity-50 animate-pulse delay-700" />
      
      <div className="relative z-20">
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
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function highlight() {
      const html = await codeToHtml(code, {
        lang: language,
        theme: appTheme === "dark" ? "material-theme-darker" : "material-theme-lighter",
      })
      setHighlightedHtml(html)
    }
    highlight()
  }, [code, language, theme, appTheme])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const classNames = cn(
    "w-full",
    "[&>pre]:px-6 [&>pre]:py-5 [&>pre]:m-0",
    "[&>pre]:font-mono [&>pre]:text-[0.9rem] [&>pre]:leading-[1.7]",
    "[&>pre]:font-normal [&>pre]:tracking-[0.005em]",
    "[&>pre]:bg-transparent [&>pre]:border-0",
    "[&>pre]:whitespace-pre-wrap [&>pre]:break-words",
    "[&>pre>code]:block [&>pre>code]:w-full [&>pre>code]:font-mono",
    "[&>pre>code]:text-[0.9rem] [&>pre>code]:leading-[1.7]",
    "[&>pre>code]:font-normal [&>pre>code]:tracking-[0.005em]",
    "[&>pre>code]:bg-transparent [&>pre>code]:p-0",
    "[&>pre>code]:whitespace-pre-wrap [&>pre>code]:break-words",
    "[&>pre]:subpixel-antialiased [&>pre]:[text-rendering:optimizeLegibility] [&>pre]:[font-feature-settings:'liga','calt']",
    "[&>pre>code]:subpixel-antialiased [&>pre>code]:[text-rendering:optimizeLegibility] [&>pre>code]:[font-feature-settings:'liga','calt']",
    "[&>pre]:text-slate-800 dark:[&>pre]:text-slate-50",
    "[&>pre>code]:text-slate-800 dark:[&>pre>code]:text-slate-50",
    className
  )

  return (
    <div className="relative">
      {highlightedHtml ? (
        <div
          className={classNames}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          {...props}
        />
      ) : (
        <div className={classNames} {...props}>
          <pre className="px-6 py-5 m-0 font-mono text-[0.9rem] leading-[1.7] font-normal tracking-[0.005em] bg-transparent border-0 subpixel-antialiased text-slate-800 dark:text-slate-50 [text-rendering:optimizeLegibility] [font-feature-settings:'liga','calt'] whitespace-pre-wrap break-words">
            <code className="block w-full font-mono text-[0.9rem] leading-[1.7] font-normal tracking-[0.005em] bg-transparent p-0 subpixel-antialiased [text-rendering:optimizeLegibility] [font-feature-settings:'liga','calt'] whitespace-pre-wrap break-words">
              {code}
            </code>
          </pre>
        </div>
      )}
      
      <div className="flex justify-end px-6 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0 hover:bg-purple-100/50 dark:hover:bg-purple-800/30 transition-colors duration-200"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400" />
          )}
        </Button>
      </div>
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
        "bg-gradient-to-r from-pink-100/95 via-purple-100/90 to-cyan-100/95 dark:from-purple-800/95 dark:via-indigo-800/90 dark:to-cyan-800/95",
        "border-b-2 border-gradient-to-r from-pink-300/60 via-purple-300/60 to-cyan-300/60 dark:from-pink-500/50 dark:via-purple-500/50 dark:to-cyan-500/50",
        "backdrop-blur-sm h-14",
        "shadow-[inset_0_1px_0_0_rgba(236,72,153,0.3),inset_0_-1px_0_0_rgba(168,85,247,0.2)] dark:shadow-[inset_0_1px_0_0_rgba(236,72,153,0.4),inset_0_-1px_0_0_rgba(168,85,247,0.3)]",
        "hover:bg-gradient-to-r hover:from-pink-200/95 hover:via-purple-200/90 hover:to-cyan-200/95 dark:hover:from-purple-700/95 dark:hover:via-indigo-700/90 dark:hover:to-cyan-700/95 transition-all duration-500",
        className
      )}
      {...props}
    >
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-400 opacity-70" />
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
