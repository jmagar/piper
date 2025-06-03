"use client"

import React, { useState } from "react"
import { Check, Copy } from "lucide-react"
import { TextMorph } from "../motion-primitives/text-morph"
import { cn } from "@/lib/utils"

type ButtonCopyProps = {
  code: string
  className?: string
}

export function ButtonCopy({ code, className }: ButtonCopyProps) {
  const [hasCopyLabel, setHasCopyLabel] = useState(false)

  const onCopy = () => {
    navigator.clipboard.writeText(code)
    setHasCopyLabel(true)

    setTimeout(() => {
      setHasCopyLabel(false)
    }, 1000)
  }

  return (
    <button
      onClick={onCopy}
      type="button"
      className={cn(
        "group relative inline-flex items-center justify-center gap-1.5",
        "bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80",
        "border border-slate-200/60 dark:border-slate-700/60",
        "rounded-md px-2.5 py-1.5 text-xs font-medium",
        "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
        "transition-all duration-200 ease-out",
        "shadow-sm hover:shadow-md",
        "ring-1 ring-slate-900/5 dark:ring-slate-100/5",
        "backdrop-blur-sm",
        hasCopyLabel && "text-emerald-600 dark:text-emerald-400",
        className
      )}
    >
      {/* Icon */}
      <div className="relative w-3 h-3">
        <Copy 
          className={cn(
            "absolute inset-0 w-3 h-3 transition-all duration-200",
            hasCopyLabel ? "opacity-0 scale-75" : "opacity-100 scale-100"
          )} 
        />
        <Check 
          className={cn(
            "absolute inset-0 w-3 h-3 transition-all duration-200",
            hasCopyLabel ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )} 
        />
      </div>
      
      {/* Text with morph animation */}
      <TextMorph as="span" className="text-xs font-medium">
        {hasCopyLabel ? "Copied!" : "Copy"}
      </TextMorph>
      
      {/* Success ripple effect */}
      {hasCopyLabel && (
        <div className="absolute inset-0 rounded-md bg-emerald-100/20 dark:bg-emerald-900/20 animate-pulse" />
      )}
    </button>
  )
}
