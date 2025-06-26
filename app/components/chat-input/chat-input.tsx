"use client"

import { useAgentCommand, Prompt, MCPTool } from "@/app/components/chat-input/use-agent-command";
import { Agent } from "@/app/types/agent";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { appLogger } from "@/lib/logger";
import type { FetchedToolInfo } from "@/lib/mcp/enhanced/types";
import { MODELS, type ModelConfig } from "@/lib/models";
import { getAllTools } from "@/lib/tool-utils";
import { AttachMenu } from "./attach-menu";
import { FileExplorerModal } from "@/app/components/files/file-explorer-modal";
import { SelectedAgent } from "./selected-agent";
import { SelectedPromptDisplay } from "./selected-prompt-display"
import { SelectedToolDisplay } from "./selected-tool-display"
import { ToolParameterInput } from "./tool-parameter-input"
import { UnifiedSelectionModal } from "./unified-selection-modal"
import { Sparkle, StopCircle, AlertTriangle, SendHorizontal } from "lucide-react"
import { useEffect, useRef, useState, useMemo, type KeyboardEvent } from "react";
import type { Session } from "next-auth";

export type AvailableModelData = {
  id: string
  name: string
  description: string
  tools: FetchedToolInfo[]
  providerId?: string
  contextWindow?: number | null
  starred?: boolean
}

export type ChatInputProps = {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  onFileSelect: (file: File) => void
  isSubmitting: boolean
  isStreaming: boolean
  availableAgents: Agent[]
  availableTools: FetchedToolInfo[]
  prompts: Prompt[]
  currentAgent: string | null
  currentModelId: string
  session: Session | null
}

export function ChatInput({
  value,
  onValueChange,
  onSend,
  onStop,
  onFileSelect,
  isSubmitting,
  isStreaming,
  availableAgents,
  availableTools,
  prompts,
  currentAgent,
  currentModelId,
  session,
}: ChatInputProps) {
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hiddenFileInputRef = useRef<HTMLInputElement>(null)
  const rafId = useRef<number | null>(null)

  const [isEnhancing, setIsEnhancing] = useState(false)
  const [availableModels, setAvailableModels] = useState<AvailableModelData[]>([])
  const [selectedModelId] = useState<string>("claude-3-haiku-20240307")

  const agentCommand = useAgentCommand({
    onValueChangeAction: onValueChange,
    textareaRef: textareaRef as React.RefObject<HTMLTextAreaElement>,
    agents: availableAgents || [],
    tools: availableTools || [],
    prompts: prompts || [],
    defaultAgent: (availableAgents || []).find(agent => agent.id === currentAgent) || null,
  })

  const handleFileUpload = (file: File) => {
    onFileSelect(file)
  }

  const handleHiddenInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileUpload(event.target.files[0])
    }
  }

  const handleTriggerFileUpload = () => {
    hiddenFileInputRef.current?.click()
    agentCommand.closeSelectionModal()
  }

  const handleTriggerFileBrowse = () => {
    agentCommand.setIsFileExplorerModalOpen(true)
    agentCommand.closeSelectionModal()
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (items) {
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) {
            handleFileUpload(file)
          }
        }
      }
    }
  }

  const handleFileUploadForChat = (files: File[]) => {
    if (files.length > 0) {
      appLogger.debug("Files selected for chat, but not processed by this handler:", {
        fileCount: files.length,
        fileName: files[0].name
      });
    }
  };

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      rafId.current = requestAnimationFrame(resizeTextarea);
    };

    const textarea = textareaRef.current;
    if (textarea) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(textarea);

      // Initial resize
      handleResize();

      return () => {
        resizeObserver.unobserve(textarea);
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }
  }, [value]);

  const handleAttachMenuMentionTrigger = (prefix: string) => {
    if (textareaRef.current) {
      const currentVal = textareaRef.current.value;
      const cursorPos = textareaRef.current.selectionStart;
      
      const newValue = currentVal.substring(0, cursorPos) + prefix + currentVal.substring(cursorPos);
      agentCommand.handleInputChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = cursorPos + prefix.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          agentCommand.handleInputChange(textareaRef.current.value);
        }
      }, 0);
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    onValueChange(value + " (enhanced)")
    setIsEnhancing(false)
  }

  const handleSend = () => {
    if (isSubmitting || isEnhancing) return
    onSend()
  }

  const noToolSupport = !availableModels.find(model => model.id === selectedModelId)?.tools.length

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const modelsDataPromises = MODELS.map(async (model: ModelConfig) => {
          const tools = await getAllTools(); // getAllTools is now async
          return {
            id: model.id,
            name: model.name,
            description: model.description || "",
            tools: tools, // tools is FetchedToolInfo[] after await
            providerId: model.providerId,
            contextWindow: model.contextWindow,
          };
        });
        const modelsData = await Promise.all(modelsDataPromises);
        setAvailableModels(modelsData);
      } catch (error) {
        appLogger.error("Failed to fetch models and tools:", { error });
      }
    };

    fetchModels()
  }, [])

  const mcpSelectedTool = useMemo(() => {
    if (!agentCommand.selectedTool) return null;
    const tool = agentCommand.selectedTool;
    let serverId = "unknown-server";
    let serverLabel = "Unknown Server";
    if (tool.annotations) {
      const annotations = tool.annotations as { server_id?: string; server_label?: string };
      if (typeof annotations.server_id === 'string') {
        serverId = annotations.server_id;
      }
      if (typeof annotations.server_label === 'string') {
        serverLabel = annotations.server_label;
      }
    }
    const mcpToolDisplay: MCPTool = {
      name: tool.name,
      description: tool.description,
      serverId: serverId, // MCPTool uses serverId
      serverLabel: serverLabel // MCPTool uses serverLabel
    };
    return mcpToolDisplay;
  }, [agentCommand.selectedTool]);


  return (
    <>
      <UnifiedSelectionModal
        isOpen={agentCommand.showSelectionModal}
        onClose={agentCommand.closeSelectionModal}
        activeCommandType={agentCommand.activeCommandType}
        searchTerm={agentCommand.currentSearchTerm}
        agents={agentCommand.filteredAgents}
        tools={agentCommand.filteredTools}
        prompts={agentCommand.filteredPrompts}
        onSelectAgent={agentCommand.handleAgentSelectAction}
        onSelectTool={agentCommand.handleToolSelectAction}
        onSelectPrompt={agentCommand.handlePromptSelectAction}
        onUrlSubmit={(url: string) => agentCommand.handleUrlSubmit(url, `@url/${url}`)}
        onModalSearchChange={agentCommand.handleModalSearchChange}
        activeIndex={agentCommand.activeSelectionIndex}
        onTriggerFileUpload={handleTriggerFileUpload}
        onTriggerFileBrowse={handleTriggerFileBrowse}
      />

      <FileExplorerModal
        isOpen={agentCommand.isFileExplorerModalOpen}
        onClose={() => agentCommand.setIsFileExplorerModalOpen(false)}
        onFileSelectForMention={agentCommand.handleFileMentionSelectedFromModal}
      />

      <input
        type="file"
        ref={hiddenFileInputRef}
        onChange={handleHiddenInputChange}
        style={{ display: "none" }}
        multiple
      />

      {agentCommand.pendingTool && (
        <ToolParameterInput
          tool={agentCommand.pendingTool}
          onSubmit={() => {}}
          onCancel={() => agentCommand.setPendingTool(null)}
        />
      )}

      <PromptInput className="relative bg-transparent border-border/30 shadow-none" onSubmit={handleSend}>
        <div className="flex flex-col gap-2 p-2">
          <div className="flex items-center gap-2 flex-wrap">
            {agentCommand.selectedAgent && (
              <SelectedAgent
                selectedAgent={agentCommand.selectedAgent}
                removeSelectedAgent={agentCommand.removeSelectedAgent}
              />
            )}

            {agentCommand.selectedTool && (
              <SelectedToolDisplay
                selectedTool={mcpSelectedTool}
                removeSelectedTool={agentCommand.removeSelectedTool}
              />
            )}

            {agentCommand.selectedPrompt && (
              <SelectedPromptDisplay
                selectedPrompt={agentCommand.selectedPrompt}
                removeSelectedPrompt={agentCommand.removeSelectedPrompt}
              />
            )}
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center">
              <AttachMenu
                onFileUploadAction={handleFileUploadForChat}
                isUserAuthenticated={!!session?.user?.id}
                model={currentModelId || MODELS[0].id}
                onTriggerMentionAction={handleAttachMenuMentionTrigger}
              />
            </div>

            <PromptInputTextarea
              placeholder="Send a message..."
              value={value}
              onChange={e => agentCommand.handleInputChange(e.target.value)}
              onKeyDown={agentCommand.handleKeyDown as (e: KeyboardEvent<HTMLTextAreaElement>) => void}
              className="pl-14 pr-24 min-h-[44px] max-h-[200px]"
              ref={textareaRef}
              disabled={isSubmitting || !!agentCommand.pendingTool}
              onPaste={handlePaste}
            />
          </div>
        </div>

        <PromptInputActions className="absolute bottom-2 right-2">
          <div className="flex items-center gap-2">
            {agentCommand.selectedAgent && noToolSupport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle size={20} className="text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent side="top">This model does not support tools. Some agent functionality may be limited.</TooltipContent>
              </Tooltip>
            )}

            {isStreaming ? (
              <Button
                variant="default"
                size="icon"
                onClick={onStop}
              >
                <StopCircle size={20} />
              </Button>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleEnhance}
                      disabled={!value || isEnhancing || isSubmitting}
                      className="group"
                    >
                      <Sparkle
                        size={20}
                        className={`transition-transform duration-500 ${isEnhancing ? "animate-spin" : "group-hover:scale-110"}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Enhance prompt</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={handleSend}
                      disabled={!value || isSubmitting}
                    >
                      <SendHorizontal size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Send message</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </PromptInputActions>
      </PromptInput>
    </>
  )
}
