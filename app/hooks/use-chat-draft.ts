import { useEffect, useState } from 'react'

/**
 * Hook to manage persistent chat drafts using localStorage
 * @param chatId - The current chat ID (null for new chat)
 * @returns Object containing draft value and setter
 */
export function useChatDraft(chatId: string | null) {
  // Key for storing drafts in localStorage
  const storageKey = chatId ? `chat-draft-${chatId}` : 'chat-draft-new'
  
  // Initialize state to an empty string. localStorage will be read in useEffect.
  const [draftValue, setDraftValue] = useState<string>('')

  // Read from localStorage on component mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedDraft = localStorage.getItem(storageKey) || ''
      setDraftValue(storedDraft)
    }
  }, [storageKey]) // Rerun if storageKey changes (e.g., chatId changes)

  // Update localStorage when draft changes
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure window is defined before accessing localStorage
      if (draftValue) {
        localStorage.setItem(storageKey, draftValue)
      } else {
        localStorage.removeItem(storageKey)
      }
    }
  }, [draftValue, storageKey])

  // Clear draft for the current chat
  const clearDraft = () => {
    setDraftValue('')
    if (typeof window !== 'undefined') { // Ensure window is defined before accessing localStorage
      localStorage.removeItem(storageKey)
    }
  }

  return {
    draftValue,
    setDraftValue,
    clearDraft
  }
} 