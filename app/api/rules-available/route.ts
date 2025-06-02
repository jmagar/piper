import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type DatabaseRule = {
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
    const rules = await (prisma as any).rule.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        system_prompt: true,
      },
      orderBy: { name: 'asc' },
    }) as DatabaseRule[]

    // Transform rules for @mention dropdown usage
    const availableRules = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      slug: rule.slug,
      systemPrompt: rule.system_prompt
    }))

    return NextResponse.json({ rules: availableRules })
  } catch (error) {
    console.error("Failed to fetch rules for @mention:", error)
    return NextResponse.json({ rules: [] })
  }
} 