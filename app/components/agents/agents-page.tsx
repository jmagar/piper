"use client"

import { Agent } from "@/app/types/agent"
import { Button } from "@/components/ui/button"
import { useCallback, useState } from "react"
import { DialogCreateAgentTrigger } from "./dialog-create-agent/dialog-trigger-create-agent"
import { UserAgentsSection } from "./user-agent-section"

interface AgentsPageProps {
  curatedAgents: Agent[]
  userAgents: Agent[] | null
  userId: string | null
  mutateUserAgents: () => void
}

export function AgentsPage({
  curatedAgents,
  userAgents,
  userId,
  mutateUserAgents,
}: AgentsPageProps) {
  const [openAgentId, setOpenAgentId] = useState<string | null>(null)

  const handleAgentCreate = useCallback(() => {
    mutateUserAgents()
  }, [mutateUserAgents])

  const handleAgentClick = (agentId: string | null) => {
    setOpenAgentId(agentId)
  }

  return (
    <div className="bg-background min-h-screen px-4 pt-20 pb-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Agents</h1>
          <DialogCreateAgentTrigger
            onAgentCreate={handleAgentCreate}
            trigger={<Button>Create Agent</Button>}
          />
        </div>

        <div className="mt-8">
          <UserAgentsSection
            agents={userAgents}
            userId={userId}
            handleAgentClick={handleAgentClick}
            openAgentId={openAgentId}
            setOpenAgentId={setOpenAgentId}
            onAgentCreate={handleAgentCreate}
            moreAgents={curatedAgents}
          />
        </div>
      </div>
    </div>
  )
}
