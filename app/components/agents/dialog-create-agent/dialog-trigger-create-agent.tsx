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
import { useCallback, useState } from "react"
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

interface DialogCreateAgentTriggerProps {
  onAgentCreate: () => void
  trigger?: React.ReactNode
}

const generateSystemPrompt = (owner: string, repo: string) => {
  return `You are a helpful GitHub assistant focused on the repository: ${owner}/${repo}.\n  \nUse the available tools below to answer any questions. Always prefer using tools over guessing.\n      \nTools available for this repository:\n- \`fetch_${repo}_documentation\`: Fetch the entire documentation file. Use this first when asked about general concepts in ${owner}/${repo}.\n- \`search_${repo}_documentation\`: Semantically search the documentation. Use this for specific questions.\n- \`search_${repo}_code\`: Search code with exact matches using the GitHub API. Use when asked about file contents or code examples.\n- \`fetch_generic_url_content\`: Fetch absolute URLs when referenced in the docs or needed for context.\n    \nNever invent answers. Use tools and return what you find.`
}

const validateRepository = (repo: string) => {
  const regex = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/
  return regex.test(repo)
}

export function DialogCreateAgentTrigger({
  onAgentCreate,
  trigger,
}: DialogCreateAgentTriggerProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    systemPrompt: "",
    mcp: [],
    repository: "",
    prompts: [],
  })
  const [repository, setRepository] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { isMobile } = useBreakpoint("sm")

  const handleRepositoryChange = useCallback((value: string) => {
    setRepository(value)
    if (validateRepository(value)) {
      const [owner, repo] = value.split("/")
      const systemPrompt = generateSystemPrompt(owner, repo)
      setFormData(prev => ({ ...prev, systemPrompt, repository: value }))
      setError(null)
    } else if (value) {
      setError("Invalid repository format. Use 'owner/repo'.")
    } else {
      setError(null)
    }
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData(prev => ({ ...prev, [name]: value }))
    },
    []
  )

  const handleMcpChange = useCallback((selectedServers: string[]) => {
    setFormData(prev => ({ ...prev, mcp: selectedServers }))
  }, [])

  const handlePromptsChange = useCallback((selectedPrompts: string[]) => {
    setFormData(prev => ({ ...prev, prompts: selectedPrompts }))
  }, [])

  const validateForm = useCallback(() => {
    if (!formData.name || !formData.description) {
      return "Name and description are required."
    }
    if (repository && !validateRepository(repository)) {
      return "Invalid repository format. Use 'owner/repo'."
    }
    return null
  }, [formData, repository])

  const handleSubmit = useCallback(async () => {
    const validationError = validateForm()
    if (validationError) {
      toast({ title: validationError, status: "error" })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetchClient(API_ROUTE_CREATE_AGENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create agent")
      }

      const result = await response.json()
      toast({ title: "Agent created successfully!", status: "success" })
      onAgentCreate()
      setOpen(false)
      router.push(`/agents/${result.agent.slug}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      toast({ title: "Error", description: errorMessage, status: "error" })
    } finally {
      setIsLoading(false)
    }
  }, [formData, validateForm, router, onAgentCreate])

  const content = (
    <CreateAgentForm
      formData={formData}
      repository={repository}
      setRepository={handleRepositoryChange}
      error={error}
      isLoading={isLoading}
      handleInputChange={handleInputChange}
      handleMcpChange={handleMcpChange}
      handlePromptsChange={handlePromptsChange}
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
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
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
