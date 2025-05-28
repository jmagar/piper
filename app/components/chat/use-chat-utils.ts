import { toast } from "@/components/ui/toast"
import { checkRateLimits } from "@/lib/api"
import { REMAINING_QUERY_ALERT_THRESHOLD } from "@/lib/config"
import { Message } from "@ai-sdk/react"

// Define the expected shape of the object returned by createNewChat
interface NewChatResponse {
  id: string
  // Add other properties if known, otherwise keep it minimal
}

type UseChatUtilsProps = {
  chatId: string | null
  messages: Message[]
  input: string
  selectedModel: string
  createNewChat: (
    title?: string,
    model?: string
  ) => Promise<NewChatResponse | null>
}

export function useChatUtils({
  chatId,
  messages,
  input,
  selectedModel,
  createNewChat,
}: UseChatUtilsProps) {
  const checkLimitsAndNotify = async (uid: string): Promise<boolean> => {
    try {
      const rateData = await checkRateLimits(uid, true)

      if (rateData.remaining === REMAINING_QUERY_ALERT_THRESHOLD) {
        toast({
          title: `Only ${rateData.remaining} quer${
            rateData.remaining === 1 ? "y" : "ies"
          } remaining today.`,
          status: "info",
        })
      }

      if (rateData.remainingPro === REMAINING_QUERY_ALERT_THRESHOLD) {
        toast({
          title: `Only ${rateData.remainingPro} pro quer${
            rateData.remainingPro === 1 ? "y" : "ies"
          } remaining today.`,
          status: "info",
        })
      }

      return true
    } catch (err) {
      console.error("Rate limit check failed:", err)
      return false
    }
  }

  const ensureChatExists = async () => {
    if (messages.length === 0) {
      try {
        const newChat = await createNewChat(
          input,
          selectedModel
        )

        if (!newChat) return null
        window.history.pushState(null, "", `/c/${newChat.id}`)

        return newChat.id
      } catch (err: unknown) {
        let errorMessage = "Something went wrong."
        if (err instanceof Error) {
          try {
            const parsed = JSON.parse(err.message)
            errorMessage = parsed.error || err.message
          } catch {
            errorMessage = err.message
          }
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        toast({
          title: errorMessage,
          status: "error",
        })
        return null
      }
    }

    return chatId
  }

  return {
    checkLimitsAndNotify,
    ensureChatExists,
  }
}
