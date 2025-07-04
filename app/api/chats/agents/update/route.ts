import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { chatId, agentId } = await request.json()

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: "Missing chatId" }),
        { status: 400 }
      )
    }

    // Update chat with new agent (or remove agent if agentId is null)
    const chat = await prisma.chat.update({
      where: { id: chatId },
      data: { agentId: agentId || null },
    })

    return new Response(JSON.stringify({ chat }), {
      status: 200,
    })
  } catch (err: unknown) {
    console.error("Error in update-chat-agent endpoint:", err)
    
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
