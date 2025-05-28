import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"
import slugify from "slugify"

function generateAgentSlug(title: string) {
  const base = slugify(title, { lower: true, strict: true, trim: true })
  const id = nanoid(6)
  return `${base}-${id}`
}

export async function POST(request: Request) {
  try {
    const {
      name,
      description,
      systemPrompt,
      mcp_config,
      example_inputs,
      avatar_url,
      tools = [],
    } = await request.json()

    if (!name || !description || !systemPrompt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
        }
      )
    }

    // Create agent in local database with hardcoded admin user
    const agent = await prisma.agent.create({
      data: {
        slug: generateAgentSlug(name),
        name,
        description,
        avatar_url,
        mcp_config,
        example_inputs,
        tools,
        system_prompt: systemPrompt,
        creator_id: "admin", // Hardcoded admin user in single-user mode
      },
    })

    return new Response(JSON.stringify({ agent }), { status: 201 })
  } catch (err: unknown) {
    console.error("Error in create-agent endpoint:", err)

    const errorMessage = err instanceof Error ? err.message : "Internal server error"

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
