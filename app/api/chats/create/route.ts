import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { appLogger } from "@/lib/logger"

type MessageInput = {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, title, model, systemPrompt, agentId, idempotencyKey } =
      body

    // Idempotency Check
    if (idempotencyKey) {
      const existingChat = await prisma.chat.findUnique({
        where: { idempotencyKey },
        include: { messages: true },
      })
      if (existingChat) {
        appLogger.info("Idempotent chat request successful", {
          chatId: existingChat.id,
          idempotencyKey,
        })
        return NextResponse.json({ chat: existingChat })
      }
    }

    // Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Initial message is required" },
        { status: 400 }
      )
    }

    // Validate message structure
    const invalidMessage = messages.find(
      (msg: MessageInput) =>
        !msg ||
        typeof msg !== "object" ||
        !msg.role ||
        !msg.content ||
        !["user", "assistant"].includes(msg.role) ||
        typeof msg.content !== "string"
    )
    if (invalidMessage) {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      )
    }

    const newChat = await prisma.chat.create({
      data: {
        title: title || messages[0].content.substring(0, 100),
        model,
        systemPrompt,
        agentId,
        idempotencyKey,
        messages: {
          create: messages.map((msg: MessageInput) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      },
      include: {
        messages: true,
      },
    })

    appLogger.info("Chat created successfully", {
      chatId: newChat.id,
      model,
    })

    return NextResponse.json({ chat: newChat })
  } catch (error) {
    appLogger.error("Error creating chat", {
      error,
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 