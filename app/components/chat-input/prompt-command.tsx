"use client"

import { cn } from "@/lib/utils"
import { Article } from "@phosphor-icons/react"
import { useEffect, useRef } from "react"

type DatabasePrompt = {
  id: string
  name: string
  description: string
  slug: string
  systemPrompt: string
}

type PromptCommandProps = {
  isOpen: boolean
  onSelectAction: (prompt: DatabasePrompt) => void
  onCloseAction: () => void
  activeIndex: number
  onActiveIndexChangeAction: (index: number) => void
  filteredPrompts: DatabasePrompt[]
}

export function PromptCommand({
  isOpen,
  onSelectAction,
  onCloseAction,
  activeIndex,
  onActiveIndexChangeAction,
  filteredPrompts,
}: PromptCommandProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLLIElement>(null)

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onCloseAction()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onCloseAction])

  // Scroll active item into view when activeIndex changes
  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest" })
    }
  }, [isOpen, activeIndex])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="bg-popover absolute bottom-full z-50 mb-2 flex w-full max-w-sm flex-col rounded-lg border shadow-md"
    >
      <div className="text-muted-foreground px-3 py-2 text-xs font-medium">
        Database Prompts
      </div>
      {filteredPrompts.length === 0 ? (
        <div className="py-6 text-center text-sm">No prompts found.</div>
      ) : (
        <ul className="max-h-[176px] overflow-auto mask-t-from-96% mask-t-to-100% p-1">
          {filteredPrompts.map((prompt, index) => {
            return (
              <li
                key={prompt.id}
                ref={index === activeIndex ? activeItemRef : null}
                className={cn(
                  "relative flex cursor-pointer flex-col rounded-lg px-2 py-1.5",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeIndex === index && "bg-accent text-accent-foreground"
                )}
                onMouseEnter={() => onActiveIndexChangeAction(index)}
                onClick={() => onSelectAction(prompt)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-dashed">
                    <Article className="text-muted-foreground size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{prompt.name}</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {prompt.description || 'No description available'}
                    </span>
                  </div>
                  <span className="bg-green-500/10 text-green-600 absolute top-4 right-2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-medium">
                    @{prompt.slug}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
} 