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
import { API_ROUTE_CREATE_AGENT } from "@/lib/routes"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState } from "react"
import { useBreakpoint } from "../../../hooks/use-breakpoint"
import { CreateAgentForm } from "./create-agent-form"

type AgentFormData = {
  name: string
  description: string
  systemPrompt: string
  mcp: string[]
  repository?: string
  prompts: string[]
}

type DialogCreateAgentTrigger = {
  trigger: React.ReactNode
}

export function DialogCreateAgentTrigger({
  trigger,
}: DialogCreateAgentTrigger) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    systemPrompt: "",
    mcp: [],
    prompts: [],
  })
  const [repository, setRepository] = useState("")
  const [error, setError] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isMobile = useBreakpoint(768)

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

    // Clear error for this field if it exists
    if (error[name]) {
      setError({ ...error, [name]: "" })
    }
  }

  const handleRepositoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const repoValue = e.target.value
    setRepository(repoValue)

    // Clear repository error if it exists
    if (error.repository) {
      setError({ ...error, repository: "" })
    }

    // Update system prompt if git-mcp is selected and repository format is valid
    if (formData.mcp.includes("git-mcp") && validateRepository(repoValue)) {
      const [owner, repo] = repoValue.split("/")
      setFormData((prev) => ({
        ...prev,
        systemPrompt: generateSystemPrompt(owner, repo),
      }))
    }
  }

  const handleSelectChange = (value: string) => {
    // Handle comma-separated string from the collapsible component
    const selectedServers = value === "" ? [] : value.split(',').filter(s => s.trim() !== '')
    setFormData({ ...formData, mcp: selectedServers })

    // Clear repository error if switching away from git-mcp
    if (!selectedServers.includes("git-mcp") && error.repository) {
      setError({ ...error, repository: "" })
    }

    // If switching to git-mcp and repository is already valid, update system prompt
    if (selectedServers.includes("git-mcp") && validateRepository(repository)) {
      const [owner, repo] = repository.split("/")
      setFormData((prev) => ({
        ...prev,
        systemPrompt: generateSystemPrompt(owner, repo),
      }))
    }
  }

  const handlePromptsChange = (selectedPromptIds: string[]) => {
    setFormData({ ...formData, prompts: selectedPromptIds });
  };

  const validateRepository = (repo: string) => {
    // Simple validation for owner/repo format
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
      // If git-mcp is selected, validate the repository
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

        // Add repository to form data
        formData.repository = repository
      }

      const owner = repository ? repository.split("/")[0] : null
      const repo = repository ? repository.split("/")[1] : null

      const apiResponse = await fetchClient(API_ROUTE_CREATE_AGENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          systemPrompt: formData.systemPrompt,
          mcp_config: formData.mcp.length === 0 ? null : formData.mcp,
          repository: formData.mcp.includes("git-mcp") ? formData.repository : null,
          owner: owner,
          repo: repo,
          prompts: formData.prompts, // Add selected prompts
        }),
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || "Failed to create agent")
      }

      const result = await apiResponse.json()
      toast({ title: "Agent created successfully!", status: "success" })
      setOpen(false) // Close dialog on success
      router.push(`/agents/${result.agent.slug}`) // Changed from result.slug to result.agent.slug
    } catch (err: unknown) {
      let errorMessage = "An unexpected error occurred."
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      // Display error toast or update error state
      toast({ title: "Error creating agent", description: errorMessage, status: "error" })
      // Optionally, set specific form field errors if applicable from err
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <CreateAgentForm
      formData={formData}
      repository={repository}
      setRepository={handleRepositoryChange}
      error={error}
      isLoading={isLoading}
      handleInputChange={handleInputChange}
      handleSelectChange={handleSelectChange}
      handlePromptsChange={handlePromptsChange} // Pass down the new handler
      handleSubmit={handleSubmit}
      onClose={() => setOpen(false)}
      isDrawer={isMobile}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <VaulDrawerHeader className="text-left">
            <VaulDrawerTitle>Create agent (experimental)</VaulDrawerTitle>
            <VaulDrawerDescription>
              Agents can use a system prompt and optionally connect to multiple MCP servers. More tools and MCP integrations are available.
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
          // Prevent the dialog from closing when clicking on the content, needed because of the agent-command component
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DialogHeader className="border-border border-b px-6 py-4">
            <DialogTitle>Create agent (experimental)</DialogTitle>
            <DialogDescription>
              Agents can use a system prompt and optionally connect to multiple MCP servers. More tools and MCP integrations are available.
            </DialogDescription>
          </DialogHeader>
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}
