import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
// import { getToken } from "next-auth/jwt" // Not needed for admin-only

export async function GET() { // req parameter removed as it's unused
  // In admin-only mode, there's no session token to get a userId from.
  // We assume the "user" is always the admin.
  // The Agent schema's creator_id defaults to "admin".
  const adminUserId = "admin" 

  try {
    const agents = await prisma.agent.findMany({
      where: {
        creator_id: adminUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(agents)
  } catch (error) {
    console.error(`Error fetching agents for user ${adminUserId}:`, error)
    return NextResponse.json(
      { error: "Failed to fetch user agents" },
      { status: 500 }
    )
  }
}