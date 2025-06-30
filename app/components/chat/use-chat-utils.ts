'use client'

import { useChats } from "@/lib/chat-store/chats/provider"
import { appLogger } from "@/lib/logger"
import { toast } from "@/components/ui/toast"
import { checkRateLimits } from "@/lib/api"
import { REMAINING_QUERY_ALERT_THRESHOLD } from "@/lib/config"
import { useRef } from "react"

type UseChatUtilsProps = {
  chatId: string | null
  input: string
  selectedModel: string
}

export function useChatUtils({
  chatId,
  input,
  selectedModel,
}: UseChatUtilsProps) {
  const { createNewChat } = useChats()
  // Phase 1 Fix v2: Use refs for synchronous access to prevent React state race conditions
  // This eliminates the timing window where multiple calls could bypass the check
  const isCreatingRef = useRef(false)
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

    // Phase 1 Fix v2: Synchronous race condition prevention using refs
    // Check if creation is already in progress (synchronous check)
    if (isCreatingRef.current) {
      // If a creation promise exists, wait for it to complete
      if (creationAttemptRef.current) {
        try {
          const result = await creationAttemptRef.current
          return result
        } catch (err) {
          console.error("Waiting for chat creation failed:", err)
          return null
        }
      }
      // This case should ideally not be reached if the ref logic is sound.
      // It indicates that isCreatingRef was set to true, but the creation promise
      // was not set. This log helps detect any future issues with this logic.
      appLogger.warn(
        "ensureChatExists: Concurrent creation detected, but no promise was found. Aborting duplicate request."
      )
      return null
    }

    // Atomically set creation state and create promise to eliminate timing window
    isCreatingRef.current = true
    
    // Create the promise immediately to prevent timing window race condition
    const creationPromise = (async (): Promise<string | null> => {
      try {
        const idempotencyKey = crypto.randomUUID(); // Generate a unique key for the request
        const newChat = await createNewChat({
          idempotencyKey, // Pass the key to the API
          title: input.substring(0, 100), // Use first 100 chars as title
          model: selectedModel,
          messages: [{ role: "user", content: input }],
        })

        if (!newChat || !newChat.id) {
          throw new Error("Failed to create chat: No chat returned from API")
        }

        // IMPORTANT FIX:
        // The chat state is now updated via `refresh()` inside `createNewChat`.
        // We can now safely update the URL.
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
        isCreatingRef.current = false
        creationAttemptRef.current = null
      }
    })()

    // Store the creation attempt immediately (no timing window)
    creationAttemptRef.current = creationPromise

    return creationPromise
  }

  return {
    checkLimitsAndNotify,
    ensureChatExists,
    // Expose creation state for UI feedback (derived from ref)
    get isCreatingChat() {
      return isCreatingRef.current
    },
  }
}