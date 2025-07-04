import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type DatabasePrompt = {
  id: string
  name: string
  description: string
  slug: string
  system_prompt: string
}

export async function GET() {
  try {
    // Fetch all rules from database for @mention dropdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promptsFromDb = await (prisma as any).prompt.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        system_prompt: true,
      },
      orderBy: { name: 'asc' },
    }) as DatabasePrompt[]

    // Transform prompts for @mention dropdown usage
    const availablePrompts = promptsFromDb.map((prompt) => ({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      slug: prompt.slug,
      systemPrompt: prompt.system_prompt
    }))

    return NextResponse.json({ prompts: availablePrompts })
  } catch (error) {
    console.error("Failed to fetch prompts for @mention:", error)
    return NextResponse.json({ prompts: [] })
  }
} 