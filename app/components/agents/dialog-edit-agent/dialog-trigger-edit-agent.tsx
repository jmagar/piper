"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription as VaulDrawerDescription,
  DrawerHeader as VaulDrawerHeader,
  DrawerTitle as VaulDrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { toast } from "@/components/ui/toast"
import { fetchClient } from "@/lib/fetch"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState, useEffect } from "react"
import { useBreakpoint } from "../../../hooks/use-breakpoint"
import { EditAgentForm } from "./edit-agent-form"
import type { Tables } from "@/app/types/database.types"

type AgentFormData = {
  name: string
  description: string
  systemPrompt: string
  mcp: string[]
  repository?: string
  tools: string[]
}

type DialogEditAgentTriggerProps = {
  trigger: React.ReactNode
  agentData: {
    id: string
    slug: string
    name: string
    description: string
    system_prompt?: string | null
    tools?: string[] | null
    mcp_config?: Tables<"agents">["mcp_config"] | null
  }
  onAgentUpdatedAction?: () => void
}

export function DialogEditAgentTrigger({
  trigger,
  agentData,
  onAgentUpdatedAction,
}: DialogEditAgentTriggerProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    systemPrompt: "",
    mcp: [],
    tools: [],
  })
  const [repository, setRepository] = useState("")
  const [error, setError] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isMobile = useBreakpoint(768)

  // Pre-populate form data when dialog opens
  useEffect(() => {
    if (open && agentData) {
      const mcpArray = Array.isArray(agentData.mcp_config) 
        ? (agentData.mcp_config as string[])
        : agentData.mcp_config 
          ? [agentData.mcp_config as string]
          : []

      setFormData({
        name: agentData.name,
        description: agentData.description,
        systemPrompt: agentData.system_prompt || "",
        mcp: mcpArray,
        tools: agentData.tools || [],
      })
      
      // If git-mcp is configured, try to extract repository info
      if (mcpArray.includes("git-mcp") && agentData.system_prompt) {
        const repoMatch = agentData.system_prompt.match(/repository: ([^.]+)/)
        if (repoMatch) {
          setRepository(repoMatch[1])
        }
      }
    }
  }, [open, agentData])

  const generateSystemPrompt = (owner: string, repo: string) => {
    return `You are a helpful GitHub assistant focused on the repository: ${owner}/${repo}.
    
Use the available tools below to answer any questions. Always prefer using tools over guessing.
        
Tools available for this repository:
- \`fetch_${repo}_documentation\`: Fetch the entire documentation file. Use this first when asked about general concepts in ${owner}/${repo}.
- \`search_${repo}_documentation\`: Semantically search the documentation. Use this for specific questions.
- \`search_${repo}_code\`: Search code with exact matches using the GitHub API. Use when asked about file contents or code examples.
- \`fetch_generic_url_content\`: Fetch absolute URLs when referenced in the docs or needed for context.
      
Never invent answers. Use tools and return what you find.`
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    if (error[name]) {
      setError({ ...error, [name]: "" })
    }
  }

  const handleRepositoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const repoValue = e.target.value
    setRepository(repoValue)

    if (error.repository) {
      setError({ ...error, repository: "" })
    }

    if (formData.mcp.includes("git-mcp") && validateRepository(repoValue)) {
      const [owner, repo] = repoValue.split("/")
      setFormData((prev) => ({
        ...prev,
        systemPrompt: generateSystemPrompt(owner, repo),
      }))
    }
  }

  const handleSelectChange = (value: string) => {
    const selectedServers = value === "" ? [] : value.split(',').filter(s => s.trim() !== '')
    setFormData({ ...formData, mcp: selectedServers })

    if (!selectedServers.includes("git-mcp") && error.repository) {
      setError({ ...error, repository: "" })
    }

    if (selectedServers.includes("git-mcp") && validateRepository(repository)) {
      const [owner, repo] = repository.split("/")
      setFormData((prev) => ({
        ...prev,
        systemPrompt: generateSystemPrompt(owner, repo),
      }))
    }
  }

  const handleToolsChange = (selectedTools: string[]) => {
    setFormData({ ...formData, tools: selectedTools })
  }

  const validateRepository = (repo: string) => {
    const regex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/
    return regex.test(repo)
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = "Agent name is required"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    if (!formData.systemPrompt.trim()) {
      newErrors.systemPrompt = "System prompt is required"
    }

    if (formData.mcp.includes("git-mcp") && !validateRepository(repository)) {
      newErrors.repository =
        'Please enter a valid repository in the format "owner/repo"'
    }

    setError(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      if (formData.mcp.includes("git-mcp")) {
        const response = await fetch(
          `https://api.github.com/repos/${repository}`
        )

        if (!response.ok) {
          if (response.status === 404) {
            setError({
              ...error,
              repository:
                "Repository not found. Please check the repository name and try again.",
            })
          } else {
            setError({
              ...error,
              repository: `GitHub API error: ${response.statusText}`,
            })
          }
          setIsLoading(false)
          return
        }

        formData.repository = repository
      }

      const owner = repository ? repository.split("/")[0] : null
      const repo = repository ? repository.split("/")[1] : null

      const apiResponse = await fetchClient(`/api/update-agent/${agentData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          systemPrompt: formData.systemPrompt,
          mcp_config: formData.mcp.length === 0 ? null : formData.mcp,
          repository: formData.mcp.includes("git-mcp") ? formData.repository : null,
          tools: formData.tools,
          owner: owner,
          repo: repo,
        }),
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || "Failed to update agent")
      }

      toast({ title: "Agent updated successfully!", status: "success" })
      setOpen(false)
      
      // Call the callback to refresh agent data if provided
      if (onAgentUpdatedAction) {
        onAgentUpdatedAction()
      }
      
      // Refresh the current page to reflect changes
      router.refresh()
    } catch (err: unknown) {
      let errorMessage = "An unexpected error occurred."
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      toast({ title: "Error updating agent", description: errorMessage, status: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <EditAgentForm
      formData={formData}
      repository={repository}
      setRepositoryAction={handleRepositoryChange}
      error={error}
      isLoading={isLoading}
      handleInputChangeAction={handleInputChange}
      handleSelectChangeAction={handleSelectChange}
      handleToolsChangeAction={handleToolsChange}
      handleSubmitAction={handleSubmit}
      onCloseAction={() => setOpen(false)}
      isDrawer={isMobile}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <VaulDrawerHeader className="text-left">
            <VaulDrawerTitle>Edit agent</VaulDrawerTitle>
            <VaulDrawerDescription>
              Edit your agent&apos;s configuration, system prompt, and MCP server connections.
            </VaulDrawerDescription>
          </VaulDrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div
          className="h-full w-full"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DialogHeader className="border-border border-b px-6 py-4">
            <DialogTitle>Edit agent</DialogTitle>
            <DialogDescription>
              Edit your agent&apos;s configuration, system prompt, and MCP server connections.
            </DialogDescription>
          </DialogHeader>
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
} 