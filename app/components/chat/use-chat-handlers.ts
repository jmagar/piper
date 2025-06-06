import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { toast } from "@/components/ui/toast"
import { Message } from "@ai-sdk/react"
import { useCallback } from "react"

type UseChatHandlersProps = {
  messages: Message[]
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void
  setInput: (input: string) => void
  setSelectedModel: (model: string) => void
  selectedModel: string
  chatId: string | null
  updateChatModel: (chatId: string, model: string) => Promise<void>
}

export function useChatHandlers({
  messages,
  setMessages,
  setInput,
  setSelectedModel,
  selectedModel,
  chatId,
  updateChatModel,
}: UseChatHandlersProps) {
  const { setDraftValue } = useChatDraft(chatId)

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
      setDraftValue(value)
    },
    [setInput, setDraftValue]
  )

  const handleModelChange = useCallback(
    async (model: string) => {
      // If there's no active chat, just set the selected model locally.
      // The user?.id check is redundant as admin is always 'authenticated'.
      if (!chatId) { 
        setSelectedModel(model)
        return
      }

      const oldModel = selectedModel

      setSelectedModel(model)

      try {
        await updateChatModel(chatId!, model)
      } catch (err) {
        console.error("Failed to update chat model:", err)
        setSelectedModel(oldModel)
        toast({
          title: "Failed to update chat model",
          status: "error",
        })
      }
    },
    [chatId, selectedModel, setSelectedModel, updateChatModel]
  )

  const handleDelete = useCallback(
    (id: string) => {
      setMessages(messages.filter((message) => message.id !== id))
    },
    [messages, setMessages]
  )

  const handleEdit = useCallback(
    (id: string, newText: string) => {
      setMessages(
        messages.map((message) =>
          message.id === id ? { ...message, content: newText } : message
        )
      )
    },
    [messages, setMessages]
  )

  return {
    handleInputChange,
    handleModelChange,
    handleDelete,
    handleEdit,
  }
}
