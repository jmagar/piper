import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { chatId, isPublic } = await req.json()

    if (!chatId || typeof isPublic !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid parameters" },
        { status: 400 }
      )
    }

    // Update the chat's public status
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: { public: isPublic },
    })

    return NextResponse.json({ success: true, chat: updatedChat })
  } catch (error) {
    console.error("Error updating chat public status:", error)
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    )
  }
} 