"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { useChatSession } from "@/app/providers/chat-session-provider"
import { useUser } from "@/app/providers/user-provider"
import { ModelSelector } from "@/components/common/model-selector/base"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CodeBlock, CodeBlockCode } from "@/components/prompt-kit/code-block"

import { useAgent } from "@/lib/agent-store/provider"
import { getOrCreateGuestUserId } from "@/lib/api"
import { useChats } from "@/lib/chat-store/chats/provider"
import { type Agent } from "@/app/types/agent"
import { type Prompt } from "@/app/components/chat-input/use-agent-command"
import { type Prompt as ApiPrompt } from "@/app/types/prompt"
import type { FetchedToolInfo } from "@/lib/mcp/enhanced/types";
import { getAllTools } from "@/lib/tool-utils";
import { useMessages } from "@/lib/chat-store/messages/provider"
import type { Session } from "next-auth"
import {
  MESSAGE_MAX_LENGTH,
  SYSTEM_PROMPT_DEFAULT,
} from "@/lib/config"

import { API_ROUTE_CHAT } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react";
import { toast } from "@/components/ui/toast";
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { redirect, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useChatHandlers } from "./use-chat-handlers"
import { useChatUtils } from "./use-chat-utils"
import { ChevronUp, ChevronLeft, ChevronRight, Wrench } from "lucide-react"

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
  const session: Session = {
    user: {
      id: user.id,
      name: user.display_name,
      image: user.profile_image,
    },
    expires: new Date(Date.now() + 86400 * 1000).toISOString(), // 24 hours from now
  }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [selectedModel, setSelectedModel] = useState(
    currentChat?.model || ""
  );
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; description: string; context_length: number | null; providerId: string; starred?: boolean }[]>([]);
  const [starredModelIds, setStarredModelIds] = useState<string[]>([]);
  const { currentAgent, curatedAgents, userAgents } = useAgent()
  const availableAgents = [...(curatedAgents || []), ...(userAgents || [])]
  const [fetchedTools, setFetchedTools] = useState<FetchedToolInfo[]>([]);
  const availableTools = fetchedTools;
  const [mcpServers, setMcpServers] = useState<{ name: string; status: string; toolCount: number; transportType: string }[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [randomMarkdownContent, setRandomMarkdownContent] = useState<string>("");
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const [isInputSectionCollapsed, setIsInputSectionCollapsed] = useState(false)
  const systemPrompt =
    currentAgent?.system_prompt || user?.system_prompt || SYSTEM_PROMPT_DEFAULT

  const [hydrated, setHydrated] = useState(false)
  const hasSentFirstMessageRef = useRef(false)

  const { draftValue, clearDraft } = useChatDraft(chatId)

  const { messages, input, handleSubmit, status, error, reload, stop, setMessages, setInput } = useChat({
    api: API_ROUTE_CHAT,
    initialMessages,
    initialInput: draftValue,
    // Throttle streaming updates to improve performance during long responses
    experimental_throttle: 50,
    onFinish: async (message) => {
      // store the assistant message in the cache
      await cacheAndAddMessage(message)
    },
  });

  // Display chat errors using toast notifications
  useEffect(() => {
    if (error) {
      toast({ title: error.message, status: 'error' });
      // Consider if the error object needs to be 'cleared' from useChat's state
      // or if it automatically clears. For now, just displaying.
    }
  }, [error]);

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

  const { handleInputChange, handleDelete, handleEdit, handleModelChange } =
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
    const fetchTools = async () => {
      try {
        const tools = await getAllTools();
        setFetchedTools(tools);
        
        // Fetch MCP server information using existing metrics system
        const metricsResponse = await fetch('/api/mcp-metrics');
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          if (metricsData.success && metricsData.data?.metrics?.servers) {
            const servers = metricsData.data.metrics.servers
              .filter((server: { status: string }) => server.status === 'success') // Only show connected servers
              .map((server: { 
                label: string; 
                status: string; 
                toolsCount: number; 
                transportType: string;
              }) => ({
                name: server.label,
                status: 'Connected',
                toolCount: server.toolsCount,
                transportType: server.transportType
              }));
            setMcpServers(servers);
          }
        }
      } catch (error) {
        console.error("Error fetching available tools:", error);
        setFetchedTools([]); // Set to empty on error
        setMcpServers([]);
        toast({ title: "Failed to load tools", status: "error" });
      }
    };
    fetchTools();
  }, []); // Empty dependency array to run once on mount

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
    async function fetchPrompts() {
      try {
        const response = await fetch("/api/prompts-available")
        if (!response.ok) {
          throw new Error("Failed to fetch prompts")
        }
        const data = await response.json()
        const transformedPrompts = data.prompts.map((p: ApiPrompt) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          content: p.system_prompt,
        }))
        setPrompts(transformedPrompts)
      } catch (error) {
        console.error("Error fetching prompts:", error)
        setPrompts([])
      }
    }
    fetchPrompts()
  }, [])

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

  // Available markdown files
  const markdownFiles = [
    'ROO-IMPROVE-CODE.MD',
    'ROO-FIX-ISSUES.MD', 
    'ROO-EXPLAIN-CODE.MD',
    'ROO-ENHANCE-PROMPT.MD',
    'CONTEXT-CONDENSING-PROMPT.md',
    'mcp-server-testing-prompt.md',
    'create-fastmcp-server.md',
    'expert_prompt_writer.md',
    'cursor-rules.md'
  ];

  // Function to load markdown file by index
  const loadMarkdownByIndex = async (index: number) => {
    setIsLoadingMarkdown(true);
    try {
      const file = markdownFiles[index];
      const response = await fetch(`/api/prompts/docs/${file}`);
      
      if (response.ok) {
        const content = await response.text();
        setRandomMarkdownContent(content);
      } else {
        console.error('Failed to load markdown file:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading markdown:', error);
    } finally {
      setIsLoadingMarkdown(false);
    }
  };

  // Function to load random markdown file (for initial load)
  const loadRandomMarkdown = async () => {
    const randomIndex = Math.floor(Math.random() * markdownFiles.length);
    setCurrentFileIndex(randomIndex);
    await loadMarkdownByIndex(randomIndex);
  };

  // Navigation functions
  const navigateToPrevious = () => {
    const newIndex = currentFileIndex > 0 ? currentFileIndex - 1 : markdownFiles.length - 1;
    setCurrentFileIndex(newIndex);
    loadMarkdownByIndex(newIndex);
  };

  const navigateToNext = () => {
    const newIndex = currentFileIndex < markdownFiles.length - 1 ? currentFileIndex + 1 : 0;
    setCurrentFileIndex(newIndex);
    loadMarkdownByIndex(newIndex);
  };

  // Load random markdown on component mount
  useEffect(() => {
    if (hydrated && !chatId && messages.length === 0) {
      loadRandomMarkdown();
    }
  }, [hydrated, chatId, messages.length]);

  // Function to save edited prompt content
  const handleSavePrompt = async (newContent: string) => {
    try {
      const response = await fetch("/api/prompts", {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to save prompt');
      }

      // Update the displayed content and clear cache
      setRandomMarkdownContent(newContent);
      
      // Optionally show a success message
      console.log('Prompt saved successfully');
    } catch (error) {
      console.error('Error saving prompt:', error);
      throw error; // Re-throw to let the CodeBlock component handle the error
    }
  };

  const submit = async (value: string, data?: { agent?: Agent | null; tool?: FetchedToolInfo | null }) => {
    setIsSubmitting(true)

    if (!value.trim()) {
      setIsSubmitting(false)
      return
    }

    if (value.length > MESSAGE_MAX_LENGTH) {
      toast({
        title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
        status: "error",
      })
      setIsSubmitting(false)
      return
    }

    const uid = await getOrCreateGuestUserId()
    if (!uid) {
      setIsSubmitting(false)
      return
    }

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

    const attachmentsPayload = attachments.length > 0 ? await Promise.all(
      attachments.map(async (file) => {
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
      data: {
        chatId: currentChatId,
        userId: uid,
        model: selectedModel,
        system_prompt: systemPrompt,
        ...(data?.agent && { agentId: data.agent.id }),
        ...(data?.tool && { 
          toolName: data.tool.name,
          // Assuming parameters are handled separately or are part of the tool object
          // toolParameters: data.tool.parameters 
        }),
      },
      experimental_attachments: attachmentsPayload,
    }

    try {
      setInput(value); // Set the input value before submitting
      await handleSubmit(undefined, options);

      clearDraft();
      setAttachments([]);
      hasSentFirstMessageRef.current = true
    } catch (submitError) {
      toast({ title: "Failed to send message", status: "error" })
      console.error("Error submitting message:", submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReload = async () => {
    const uid = await getOrCreateGuestUserId()
    if (!uid) {
      return
    }

    const options = {
      data: {
        chatId,
        userId: uid,
        model: selectedModel,
        system_prompt: systemPrompt,
      },
    }

    reload(options)
  }

  // not user chatId and no messages
  if (hydrated && chatId && !isChatsLoading && !currentChat) {
    return redirect("/")
  }

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col"
      )}
    >
      {/* <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} /> */}
      <DialogAuth />

      {/* Add Suspense boundary for SearchParamsProvider */}
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 md:px-6">
        <Suspense fallback={<div>Loading...</div>}>
          <SearchParamsProvider setInput={setInput} />
        </Suspense>
        <ChatInput
          value={input}
          onValueChange={handleInputChange}
          onSend={(data) => submit(input, data)}
          onStop={stop}
          isSubmitting={isSubmitting}
          isStreaming={status === "streaming"}
          availableAgents={availableAgents}
          availableTools={availableTools}
          prompts={prompts}
          currentAgent={currentAgent?.id || null}
          currentModelId={selectedModel}
          session={session}
          attachments={attachments}
          setAttachments={setAttachments}
        />
      </div>

      {/* Main content area - scrollable, takes remaining space */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
          <AnimatePresence initial={false} mode="popLayout">
            {!chatId && messages.length === 0 ? (
              <motion.div
                key="onboarding"
                className="w-full max-w-4xl mx-auto"
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
                {/* Display random markdown content with navigation */}
                {isLoadingMarkdown ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : randomMarkdownContent ? (
                  <div className="relative max-w-3xl mx-auto px-12 md:px-0">
                    {/* Left Arrow */}
                    <button
                      onClick={navigateToPrevious}
                      className="absolute left-2 md:left-0 top-1/2 -translate-y-1/2 md:-translate-x-12 z-10 flex items-center justify-center w-10 h-10 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full hover:bg-background/95 hover:border-border transition-all duration-200 shadow-md hover:shadow-lg"
                      aria-label="Previous prompt"
                    >
                      <ChevronLeft size={20} className="text-muted-foreground hover:text-foreground" />
                    </button>
                    
                    {/* CodeBlock */}
                    <div className="max-h-[48rem] overflow-y-auto">
                      <CodeBlock>
                        <CodeBlockCode
                          code={randomMarkdownContent}
                          language="markdown"
                          onSave={handleSavePrompt}
                        />
                      </CodeBlock>
                    </div>
                    
                    {/* Right Arrow */}
                    <button
                      onClick={navigateToNext}
                      className="absolute right-2 md:right-0 top-1/2 -translate-y-1/2 md:translate-x-12 z-10 flex items-center justify-center w-10 h-10 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full hover:bg-background/95 hover:border-border transition-all duration-200 shadow-md hover:shadow-lg"
                      aria-label="Next prompt"
                    >
                      <ChevronRight size={20} className="text-muted-foreground hover:text-foreground" />
                    </button>
                    
                    {/* File indicator */}
                    <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
                      <span>{currentFileIndex + 1} of {markdownFiles.length}</span>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <div className="w-full max-w-4xl mx-auto">
                <Conversation
                  key="conversation"
                  messages={messages}
                  status={status}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onReload={handleReload}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <FeedbackWidget />
    </div>
  )
}
