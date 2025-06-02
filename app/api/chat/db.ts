import { prisma } from "@/lib/prisma"

type ContentPart = {
  type: string
  text?: string
  toolCallId?: string
  toolName?: string
  args?: unknown
  result?: unknown
  toolInvocation?: {
    state: string
    step: number
    toolCallId: string
    toolName: string
    args?: unknown
    result?: unknown
  }
  reasoning?: string
  details?: unknown[]
}

type Message = {
  role: "user" | "assistant" | "system" | "data" | "tool" | "tool-call"
  content: string | null | ContentPart[]
  reasoning?: string
}

const DEFAULT_STEP = 0

export async function saveFinalAssistantMessage(
  chatId: string,
  messages: Message[]
) {
  const parts: ContentPart[] = []
  const toolMap = new Map<string, ContentPart>()
  const textParts: string[] = []

  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text") {
          textParts.push(part.text || "")
          parts.push(part)
        } else if (part.type === "tool-invocation" && part.toolInvocation) {
          const { toolCallId, state } = part.toolInvocation
          if (!toolCallId) continue

          const existing = toolMap.get(toolCallId)
          if (state === "result" || !existing) {
            toolMap.set(toolCallId, {
              ...part,
              toolInvocation: {
                ...part.toolInvocation,
                args: part.toolInvocation?.args || {},
              },
            })
          }
        } else if (part.type === "reasoning") {
          parts.push({
            type: "reasoning",
            reasoning: part.text || "",
            details: [
              {
                type: "text",
                text: part.text || "",
              },
            ],
          })
        } else if (part.type === "step-start") {
          parts.push(part)
        }
      }
    } else if (msg.role === "tool" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "tool-result") {
          const toolCallId = part.toolCallId || ""
          toolMap.set(toolCallId, {
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              step: DEFAULT_STEP,
              toolCallId,
              toolName: part.toolName || "",
              result: part.result,
            },
          })
        }
      }
    }
  }

  // Merge tool parts at the end
  parts.push(...Array.from(toolMap.values()))

  const finalPlainText = textParts.join("\n\n")

  try {
    await prisma.message.create({
      data: {
        chatId: chatId,
        role: "assistant",
        content: finalPlainText || "",
        parts: parts.length > 0 ? JSON.parse(JSON.stringify(parts)) : undefined, // Convert to JSON and use undefined
      }
    })
    
    console.log("Assistant message saved successfully with parts:", parts.length)
  } catch (error) {
    console.error("Error saving final assistant message:", error)
    throw new Error(`Failed to save assistant message: ${error}`)
  }
}
