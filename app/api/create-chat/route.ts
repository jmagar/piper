import { createChatInDb } from "./api"

export async function POST(request: Request) {
  try {
    const { title, model } = await request.json()

    if (!model) {
      return new Response(JSON.stringify({ error: "Missing model" }), {
        status: 400,
      })
    }

    const chat = await createChatInDb({
      title,
      model,
    })

    return new Response(JSON.stringify({ chat }), { status: 200 })
  } catch (err: unknown) {
    console.error("Error in create-chat endpoint:", err)

    const errorMessage = err instanceof Error ? err.message : "Internal server error"

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
