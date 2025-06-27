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
import { useFileUpload } from "./use-file-upload"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { ChevronUp } from "lucide-react"
import { ChatNavigation } from "./chat-navigation"

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
  const {
    files,
    setFiles,
    handleFileUpload,
  } = useFileUpload()
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
  const isMobile = useBreakpoint(768)
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

  // Function to load random markdown file
  const loadRandomMarkdown = async () => {
    setIsLoadingMarkdown(true);
    try {
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
      
      const randomFile = markdownFiles[Math.floor(Math.random() * markdownFiles.length)];
      const response = await fetch(`/api/docs/${randomFile}`);
      
      if (response.ok) {
        const content = await response.text();
        setRandomMarkdownContent(content);
      } else {
        console.error('Failed to load markdown file:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading random markdown:', error);
    } finally {
      setIsLoadingMarkdown(false);
    }
  };

  // Load random markdown on component mount
  useEffect(() => {
    if (hydrated && !chatId && messages.length === 0) {
      loadRandomMarkdown();
    }
  }, [hydrated, chatId, messages.length]);

  const submit = async () => {
    setIsSubmitting(true)

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
      data: {
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
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
      },
    }

    reload(options)
  }

  const handleFileSelect = (file: File) => {
    handleFileUpload([file])
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
      <Suspense>
        <SearchParamsProvider setInput={setInput} />
      </Suspense>

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
                <div className="text-center mb-8">
                  <h1 className="mb-6 text-3xl font-medium tracking-tight">
                    How can I help?
                  </h1>
                </div>
                
                {/* Display random markdown content */}
                {isLoadingMarkdown ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : randomMarkdownContent ? (
                  <div className="max-h-96 overflow-y-auto">
                    <CodeBlock>
                      <CodeBlockCode
                        code={randomMarkdownContent}
                        language="markdown"
                      />
                    </CodeBlock>
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

      {/* Chat input - fixed at bottom, never scrolls out of view */}
      <div className="flex-shrink-0 border-t border-border/30 bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          {/* Chat navigation - positioned above input on mobile */}
          <ChatNavigation />
          <motion.div
            className={cn(
              "relative mx-auto w-full max-w-3xl"
            )}
            layout="position"
            layoutId="chat-input-container"
            transition={{
              layout: {
                duration: messages.length === 1 ? 0.3 : 0,
              },
            }}
          >
            {/* Enhanced input container with unified styling */}
            <div className="w-full bg-background/95 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 p-4 space-y-4">
              {/* Collapsible Model selector and tools info row */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {/* Collapse/expand button for mobile */}
                  {isMobile && (
                    <button
                      onClick={() => setIsInputSectionCollapsed(!isInputSectionCollapsed)}
                      className="flex items-center justify-center w-6 h-6 rounded-md bg-muted/50 border border-border/30 hover:bg-muted transition-colors"
                      aria-label={isInputSectionCollapsed ? "Expand input options" : "Collapse input options"}
                    >
                      <motion.div
                        animate={{ rotate: isInputSectionCollapsed ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronUp size={14} />
                      </motion.div>
                    </button>
                  )}
                  
                  {/* Tools info - hidden when collapsed on mobile */}
                  <AnimatePresence>
                    {(!isMobile || !isInputSectionCollapsed) && availableTools.length > 0 && (
                      <motion.div
                        initial={isMobile ? { opacity: 0, scale: 0.9 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={isMobile ? { opacity: 0, scale: 0.9 } : {}}
                        transition={{ duration: 0.2 }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border border-border/30 hover:bg-muted transition-colors"
                              aria-label="View connected MCP servers"
                            >
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              <span className="text-xs font-medium text-muted-foreground">
                                {availableTools.length} tool{availableTools.length !== 1 ? 's' : ''}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs bg-popover border-border text-popover-foreground">
                            <div className="space-y-2">
                              <div className="font-medium text-sm text-foreground">Connected MCP Servers</div>
                              {mcpServers.length > 0 ? (
                                mcpServers.map((server, index) => (
                                  <div key={index} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                      <span className="font-medium text-foreground">{server.name}</span>
                                      <span className="text-muted-foreground uppercase text-[10px]">({server.transportType})</span>
                                    </div>
                                    <span className="text-muted-foreground">{server.toolCount} tools</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-muted-foreground">No servers connected</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Model selector - hidden when collapsed on mobile */}
                <AnimatePresence>
                  {(!isMobile || !isInputSectionCollapsed) && (
                    <motion.div
                      initial={isMobile ? { opacity: 0, scale: 0.9 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={isMobile ? { opacity: 0, scale: 0.9 } : {}}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      {selectedModel && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                      <ModelSelector
                        availableModels={availableModels}
                        selectedModelId={selectedModel}
                        setSelectedModelId={handleModelChange}
                        className="border-border/30 shadow-sm hover:shadow-md transition-all duration-200"
                        isUserAuthenticated={!!session?.user?.id}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Subtle separator with gradient - only show when not collapsed */}
              <AnimatePresence>
                {(!isMobile || !isInputSectionCollapsed) && (
                  <motion.div
                    initial={isMobile ? { opacity: 0, height: 0 } : false}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={isMobile ? { opacity: 0, height: 0 } : {}}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Chat input */}
              <div className="relative">
                <ChatInput
                  value={input}
                  onValueChange={handleInputChange}
                  onSend={submit}
                  onStop={stop}
                  onFileSelect={handleFileSelect}
                  isSubmitting={isSubmitting}
                  isStreaming={status === "streaming"}
                  availableAgents={availableAgents}
                  availableTools={availableTools}
                  prompts={prompts}
                  currentAgent={currentAgent?.id || null}
                  currentModelId={selectedModel}
                  session={session}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <FeedbackWidget /> 
    </div>
  )
}
