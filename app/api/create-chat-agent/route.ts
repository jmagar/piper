import { prisma } from "@/lib/prisma"
import { MODEL_DEFAULT } from "@/lib/config"

export async function POST(request: Request) {
  try {
    const { agentId, title, model } = await request.json()

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "Missing agentId" }),
        { status: 400 }
      )
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true }
    })

    if (!agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404 }
      )
    }

    // Create chat with agent
    const chat = await prisma.chat.create({
      data: {
        title: title || `Chat with ${agent.name}`,
        model: model || MODEL_DEFAULT,
        agentId,
      },
    })

    return new Response(
      JSON.stringify({
        chat: {
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          model: chat.model,
          agentId: chat.agentId,
        },
      }),
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error("Error in create-chat-agent endpoint:", err)

    const errorMessage = err instanceof Error ? err.message : "Internal server error"

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
