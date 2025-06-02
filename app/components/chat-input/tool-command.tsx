"use client"

import { cn } from "@/lib/utils"
import { Wrench } from "@phosphor-icons/react"
import { useEffect, useRef } from "react"

type MCPTool = {
  name: string
  description?: string
  serverId: string
  serverLabel: string
}

type ToolCommandProps = {
  isOpen: boolean
  onSelect: (tool: MCPTool) => void
  onClose: () => void
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  filteredTools: MCPTool[]
}

export function ToolCommand({
  isOpen,
  onSelect,
  onClose,
  activeIndex,
  onActiveIndexChange,
  filteredTools,
}: ToolCommandProps) {
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
        MCP Tools
      </div>
      {filteredTools.length === 0 ? (
        <div className="py-6 text-center text-sm">No tools found.</div>
      ) : (
        <ul className="max-h-[176px] overflow-auto mask-t-from-96% mask-t-to-100% p-1">
          {filteredTools.map((tool, index) => {
            return (
              <li
                key={`${tool.serverId}_${tool.name}`}
                ref={index === activeIndex ? activeItemRef : null}
                className={cn(
                  "relative flex cursor-pointer flex-col rounded-lg px-2 py-1.5",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeIndex === index && "bg-accent text-accent-foreground"
                )}
                onMouseEnter={() => onActiveIndexChange(index)}
                onClick={() => onSelect(tool)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-dashed">
                    <Wrench className="text-muted-foreground size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{tool.name}</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {tool.description || 'No description available'}
                    </span>
                  </div>
                  <span className="bg-blue-500/10 text-blue-600 absolute top-4 right-2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-medium">
                    {tool.serverLabel}
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