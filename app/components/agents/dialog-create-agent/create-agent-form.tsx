"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Check, ChevronDown, Github, X } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { ToolsSection } from "./tools-section"

// Import MCPServerOption interface from our new API endpoint
export interface MCPServerOption {
  key: string
  label: string
  transportType: string
  status?: string
}

type AgentFormData = {
  name: string
  description: string
  systemPrompt: string
  mcp: string[]  // Changed from string to string[] for multiple selection
  repository?: string
  tools: string[]
}

type CreateAgentFormProps = {
  formData: AgentFormData
  repository: string
  setRepository: (e: React.ChangeEvent<HTMLInputElement>) => void
  error: { [key: string]: string }
  isLoading: boolean
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void
  handleSelectChange: (value: string) => void
  handleToolsChange: (selectedTools: string[]) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  onClose: () => void
  isDrawer?: boolean
}

export function CreateAgentForm({
  formData,
  repository,
  setRepository,
  error,
  isLoading,
  handleInputChange,
  handleSelectChange,
  handleToolsChange,
  handleSubmit,
  onClose,
  isDrawer = false,
}: CreateAgentFormProps) {
  // State for MCP server options
  const [mcpServers, setMcpServers] = useState<MCPServerOption[]>([])
  const [mcpLoading, setMcpLoading] = useState(true)
  const [mcpError, setMcpError] = useState<string | null>(null)
  const [mcpCollapsibleOpen, setMcpCollapsibleOpen] = useState(false)

  // Handle MCP server selection/deselection
  const handleMcpToggle = (serverKey: string, checked: boolean) => {
    let newSelection: string[]
    if (checked) {
      newSelection = [...formData.mcp, serverKey]
    } else {
      newSelection = formData.mcp.filter(key => key !== serverKey)
    }
    // Convert array to string for compatibility with existing handleSelectChange
    handleSelectChange(newSelection.join(','))
  }

  // Fetch MCP server options on component mount
  useEffect(() => {
    async function fetchMcpServers() {
      try {
        setMcpLoading(true)
        setMcpError(null)
        
        const response = await fetch('/api/agents/mcp-options')
        if (!response.ok) {
          throw new Error(`Failed to fetch MCP servers: ${response.status}`)
        }
        
        const data = await response.json()
        setMcpServers(data.servers || [])
      } catch (err) {
        console.error('Error fetching MCP servers:', err)
        setMcpError(err instanceof Error ? err.message : 'Failed to load MCP servers')
        setMcpServers([]) // Fallback to empty array
      } finally {
        setMcpLoading(false)
      }
    }

    fetchMcpServers()
  }, [])

  return (
    <div
      className={`space-y-0 ${isDrawer ? "p-0 pb-16" : "py-0"} overflow-y-auto`}
    >
      {isDrawer && (
        <div className="border-border mb-2 flex items-center justify-between border-b px-4 pb-2">
          <h2 className="text-lg font-medium">Create agent (experimental)</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="px-6 py-4">
        <div className="bg-muted/50 mb-6 rounded-lg p-3">
          <p className="text-sm">
            Agents can use a system prompt and optionally connect to multiple MCP servers. 
            More tools and MCP integrations are available.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Agent Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Agent name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Agent"
              value={formData.name}
              onChange={handleInputChange}
              className={error.name ? "border-red-500" : ""}
            />

            {error.name && (
              <div className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                <span>{error.name}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="A short description of what this agent does"
              value={formData.description}
              onChange={handleInputChange}
              className={error.description ? "border-red-500" : ""}
            />
            <p className="text-muted-foreground text-xs">
              Short sentence, used in list/search
            </p>
            {error.description && (
              <div className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                <span>{error.description}</span>
              </div>
            )}
          </div>

          <ToolsSection onSelectTools={handleToolsChange} />

          {/* MCP Servers Collapsible */}
          <div className="space-y-2">
            <Label>MCP Servers</Label>
            <Collapsible
              open={mcpCollapsibleOpen}
              onOpenChange={setMcpCollapsibleOpen}
              className="space-y-2"
            >
              <div className="flex items-center justify-between space-x-4 px-1">
                <h4 className="text-sm font-semibold">
                  {formData.mcp.length === 0
                    ? "Select MCP servers"
                    : `${formData.mcp.length} server(s) selected`}
                </h4>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Toggle MCP Servers</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-3 rounded-md border p-4">
                {/* None option */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mcp-none"
                    checked={formData.mcp.includes('none')}
                    onCheckedChange={(checked) => handleMcpToggle('none', !!checked)}
                  />
                  <Label htmlFor="mcp-none" className="text-sm font-normal">
                    None
                  </Label>
                </div>

                {/* Loading state */}
                {mcpLoading && (
                  <div className="text-sm text-muted-foreground">
                    Loading MCP servers...
                  </div>
                )}

                {/* Error state */}
                {mcpError && !mcpLoading && (
                  <div className="text-sm text-red-500">
                    Error: {mcpError}
                  </div>
                )}

                {/* Dynamic server options */}
                {!mcpLoading && !mcpError && mcpServers.length > 0 && 
                  mcpServers.map((server) => (
                    <div key={server.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mcp-${server.key}`}
                        checked={formData.mcp.includes(server.key)}
                        onCheckedChange={(checked) => handleMcpToggle(server.key, !!checked)}
                      />
                      <Label htmlFor={`mcp-${server.key}`} className="text-sm font-normal flex-1">
                        {server.label}
                        <span className="text-muted-foreground text-xs ml-2">
                          ({server.transportType})
                        </span>
                      </Label>
                    </div>
                  ))
                }

                {/* No servers available */}
                {!mcpLoading && !mcpError && mcpServers.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No MCP servers available
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
            
            {/* Show error message below collapsible */}
            {mcpError && (
              <div className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                <span>Failed to load MCP servers. Using fallback options.</span>
              </div>
            )}
          </div>

          {/* Repository (only shown if git-mcp is selected) */}
          {formData.mcp.includes("git-mcp") && (
            <div className="space-y-2">
              <Label htmlFor="repository">GitHub repository</Label>
              <div className="flex items-center">
                <Github className="text-muted-foreground mr-2 h-4 w-4" />
                <Input
                  id="repository"
                  placeholder="owner/repo"
                  value={repository}
                  onChange={setRepository}
                  className={error.repository ? "border-red-500" : ""}
                />
              </div>

              {error.repository && (
                <div className="mt-1 flex items-center text-sm text-red-500">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  <span>{error.repository}</span>
                </div>
              )}
            </div>
          )}

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System prompt</Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              placeholder="You are a helpful assistant..."
              value={formData.systemPrompt}
              onChange={handleInputChange}
              className={`h-32 font-mono ${error.systemPrompt ? "border-red-500" : ""}`}
            />
            {error.systemPrompt && (
              <div className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                <span>{error.systemPrompt}</span>
              </div>
            )}
          </div>

          {/* Tools (only shown if git-mcp is selected) */}
          {formData.mcp.includes("git-mcp") && (
            <div className="overflow-hidden rounded-lg border p-2">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Enabled tools via git-mcp:
                </h3>
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700"
                >
                  <Check className="mr-1 h-3 w-3" /> Enabled
                </Badge>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>get_repo_info</li>
                <li>list_issues</li>
                <li>create_issue</li>
                <li>get_file_contents</li>
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Agent..." : "Create Agent"}
          </Button>
        </form>
      </div>
    </div>
  )
}
