"use client"

import { cn } from "@/lib/utils"
import { Article } from "@phosphor-icons/react"
import { useEffect, useRef } from "react"

type DatabaseRule = {
  id: string
  name: string
  description: string
  slug: string
  systemPrompt: string
}

type RuleCommandProps = {
  isOpen: boolean
  onSelect: (rule: DatabaseRule) => void
  onClose: () => void
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  filteredRules: DatabaseRule[]
}

export function RuleCommand({
  isOpen,
  onSelect,
  onClose,
  activeIndex,
  onActiveIndexChange,
  filteredRules,
}: RuleCommandProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLLIElement>(null)

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

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
        Database Rules
      </div>
      {filteredRules.length === 0 ? (
        <div className="py-6 text-center text-sm">No rules found.</div>
      ) : (
        <ul className="max-h-[176px] overflow-auto mask-t-from-96% mask-t-to-100% p-1">
          {filteredRules.map((rule, index) => {
            return (
              <li
                key={rule.id}
                ref={index === activeIndex ? activeItemRef : null}
                className={cn(
                  "relative flex cursor-pointer flex-col rounded-lg px-2 py-1.5",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeIndex === index && "bg-accent text-accent-foreground"
                )}
                onMouseEnter={() => onActiveIndexChange(index)}
                onClick={() => onSelect(rule)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-dashed">
                    <Article className="text-muted-foreground size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{rule.name}</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {rule.description || 'No description available'}
                    </span>
                  </div>
                  <span className="bg-green-500/10 text-green-600 absolute top-4 right-2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-medium">
                    @{rule.slug}
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