import type { Chat } from "@/app/types/database.types"
import { prisma } from "@/lib/prisma"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"

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
        systemPrompt: SYSTEM_PROMPT_DEFAULT,
      },
    })

    console.log(`✅ Chat created: ${chat.id}`)
    return chat
  } catch (error) {
    console.error("❌ Error creating chat:", error)
    throw error
  }
}
