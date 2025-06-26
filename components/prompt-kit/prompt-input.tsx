"use client"

import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

type PromptInputContextType = {
  isLoading: boolean
  value: string
  setValue: (value: string) => void
  maxHeight: number | string
  onSubmit?: () => void
  disabled?: boolean
}

const PromptInputContext = createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
})

function usePromptInput() {
  const context = useContext(PromptInputContext)
  if (!context) {
    throw new Error("usePromptInput must be used within a PromptInput")
  }
  return context
}

type PromptInputProps = {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  maxHeight?: number | string
  onSubmit?: () => void
  children: React.ReactNode
  className?: string
}

function PromptInput({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || "")

  const handleChange = (newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <PromptInputContext.Provider
      value={{
        isLoading,
        value: value ?? internalValue,
        setValue: onValueChange ?? handleChange,
        maxHeight,
        onSubmit,
      }}
    >
      <div
        className={cn(
          "border-input bg-background rounded-3xl border p-2 shadow-xs",
          className
        )}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  )
}

export type PromptInputTextareaProps = {
  disableAutosize?: boolean
} & React.ComponentProps<typeof Textarea>

/**
 * A textarea component for prompt input that supports auto-resizing and context-based state management.
 *
 * Automatically adjusts its height to fit content using debounced resizing and `ResizeObserver` when available. Submits the prompt on Enter (without Shift) and supports disabling autosize. Consumes value, setter, max height, submit handler, and disabled state from the prompt input context.
 *
 * @param disableAutosize - If true, disables the auto-resizing behavior.
 * @param onKeyDown - Optional keydown event handler for additional custom logic.
 */
function PromptInputTextarea({
  className,
  onKeyDown,
  disableAutosize = false,
  ...props
}: PromptInputTextareaProps) {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Optimized auto-sizing with debouncing and ResizeObserver
  useEffect(() => {
    if (disableAutosize || !textareaRef.current) return

    const textarea = textareaRef.current
    let timeoutId: ReturnType<typeof setTimeout>

    const resizeTextarea = () => {
      // Use requestAnimationFrame to avoid layout thrashing
      requestAnimationFrame(() => {
        textarea.style.height = "auto"
        textarea.style.height = `${textarea.scrollHeight}px`
      })
    }

    // Debounce the resize operation to reduce frequency
    const debouncedResize = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(resizeTextarea, 50) // 50ms debounce
    }

    // Initial resize
    resizeTextarea()

    // Use ResizeObserver if available for better performance
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(debouncedResize)
      resizeObserver.observe(textarea)
      
      return () => {
        resizeObserver.disconnect()
        if (timeoutId) clearTimeout(timeoutId)
      }
    } else {
      // Fallback to debounced resize on value change
      debouncedResize()
      return () => {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }
  }, [value, disableAutosize])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
    onKeyDown?.(e)
  }

  const maxHeightStyle =
    typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight

  return (
    <Textarea
      ref={textareaRef}
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "text-primary min-h-[44px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        "overflow-y-auto",
        className
      )}
      style={{
        maxHeight: maxHeightStyle,
      }}
      rows={1}
      disabled={disabled}
      {...props}
    />
  )
}

type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>

function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  )
}

type PromptInputActionProps = {
  className?: string
  tooltip: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
} & React.ComponentProps<typeof Tooltip>

function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: PromptInputActionProps) {
  const { disabled } = usePromptInput()

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
}
