import { prisma } from "@/lib/prisma"
import { TOOL_REGISTRY, ToolId } from "../tools"

export async function loadAgent(agentId: string) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    })

    if (!agent) {
      throw new Error("Agent not found")
    }

    const activeTools = Array.isArray(agent.tools)
      ? agent.tools
          .map((toolId: string) => {
            const tool = TOOL_REGISTRY[toolId as ToolId]
            if (!tool) return null
            if (!tool.isAvailable?.()) return null
            return tool
          })
          .filter(Boolean)
      : []

    return {
      systemPrompt: agent.system_prompt,
      tools: activeTools,
      maxSteps: 5, // Default for admin-only mode
      mcpConfig: agent.mcp_config,
    }
  } catch (error) {
    console.error("Error loading agent:", error)
    throw new Error("Agent not found")
  }
}
