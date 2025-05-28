import { getMessageUsage } from "./api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  // const isAuthenticated = searchParams.get("isAuthenticated") === "true" // Not used in admin-only mode

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
    })
  }

  try {
    const usage = await getMessageUsage()

    if (!usage) {
      return new Response(
        JSON.stringify({ error: "Usage tracking not available." }),
        { status: 200 }
      )
    }

    return new Response(JSON.stringify(usage), { status: 200 })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 })
  }
}
