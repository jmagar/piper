import { toast } from "@/components/ui/toast"
import { checkRateLimits } from "@/lib/api"
import { REMAINING_QUERY_ALERT_THRESHOLD } from "@/lib/config"
import { type CreateNewChatArgs } from "@/lib/chat-store/chats/api"
import { type Chat } from "@/lib/chat-store/types"
import { useState, useRef } from "react"

type UseChatUtilsProps = {
  chatId: string | null
  input: string
  selectedModel: string
  createNewChat: (args: CreateNewChatArgs) => Promise<Chat | null>
}

export function useChatUtils({
  chatId,
  input,
  selectedModel,
  createNewChat,
}: UseChatUtilsProps) {
  // Phase 1 Fix: Track chat creation state to prevent race conditions
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const creationAttemptRef = useRef<Promise<string | null> | null>(null)

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

  const ensureChatExists = async (): Promise<string | null> => {
    // If chat already exists, return it immediately
    if (chatId) {
      return chatId
    }

    // Phase 1 Fix: Prevent concurrent chat creation attempts
    if (isCreatingChat) {
      // If a creation is already in progress, wait for it to complete
      if (creationAttemptRef.current) {
        try {
          const result = await creationAttemptRef.current
          return result
        } catch (err) {
          console.error("Waiting for chat creation failed:", err)
          return null
        }
      }
      return null
    }

    // Start the chat creation process
    setIsCreatingChat(true)

    // Create a promise for this creation attempt
    const creationPromise = (async (): Promise<string | null> => {
      try {
        const newChat = await createNewChat({
          title: input.substring(0, 100), // Use first 100 chars as title
          model: selectedModel,
          messages: [{ role: "user", content: input }],
        })

        if (!newChat) {
          throw new Error("Failed to create chat: No chat returned from API")
        }

        // Update browser URL without triggering navigation
        window.history.pushState(null, "", `/c/${newChat.id}`)

        return newChat.id
      } catch (err: unknown) {
        let errorMessage = "Failed to create conversation."
        
        if (err instanceof Error) {
          try {
            const parsed = JSON.parse(err.message)
            errorMessage = parsed.error || err.message
          } catch {
            errorMessage = err.message
          }
        } else if (typeof err === 'string') {
          errorMessage = err
        }

        // Enhanced error feedback for better user experience
        toast({
          title: "Conversation Creation Failed",
          description: errorMessage,
          status: "error",
        })
        
        console.error("Error creating new chat:", err)
        return null
      } finally {
        // Always reset the creation state and clear the attempt reference
        setIsCreatingChat(false)
        creationAttemptRef.current = null
      }
    })()

    // Store the creation attempt so other calls can wait for it
    creationAttemptRef.current = creationPromise

    return creationPromise
  }

  return {
    checkLimitsAndNotify,
    ensureChatExists,
    isCreatingChat, // Expose for UI feedback
  }
}
