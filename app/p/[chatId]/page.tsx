import { prisma } from "@/lib/prisma"
import { APP_NAME } from "@/lib/config"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicConversation } from "./public-conversation";
import { Prisma } from "@prisma/client"; // Import Prisma for JsonValue type
import type { UIMessage, UIMessagePart, DataUIPart } from 'ai'; // Import UIMessage and part types
import type { PiperUIDataParts } from '@/lib/chat-store/messages/api'; // Import our custom data part definition

// Helper function to extract first text content from parts
function getFirstTextFromParts(parts: Prisma.JsonValue): string | null {
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string'
      ) {
        return part.text;
      }
    }
  } else if (typeof parts === 'string') {
    // Fallback if parts is just a plain string (legacy data?)
    // Or if the entire 'parts' field was intended as a single text string.
    try {
      // Attempt to parse if it's a JSON string containing an array/object
      const parsed = JSON.parse(parts);
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (typeof p === 'object' && p !== null && p.type === 'text' && typeof p.text === 'string') {
            return p.text;
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null && parsed.type === 'text' && typeof parsed.text === 'string') {
        return parsed.text;
      }
    } catch {
      // Not a JSON string, treat as plain text
      return parts;
    }
  }
  return null;
}
import Link from "next/link"

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
    description: (getFirstTextFromParts(chat.messages[0]?.parts ?? null))?.slice(0, 155) || "A shared conversation",
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
  const messages = chat.messages.map((msg) => {
    // Extract existing parts from msg.parts (which is Prisma.JsonValue)
    // and ensure they are in the UIMessagePart format.
    // This is a simplified example; robust parsing might be needed if db parts are complex.
    let existingParts: UIMessagePart<PiperUIDataParts>[] = [];
    if (Array.isArray(msg.parts)) {
      existingParts = msg.parts.map(part => part as UIMessagePart<PiperUIDataParts>); // Basic cast
    } else if (typeof msg.parts === 'string') {
      // Attempt to get text if parts was a string, or handle other legacy formats
      const textContent = getFirstTextFromParts(msg.parts);
      if (textContent) {
        existingParts.push({ type: 'text', text: textContent });
      }
    }
    // If getFirstTextFromParts was the primary way to get content, ensure it's included.
    // The logic below prioritizes text from getFirstTextFromParts if no other text parts exist.
    const primaryTextContent = getFirstTextFromParts(msg.parts ?? null) || "";
    const hasTextPart = existingParts.some(p => p.type === 'text');

    const finalParts: UIMessagePart<PiperUIDataParts>[] = [
      ...existingParts,
      // Add primary text content if no text part was found in existingParts
      ...(!hasTextPart && primaryTextContent ? [{ type: 'text' as const, text: primaryTextContent }] : []),
      { type: 'data-createdAtInfo', data: msg.createdAt } as DataUIPart<PiperUIDataParts>
    ];

    return {
      id: msg.id,
      role: msg.role as UIMessage['role'],
      parts: finalParts,
      // metadata: undefined, // Explicitly undefined if not used
    } as UIMessage<unknown, PiperUIDataParts>; // Assert the final mapped message type
  })

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
