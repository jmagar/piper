import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { appLogger } from "@/lib/logger"

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

    const newChat = await prisma.chat.create({
      data: {
        idempotencyKey: idempotencyKey,
        title: title || messages[0].content.substring(0, 100),
        model: model,
        systemPrompt: systemPrompt,
        agentId: agentId,
        messages: {
          create: messages.map(
            (msg: { role: "user" | "assistant"; content: string }) => ({
              role: msg.role,
              content: msg.content,
            })
          ),
        },
      },
      include: {
        messages: true, // Include the newly created messages in the response
      },
    })

    appLogger.info("Chat created via dedicated endpoint", {
      chatId: newChat.id,
      messageCount: newChat.messages.length,
    })

    return NextResponse.json({ chat: newChat })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred"
    appLogger.error("Failed to create chat via dedicated endpoint", {
      error: errorMessage,
    })
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
} 