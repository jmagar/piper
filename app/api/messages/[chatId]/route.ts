import { NextRequest, NextResponse } from "next/server"
import {
  getMessagesFromDb,
  addMessage,
} from "@/lib/chat-store/messages/api"

// GET /api/messages/[chatId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 })
    }

    // getMessagesFromDb is already marked server-only via its own file
    const messages = await getMessagesFromDb(chatId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

// POST /api/messages/[chatId]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params
    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 })
    }

    const newMessage = await request.json()
    if (!newMessage || !newMessage.content || !newMessage.role) {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 })
    }
    
    await addMessage(chatId, newMessage)

    return NextResponse.json({ message: "Message added" }, { status: 201 })
  } catch (error) {
    console.error("Error adding message:", error)
    return NextResponse.json(
      { error: "Failed to add message" },
      { status: 500 }
    )
  }
}
