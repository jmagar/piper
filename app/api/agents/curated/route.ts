import { prisma } from "@/lib/prisma"
import { CURATED_AGENTS_SLUGS } from "@/lib/config"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        slug: {
          in: CURATED_AGENTS_SLUGS,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(agents)
  } catch (error) {
    console.error("Error fetching curated agents:", error)
    return NextResponse.json(
      { error: "Failed to fetch curated agents" },
      { status: 500 }
    )
  }
}