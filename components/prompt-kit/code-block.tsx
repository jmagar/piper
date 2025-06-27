"use client"

import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import React, { useEffect, useState } from "react"
import { codeToHtml } from "shiki"
import { Button } from "@/components/ui/button"
import { Copy, Check, Edit, Save, X, Sparkles } from "lucide-react"
import { CodeMirrorEditor } from "./code-mirror-editor"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose group relative w-full overflow-hidden",
        "rounded-xl border border-border/20 bg-background/95 backdrop-blur-sm",
        "shadow-lg hover:shadow-xl transition-all duration-300",
        "hover:border-border/40",
        className
      )}
      {...props}
    >
      <div className="relative z-10">
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
  onSave?: (newCode: string) => Promise<void>
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "tsx",
  theme = "github-light",
  className,
  onSave,
  ...props
}: CodeBlockCodeProps) {
  const { theme: appTheme } = useTheme()
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCode, setEditedCode] = useState(code)
  const [isSaving, setIsSaving] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)

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

  useEffect(() => {
    setEditedCode(code)
  }, [code])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditedCode(code)
  }

  const handleSave = async () => {
    if (!onSave) return
    
    setIsSaving(true)
    try {
      await onSave(editedCode)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedCode(code)
  }

  const handleEnhance = async () => {
    if (!onSave) return
    
    setIsEnhancing(true)
    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: isEditing ? editedCode : code }),
      })

      if (!response.ok) {
        throw new Error('Failed to enhance prompt')
      }

      const data = await response.json()
      if (data.enhancedPrompt) {
        if (isEditing) {
          setEditedCode(data.enhancedPrompt)
        } else {
          setEditedCode(data.enhancedPrompt)
          setIsEditing(true)
        }
      }
    } catch (err) {
      console.error('Failed to enhance prompt:', err)
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleDoubleClick = () => {
    if (onSave && !isEditing) {
      handleEdit()
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
      {/* Action buttons */}
      <div className="absolute top-4 right-4 z-30 flex gap-2">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 hover:bg-red-100/50 dark:hover:bg-red-800/30 transition-colors duration-200 bg-background/80 backdrop-blur-sm border border-border/30"
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEnhance}
              disabled={isEnhancing}
              className="h-8 w-8 p-0 hover:bg-amber-100/50 dark:hover:bg-amber-800/30 transition-colors duration-200 bg-background/80 backdrop-blur-sm border border-border/30"
            >
              <Sparkles className={cn("h-4 w-4", isEnhancing ? "animate-pulse" : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || editedCode === code}
              className="h-8 w-8 p-0 hover:bg-green-100/50 dark:hover:bg-green-800/30 transition-colors duration-200 bg-background/80 backdrop-blur-sm border border-border/30"
            >
              <Save className={cn("h-4 w-4", isSaving ? "animate-pulse" : "text-green-500")} />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0 hover:bg-purple-100/50 dark:hover:bg-purple-800/30 transition-colors duration-200 bg-background/80 backdrop-blur-sm border border-border/30"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400" />
              )}
            </Button>
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 w-8 p-0 hover:bg-blue-100/50 dark:hover:bg-blue-800/30 transition-colors duration-200 bg-background/80 backdrop-blur-sm border border-border/30"
              >
                <Edit className="h-4 w-4 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400" />
              </Button>
            )}
          </>
        )}
      </div>
      
      {/* Content container with proper overflow handling */}
      <div 
        className="overflow-hidden"
        onDoubleClick={handleDoubleClick}
        style={{ cursor: onSave && !isEditing ? 'pointer' : 'default' }}
      >
        {isEditing ? (
          <CodeMirrorEditor
            value={editedCode}
            onChange={setEditedCode}
            onSave={handleSave}
            onCancel={handleCancel}
            language={language}
            className="min-h-[200px]"
          />
        ) : highlightedHtml ? (
          <div
            className={classNames}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            {...props}
          />
        ) : (
          <div className={classNames} {...props}>
            <pre className="px-6 py-5 m-0 font-mono text-[0.9rem] leading-[1.7] font-normal tracking-[0.005em] bg-transparent border-0 subpixel-antialiased text-slate-800 dark:text-slate-50 [text-rendering:optimizeLegibility] [font-feature-settings:'liga','calt'] whitespace-pre-wrap break-words min-w-0">
              <code className="block w-full font-mono text-[0.9rem] leading-[1.7] font-normal tracking-[0.005em] bg-transparent p-0 subpixel-antialiased [text-rendering:optimizeLegibility] [font-feature-settings:'liga','calt'] whitespace-pre-wrap break-words">
                {code}
              </code>
            </pre>
          </div>
        )}
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
