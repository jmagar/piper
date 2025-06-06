"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { useChatSession } from "@/app/providers/chat-session-provider"
import { useUser } from "@/app/providers/user-provider"
import { toast } from "@/components/ui/toast"
import { useAgent } from "@/lib/agent-store/provider"
import { getOrCreateGuestUserId } from "@/lib/api"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import {
  MESSAGE_MAX_LENGTH,
  SYSTEM_PROMPT_DEFAULT,
} from "@/lib/config"

import { API_ROUTE_CHAT } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { redirect, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useChatHandlers } from "./use-chat-handlers"
import { useChatUtils } from "./use-chat-utils"
import { useFileUpload } from "./use-file-upload"

const FeedbackWidget = dynamic(
  () => import("./feedback-widget").then((mod) => mod.FeedbackWidget),
  { ssr: false }
)

const DialogAuth = dynamic(
  () => import("./dialog-auth").then((mod) => mod.DialogAuth),
  { ssr: false }
)

// Create a separate component that uses useSearchParams
function SearchParamsProvider({
  setInput,
}: {
  setInput: (input: string) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt) {
      setInput(prompt)
    }
  }, [searchParams, setInput])

  return null
}

// Dynamic model selection - no hardcoded defaults

export function Chat() {
  const { chatId } = useChatSession()
  const {
    createNewChat,
    getChatById,
    updateChatModel,
    isLoading: isChatsLoading,
    setActiveChatId,
  } = useChats()
  const currentChat = chatId ? getChatById(chatId) : null
  const { messages: initialMessages, cacheAndAddMessage } = useMessages()
  const { user } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    files,
    setFiles,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()
  const [selectedModel, setSelectedModel] = useState(
    currentChat?.model || ""
  );
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; description: string; context_length: number | null; providerId: string; starred?: boolean }[]>([]);
  const [starredModelIds, setStarredModelIds] = useState<string[]>([]);
  const { currentAgent } = useAgent()
  const systemPrompt =
    currentAgent?.system_prompt || user?.system_prompt || SYSTEM_PROMPT_DEFAULT

  const [hydrated, setHydrated] = useState(false)
  const hasSentFirstMessageRef = useRef(false)

  const isAuthenticated = true

  const { draftValue, clearDraft } = useChatDraft(chatId)

  const { messages, input, handleSubmit, status, error, reload, stop, setMessages, setInput, append } = useChat({
    api: API_ROUTE_CHAT,
    initialMessages,
    initialInput: draftValue,
    // Throttle streaming updates to improve performance during long responses
    experimental_throttle: 50,
    onFinish: async (message) => {
      // store the assistant message in the cache
      await cacheAndAddMessage(message)
    },
  })

  // Wrapper for createNewChat to match the signature expected by useChatUtils
  const createNewChatForUtils = useCallback(
    async (
      title?: string,
      model?: string
    ): Promise<{ id: string } | null> => {
      const newChat = await createNewChat(title, model) // Uses createNewChat from useChats
      if (newChat && newChat.id) {
        return { id: newChat.id }
      }
      return null
    },
    [createNewChat] // Dependency array for useCallback
  )

  const { checkLimitsAndNotify, ensureChatExists } = useChatUtils({
    chatId,
    messages,
    input,
    selectedModel,
    createNewChat: createNewChatForUtils, // Pass the wrapper function
  })

  useEffect(() => {
    setActiveChatId(chatId ?? null);
  }, [chatId, setActiveChatId]);

  const { handleInputChange, handleModelChange, handleDelete, handleEdit } =
    useChatHandlers({
      messages,
      setMessages,
      setInput,
      setSelectedModel,
      selectedModel,
      chatId,
      updateChatModel,
    })

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/openrouter-models');
        if (!response.ok) {
          console.error('Failed to fetch models:', response.statusText);
          setAvailableModels([]); 
          return;
        }
        const models: { id: string; name: string; description: string; context_length: number | null; providerId: string; }[] = await response.json();
        
        // Model analysis logging (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log(`📡 Loaded ${models.length} models from OpenRouter API`);
        }
        
        const modelsWithInitialStar = models.map(m => ({...m, starred: starredModelIds.includes(m.id) }))
        setAvailableModels(modelsWithInitialStar);

        if (modelsWithInitialStar.length > 0) {
          const currentModelExists = modelsWithInitialStar.find(model => model.id === selectedModel);
          if (!currentModelExists || !selectedModel) {
            // Prefer Claude Sonnet models, then any Claude model, then first available
            const preferredModel = modelsWithInitialStar.find(model => 
              model.id.includes('claude') && model.id.includes('sonnet')
            ) || modelsWithInitialStar.find(model => 
              model.id.includes('claude')
            ) || modelsWithInitialStar[0];

            if (preferredModel) {
              setSelectedModel(preferredModel.id);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching available models:", error);
        setAvailableModels([]);
        // No fallback - wait for models to load
      }
    };
    fetchModels();
  }, [chatId, updateChatModel, hydrated, selectedModel, starredModelIds]);

  useEffect(() => {
    const storedStarredIds = localStorage.getItem('starredModelIds');
    if (storedStarredIds) {
      setStarredModelIds(JSON.parse(storedStarredIds));
    }
  }, []);

  useEffect(() => {
    if (hydrated) { 
      localStorage.setItem('starredModelIds', JSON.stringify(starredModelIds));
    }
  }, [starredModelIds, hydrated]);

  useEffect(() => {
    setAvailableModels(prevModels => 
      prevModels.map(model => ({...model, starred: starredModelIds.includes(model.id)}))
    );
  }, [starredModelIds]);

  useEffect(() => {
    if (availableModels.length > 0 && hydrated) { 
      const currentModelExists = availableModels.find(model => model.id === selectedModel);
      if (!currentModelExists || !selectedModel) {
        // Prefer Claude Sonnet models, then any Claude model, then first available
        const preferredModel = availableModels.find(model => 
          model.id.includes('claude') && model.id.includes('sonnet')
        ) || availableModels.find(model => 
          model.id.includes('claude')
        ) || availableModels[0];

        if (preferredModel) {
          setSelectedModel(preferredModel.id);
        }
      }
    }
  }, [availableModels, selectedModel, hydrated]);

  useEffect(() => {
    if (currentChat && chatId && selectedModel && currentChat.model !== selectedModel) {
      if (availableModels.find(m => m.id === selectedModel)) {
        updateChatModel(chatId, selectedModel);
        currentChat.model = selectedModel;
      }
    }
  }, [selectedModel, currentChat, chatId, updateChatModel, availableModels]);

  // when chatId is null, set messages to an empty array
  useEffect(() => {
    if (chatId === null) {
      setMessages([])
    }
  }, [chatId, setMessages])

  useEffect(() => {
    setHydrated(true)
  }, [])

  // handle errors
  useEffect(() => {
    if (error) {
      let errorMsg = "Something went wrong."
      try {
        const parsed = JSON.parse(error.message)
        errorMsg = parsed.error || errorMsg
      } catch {
        errorMsg = error.message || errorMsg
      }
      toast({
        title: errorMsg,
        status: "error",
      })
    }
  }, [error])

  const submit = async () => {
    setIsSubmitting(true)

    const uid = await getOrCreateGuestUserId()
    if (!uid) return

    const allowed = await checkLimitsAndNotify(uid)
    if (!allowed) {
      setIsSubmitting(false)
      return
    }

    const currentChatId = await ensureChatExists()
    if (!currentChatId) {
      setIsSubmitting(false)
      return
    }

    if (input.length > MESSAGE_MAX_LENGTH) {
      toast({
        title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
        status: "error",
      })
      setIsSubmitting(false)
      return
    }

    // ✅ AI SDK PATTERN: Convert files to data URLs for AI model access
    const attachments = files.length > 0 ? await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        const dataUrl = `data:${file.type};base64,${base64}`
        
        return {
          name: file.name,
          contentType: file.type,
          url: dataUrl,
        }
      })
    ) : undefined

    const options = {
      body: {
        chatId: currentChatId,
        userId: uid,
        model: selectedModel,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
        ...(currentAgent && { agentId: currentAgent.id }),
      },
      experimental_attachments: attachments,
    }

    try {
      await handleSubmit(undefined, options)
      setFiles([])  // Clear files after submission
      clearDraft()
      hasSentFirstMessageRef.current = true
    } catch (submitError) {
      toast({ title: "Failed to send message", status: "error" })
      console.error("Error submitting message:", submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuggestion = useCallback(
    async (suggestion: string) => {
      setIsSubmitting(true)
      const optimisticId = `optimistic-${Date.now().toString()}`
      const optimisticMessage = {
        id: optimisticId,
        content: suggestion,
        role: "user" as const,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, optimisticMessage])

      const uid = await getOrCreateGuestUserId()

      if (!uid) {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        setIsSubmitting(false)
        return
      }

      const allowed = await checkLimitsAndNotify(uid)
      if (!allowed) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        setIsSubmitting(false)
        return
      }

      const currentChatId = await ensureChatExists()

      if (!currentChatId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        setIsSubmitting(false)
        return
      }

      const options = {
        body: {
          chatId: currentChatId,
          userId: uid,
          model: selectedModel,
          systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
        },
      }

      append(
        {
          role: "user",
          content: suggestion,
        },
        options
      )
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      setIsSubmitting(false)
    },
    [ensureChatExists, selectedModel, append, checkLimitsAndNotify, setMessages, systemPrompt] 
  )

  const handleReload = async () => {
    const uid = await getOrCreateGuestUserId()
    if (!uid) {
      return
    }

    const options = {
      body: {
        chatId,
        userId: uid,
        model: selectedModel,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
      },
    }

    reload(options)
  }

  const handleStarModel = (modelId: string) => {
    setStarredModelIds(prevStarredIds => {
      const newStarredIds = prevStarredIds.includes(modelId)
        ? prevStarredIds.filter(id => id !== modelId)
        : [...prevStarredIds, modelId];
      return newStarredIds;
    });
  };

  // not user chatId and no messages
  if (hydrated && chatId && !isChatsLoading && !currentChat) {
    return redirect("/")
  }

  const modelsWithStarredStatus = availableModels.map(model => (
    { ...model, starred: starredModelIds.includes(model.id) }
  ));

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center justify-end md:justify-center"
      )}
    >
      {/* <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} /> */}
      <DialogAuth />

      {/* Add Suspense boundary for SearchParamsProvider */}
      <Suspense>
        <SearchParamsProvider setInput={setInput} />
      </Suspense>

      <AnimatePresence initial={false} mode="popLayout">
        {!chatId && messages.length === 0 ? (
          <motion.div
            key="onboarding"
            className="absolute bottom-[60%] mx-auto max-w-[50rem] md:relative md:bottom-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            layout="position"
            layoutId="onboarding"
            transition={{
              layout: {
                duration: 0,
              },
            }}
          >
            <h1 className="mb-6 text-3xl font-medium tracking-tight">
              How can I help?
            </h1>
          </motion.div>
        ) : (
          <Conversation
            key="conversation"
            messages={messages}
            status={status}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReload={handleReload}
          />
        )}
      </AnimatePresence>
      <motion.div
        className={cn(
          "relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl"
        )}
        layout="position"
        layoutId="chat-input-container"
        transition={{
          layout: {
            duration: messages.length === 1 ? 0.3 : 0,
          },
        }}
      >
        <ChatInput
          value={input}
          onSuggestionAction={handleSuggestion}
          onValueChangeAction={handleInputChange}
          onSendAction={submit}
          isSubmitting={isSubmitting}
          files={files}
          onFileUploadAction={handleFileUpload}
          onFileRemoveAction={handleFileRemove}
          hasSuggestions={!chatId && messages.length === 0}
          onSelectModelAction={handleModelChange}
          selectedModel={selectedModel}
          availableModels={modelsWithStarredStatus}
          onStarModelAction={handleStarModel}
          isUserAuthenticated={isAuthenticated}
          stopAction={stop}
          status={status}
        />
      </motion.div>

      <FeedbackWidget /> 
    </div>
  )
}

