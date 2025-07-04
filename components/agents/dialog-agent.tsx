"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { AgentSummary } from "@/app/types/agent"
import type { Tables } from "@/app/types/database.types"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { AgentCard } from "./agent-card"
import { AgentDetail } from "./agent-detail"

type DialogAgentProps = {
  id: string
  name: string
  description: string
  avatar_url?: string | null
  example_inputs: string[]
  className?: string
  isAvailable: boolean
  slug: string
  onAgentClickAction?: (agentId: string | null) => void
  isOpen: boolean
  onOpenChangeAction: (open: boolean) => void
  randomAgents: AgentSummary[]
  trigger?: React.ReactNode
  system_prompt?: string | null
  tools?: string[] | null
  mcp_config?: Tables<"agents">["mcp_config"] | null
  isCardLight?: boolean
}

export function DialogAgent({
  id,
  name,
  description,
  avatar_url,
  example_inputs,
  slug,
  system_prompt,
  className,
  isAvailable,
  onAgentClickAction,
  isOpen,
  onOpenChangeAction,
  randomAgents,
  trigger = null,
  tools,
  mcp_config,
  isCardLight = false,
}: DialogAgentProps) {
  const isMobile = useBreakpoint(768)

  const handleOpenChange = (open: boolean) => {
    if (!isAvailable) {
      return
    }

    window.history.replaceState(null, "", `/agents/${slug}`)
    onOpenChangeAction(open)
  }

  const defaultTrigger = (
    <AgentCard
      id={id}
      name={name}
      description={description}
      avatar_url={avatar_url}
      className={className}
      isAvailable={isAvailable}
      onClick={() => handleOpenChange(true)}
      tools={tools}
      mcp_config={mcp_config}
      isLight={isCardLight}
    />
  )

  const renderContent = () => (
    <AgentDetail
      id={id}
      slug={slug}
      name={name}
      description={description}
      example_inputs={example_inputs}
      avatar_url={avatar_url}
      system_prompt={system_prompt}
      tools={tools}
      mcp_config={mcp_config}
      onAgentClickAction={onAgentClickAction}
      randomAgents={randomAgents}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{trigger || defaultTrigger}</DrawerTrigger>
        <DrawerContent className="bg-background border-border">
          {renderContent()}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent
        hasCloseButton={false}
        className="[&>button:last-child]:bg-background flex gap-0 overflow-hidden rounded-3xl p-0 shadow-xs [&>button:last-child]:rounded-full [&>button:last-child]:p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
