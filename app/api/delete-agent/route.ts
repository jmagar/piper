import { prisma } from "@/lib/prisma"

export async function DELETE(request: Request) {
  try {
    const { slug } = await request.json()

    if (!slug) {
      return new Response(JSON.stringify({ error: "Missing agent slug" }), {
        status: 400,
      })
    }

    // Check if the agent exists
    const agent = await prisma.agent.findUnique({
      where: { slug },
      select: { id: true, name: true }
    })

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
      })
    }

    // Delete the agent
    await prisma.agent.delete({
      where: { slug }
    })

    return new Response(
      JSON.stringify({ message: "Agent deleted successfully" }),
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error("Error in delete-agent endpoint:", err)
    
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
