import type { Chat } from "@/app/types/database.types"
import { prisma } from "@/lib/prisma"

type CreateChatInput = {
  title?: string
  model: string
}

export async function createChatInDb({
  title,
  model,
}: CreateChatInput): Promise<Chat> {
  try {
    const chat = await prisma.chat.create({
      data: {
        title: title || "New Chat",
        model,
      },
    })

    console.log(`✅ Chat created: ${chat.id}`)
    return chat
  } catch (error) {
    console.error("❌ Error creating chat:", error)
    throw error
  }
}
