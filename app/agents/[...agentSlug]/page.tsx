import { AgentDetail } from "@/app/components/agents/agent-detail"
import { ClientLayoutWrapper } from "@/app/components/layout/client-layout-wrapper"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function AgentIdPage({
  params,
}: {
  params: Promise<{ agentSlug: string | string[] }>
}) {
  const { agentSlug: slugParts } = await params
  const agentSlug = Array.isArray(slugParts) ? slugParts.join("/") : slugParts

  try {
    // Fetch agent from local database
    const agent = await prisma.agent.findUnique({
      where: { slug: agentSlug }
    })

    if (!agent) {
      notFound()
    }

    // Get other agents for recommendations
    const otherAgents = await prisma.agent.findMany({
      where: {
        slug: { not: agentSlug }
      },
      take: 4,
      orderBy: { createdAt: 'desc' }
    })

    return (
      <MessagesProvider>
        <ClientLayoutWrapper>
          <div className="bg-background mx-auto max-w-3xl pt-20">
            <AgentDetail
              id={agent.id}
              slug={agent.slug}
              name={agent.name}
              description={agent.description}
              example_inputs={agent.example_inputs || []}
              avatar_url={agent.avatar_url}
              randomAgents={otherAgents}
              isFullPage
              system_prompt={agent.system_prompt}
              tools={agent.tools}
              mcp_config={agent.mcp_config}
            />
          </div>
        </ClientLayoutWrapper>
      </MessagesProvider>
    )
  } catch (error) {
    console.error("Error loading agent:", error)
    notFound()
  }
}
