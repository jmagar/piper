"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "@phosphor-icons/react";
import type { FetchedToolInfo } from "@/lib/mcp/enhanced/types";
import { useState } from "react";

interface ToolAnnotations {
  server_id?: string;
  server_label?: string;
}

type ToolParameterInputProps = {
  tool: FetchedToolInfo;
  onSubmit: (tool: FetchedToolInfo, parameters: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function ToolParameterInput({
  tool,
  onSubmit,
  onCancel,
}: ToolParameterInputProps) {
  const annotations = tool.annotations as ToolAnnotations | undefined;
  const serverLabel = (annotations && typeof annotations.server_label === 'string') ? annotations.server_label : "Unknown Server";
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSubmit(tool, { query: query.trim() })
      setQuery("")
    }
  }

  return (
    <div className="bg-popover border-border flex items-center gap-2 rounded-lg border p-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{tool.name}</span>
        <span className="bg-blue-500/10 text-blue-600 rounded-full px-1.5 py-0.5 text-xs">
          {serverLabel}
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Enter query or parameters..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" size="sm" disabled={!query.trim()}>
          Add
        </Button>
      </form>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <X className="size-4" />
      </Button>
    </div>
  )
} 