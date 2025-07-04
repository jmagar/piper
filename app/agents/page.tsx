import { AgentsPage } from "@/components/agents/agents-page"
import { ClientLayoutWrapper } from "@/components/layout/client-layout-wrapper"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function Page() {
  try {
    // Fetch agents from local database
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return (
      <MessagesProvider>
        <ClientLayoutWrapper>
          <AgentsPage
            curatedAgents={agents}
            userAgents={agents} // In admin-only mode, all agents are "user" agents
            userId="admin" // Hardcoded admin user
          />
        </ClientLayoutWrapper>
      </MessagesProvider>
    )
  } catch (error) {
    console.error("Error loading agents:", error)
    return (
      <MessagesProvider>
        <ClientLayoutWrapper>
          <div>Error loading agents</div>
        </ClientLayoutWrapper>
      </MessagesProvider>
    )
  }
}
