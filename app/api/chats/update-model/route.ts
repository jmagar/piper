import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { chatId, model } = await request.json()

    if (!chatId || !model) {
      return new Response(
        JSON.stringify({ error: "Missing chatId or model" }),
        { status: 400 }
      )
    }

    // Update chat model in local database
    await prisma.chat.update({
      where: { id: chatId },
      data: { model },
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    })
  } catch (err: unknown) {
    console.error("Error in update-chat-model endpoint:", err)
    
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
