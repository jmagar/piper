import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Assuming the admin user's ID is consistently "admin" across the system
// and chats are associated with this admin user implicitly or via a user_id field if it existed.
// Since Chat model does not have a user_id, we fetch all chats for admin-only app.
// If chats were to be filtered by a user, the Chat model would need a user identifier.
// For now, returning all chats as it's an admin-only app.
// If specific filtering is needed (e.g. based on an agent or other criteria accessible to admin),
// that logic would go here.

export async function GET() {
  try {
    // In an admin-only app, all chats are accessible to the admin.
    // If there was a user_id on Chat model linked to an admin user,
    // you would filter by it: where: { userId: "admin" }
    const chats = await prisma.chat.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        messages: { // Include messages for each chat
          orderBy: {
            createdAt: "asc",
          },
        },
        // attachments: true, // Optionally include attachments
        // agent: true,       // Optionally include agent details
      },
    })
    return NextResponse.json(chats)
  } catch (error) {
    console.error("Error fetching user chats:", error)
    // Consider using a structured logger here if available, e.g., from "@/lib/logger"
    return NextResponse.json(
      { error: "Failed to fetch user chats" },
      { status: 500 }
    )
  }
}