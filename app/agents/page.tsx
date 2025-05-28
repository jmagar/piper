import { AgentsPage } from "@/app/components/agents/agents-page"
import { LayoutApp } from "@/app/components/layout/layout-app"
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
        <LayoutApp>
          <AgentsPage
            curatedAgents={agents}
            userAgents={agents} // In admin-only mode, all agents are "user" agents
            userId="admin" // Hardcoded admin user
          />
        </LayoutApp>
      </MessagesProvider>
    )
  } catch (error) {
    console.error("Error loading agents:", error)
    return (
      <MessagesProvider>
        <LayoutApp>
          <div>Error loading agents</div>
        </LayoutApp>
      </MessagesProvider>
    )
  }
}
