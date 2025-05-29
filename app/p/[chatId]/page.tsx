import { prisma } from "@/lib/prisma"
import { APP_NAME } from "@/lib/config"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicConversation } from "./public-conversation"
import Link from "next/link"
import type { Message } from "@/app/types/database.types"

export const dynamic = "force-dynamic"

async function getChatData(chatId: string) {
  try {
    const chat = await prisma.chat.findUnique({
      where: { 
        id: chatId,
        public: true // Only show public chats
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc"
          }
        },
        agent: true
      }
    })

    return chat
  } catch (error) {
    console.error("Error fetching public chat:", error)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chatId: string }>
}): Promise<Metadata> {
  const { chatId } = await params
  const chat = await getChatData(chatId)

  if (!chat) {
    return {
      title: "Chat not found",
    }
  }

  return {
    title: `${chat.title || "Shared Chat"} | ${APP_NAME}`,
    description: chat.messages[0]?.content?.slice(0, 155) || "A shared conversation",
  }
}

export default async function PublicChat({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params
  const chat = await getChatData(chatId)

  if (!chat) {
    notFound()
  }

  // Convert messages to the format expected by the Conversation component
  const messages = chat.messages.map((msg: Message) => ({
    id: msg.id,
    content: msg.content,
    role: msg.role as "user" | "assistant",
    createdAt: msg.createdAt,
  }))

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {chat.title || "Shared Conversation"}
        </h1>
        <p className="text-muted-foreground">
          This is a public conversation shared from {APP_NAME}
          {chat.agent && ` using the ${chat.agent.name} agent`}
        </p>
      </div>
      
      <div className="border rounded-lg p-4 bg-background">
        <PublicConversation messages={messages} />
      </div>
      
      <div className="mt-6 text-center">
        <Link 
          href="/" 
          className="text-primary hover:underline"
        >
          Create your own conversation with {APP_NAME}
        </Link>
      </div>
    </div>
  )
}
