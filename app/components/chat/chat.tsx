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
import { useMessages } from "@/lib/chat-store/messages/provider";
import type { PiperUIDataParts } from '@/lib/chat-store/messages/api';
import type { UIMessage, DataUIPart, UIMessagePart } from 'ai';
import {
  MESSAGE_MAX_LENGTH,
  SYSTEM_PROMPT_DEFAULT,
} from "@/lib/config"
import { Attachment } from "@/lib/file-handling"
import { API_ROUTE_CHAT } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react";
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

const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4";
const FALLBACK_MODEL_ID = "anthropic/claude-3-haiku-20240307";

export function Chat() {
  const { chatId } = useChatSession()
  const {
    createNewChat,
    getChatById,
    updateChatModel,
    isLoading: isChatsLoading,
  } = useChats()
  const currentChat = chatId ? getChatById(chatId) : null
  const { messages: initialMessages, cacheAndAddMessage } = useMessages()
  const { user } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    files,
    setFiles,
    handleFileUploads,
    createOptimisticAttachments,
    cleanupOptimisticAttachments,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()
  const [selectedModel, setSelectedModel] = useState(
    currentChat?.model || DEFAULT_MODEL_ID
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
    initialInput: draftValue,
    onFinish: async (streamedMessage) => {
      // store the assistant message in the cache
      // The 'streamedMessage.message' from onFinish is the UIMessage from the assistant
      const assistantMessage = streamedMessage.message;
      const messageWithCreatedAt: UIMessage<unknown, PiperUIDataParts> = {
        id: assistantMessage.id,
        role: assistantMessage.role,
        parts: [
          ...((assistantMessage.parts || []) as UIMessagePart<PiperUIDataParts>[]),
          { type: 'data-createdAtInfo', data: new Date() } as DataUIPart<PiperUIDataParts>
        ]
      };
      await cacheAndAddMessage(messageWithCreatedAt);
    },
  })

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages, setMessages]); // Only re-run if initialMessages or setMessages changes

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
        const modelsWithInitialStar = models.map(m => ({...m, starred: starredModelIds.includes(m.id) }))
        setAvailableModels(modelsWithInitialStar);

        if (modelsWithInitialStar.length > 0) {
          const currentModelExists = modelsWithInitialStar.find(model => model.id === selectedModel);
          if (!currentModelExists) {
            const defaultModel = modelsWithInitialStar.find(model => model.id === DEFAULT_MODEL_ID);
            const fallbackModel = modelsWithInitialStar.find(model => model.id === FALLBACK_MODEL_ID);
            const firstAvailableModel = modelsWithInitialStar[0];

            if (defaultModel) {
              setSelectedModel(DEFAULT_MODEL_ID);
            } else if (fallbackModel) {
              setSelectedModel(FALLBACK_MODEL_ID);
            } else if (firstAvailableModel) {
              setSelectedModel(firstAvailableModel.id);
            }
          }
        } else {
          if (selectedModel !== DEFAULT_MODEL_ID && selectedModel !== FALLBACK_MODEL_ID) {
             setSelectedModel(DEFAULT_MODEL_ID);
          }
        }
      } catch (error) {
        console.error("Error fetching available models:", error);
        setAvailableModels([]);
        const modelDefaultFullId = "anthropic/claude-3-sonnet-20240229"; 
        if (modelDefaultFullId) setSelectedModel(modelDefaultFullId);
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
      if (!currentModelExists) {
        const defaultModel = availableModels.find(model => model.id === DEFAULT_MODEL_ID);
        const fallbackModel = availableModels.find(model => model.id === FALLBACK_MODEL_ID);
        const firstAvailableModel = availableModels[0];

        if (defaultModel) {
          setSelectedModel(DEFAULT_MODEL_ID);
        } else if (fallbackModel) {
          setSelectedModel(FALLBACK_MODEL_ID);
        } else if (firstAvailableModel) {
          setSelectedModel(firstAvailableModel.id);
        }
      }
    } else if (hydrated) { 
      if (selectedModel !== DEFAULT_MODEL_ID && selectedModel !== FALLBACK_MODEL_ID) {
         setSelectedModel(DEFAULT_MODEL_ID);
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

    const optimisticId = `optimistic-${Date.now().toString()}`
    const optimisticAttachments =
      files.length > 0 ? createOptimisticAttachments(files) : []

    const textPart = { type: 'text' as const, text: input };
    const attachmentParts = optimisticAttachments.map((att: Attachment) => ({
      type: 'file' as const,
      name: att.name,
      mediaType: att.contentType, // Changed from contentType to mediaType
      url: att.url,
      // 'content' for FileUIPart is typically ArrayBuffer or string (e.g. base64), 
      // but optimisticAttachments.url is likely a blob URL or data URL already.
      // For optimistic UI, URL is often enough. Actual content processing happens server-side.
    }));

    const optimisticMessageParts = [textPart, ...attachmentParts];

    const optimisticMessage = {
      id: optimisticId,
      role: "user" as const,
      parts: optimisticMessageParts,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setInput("")

    const submittedFiles = [...files]
    setFiles([])

    const allowed = await checkLimitsAndNotify(uid)
    if (!allowed) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticAttachments)
      setIsSubmitting(false)
      return
    }

    const currentChatId = await ensureChatExists()

    if (!currentChatId) {
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticAttachments)
      setIsSubmitting(false)
      return
    }

    if (input.length > MESSAGE_MAX_LENGTH) {
      toast({
        title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
        status: "error",
      })
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticAttachments)
      setIsSubmitting(false)
      return
    }

    let attachments: Attachment[] | null = []
    if (submittedFiles.length > 0) {
      attachments = await handleFileUploads(currentChatId)
      if (attachments === null) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticAttachments)
        setIsSubmitting(false)
        return
      }
    }

    const options = {
      body: {
        chatId: currentChatId,
        userId: uid,
        model: selectedModel,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
      },
      experimental_attachments: attachments || undefined,
    }

    try {
      handleSubmit(undefined, options)
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticAttachments)
      cacheAndAddMessage(optimisticMessage)
      clearDraft()
      hasSentFirstMessageRef.current = true
    } catch (submitError) {
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticAttachments)
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
        parts: [{ type: "text" as const, text: suggestion }],
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
          systemPrompt: SYSTEM_PROMPT_DEFAULT,
        },
      }

      append(
        {
          role: "user" as const,
          parts: [{ type: "text" as const, text: suggestion }],
        },
        options
      )
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      setIsSubmitting(false)
    },
    [ensureChatExists, selectedModel, append, checkLimitsAndNotify, setMessages] 
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
              What&apos;s on your mind?
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
          onSuggestion={handleSuggestion}
          onValueChange={handleInputChange}
          onSend={submit}
          isSubmitting={isSubmitting}
          files={files}
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          hasSuggestions={!chatId && messages.length === 0}
          onSelectModel={handleModelChange}
          selectedModel={selectedModel}
          availableModels={modelsWithStarredStatus}
          onStarModel={handleStarModel}
          isUserAuthenticated={isAuthenticated}
          stop={stop}
          status={status}
        />
      </motion.div>

      <FeedbackWidget /> 
    </div>
  )
}
