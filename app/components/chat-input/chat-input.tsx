"use client"

import { useAgentCommand } from "@/app/components/chat-input/use-agent-command"
import { ModelSelector } from "@/components/common/model-selector/base"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"
import { useAgent } from "@/lib/agent-store/provider"
import { MODELS } from "@/lib/models"
import { ArrowUp, Stop, Warning, Sparkle } from "@phosphor-icons/react"
import React, { useCallback, useEffect, useState } from "react"
import { PromptSystem } from "../suggestions/prompt-system"
import { AgentCommand } from "./agent-command"
import { FileList } from "./file-list"
import { SelectedAgent } from "./selected-agent"
import { ToolCommand } from "./tool-command"
import { ToolParameterInput } from "./tool-parameter-input"
import { RuleCommand } from "./rule-command"
import { AttachMenu } from "./attach-menu"
import { validateFile } from "@/lib/file-handling"
import { toast } from "@/components/ui/toast"

type AvailableModelData = {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  providerId: string;
  starred?: boolean;
};

type ChatInputProps = {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  isSubmitting?: boolean
  hasMessages?: boolean
  files: File[]
  onFileUpload: (files: File[]) => void
  onFileRemove: (file: File) => void
  onSuggestion: (suggestion: string) => void
  hasSuggestions?: boolean
  onSelectModel: (model: string) => void
  selectedModel: string
  availableModels: AvailableModelData[]
  onStarModel: (modelId: string) => void;
  isUserAuthenticated: boolean
  stop: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
}

export function ChatInput({
  value,
  onValueChange,
  onSend,
  isSubmitting,
  files,
  onFileUpload,
  onFileRemove,
  onSuggestion,
  hasSuggestions,
  onSelectModel,
  selectedModel,
  availableModels,
  onStarModel,
  isUserAuthenticated,
  stop,
  status,
}: ChatInputProps) {
  const { currentAgent, curatedAgents, userAgents } = useAgent()
  const [isEnhancing, setIsEnhancing] = useState(false)

  const agentCommand = useAgentCommand({
    value,
    onValueChange,
    agents: [...(curatedAgents || []), ...(userAgents || [])],
    defaultAgent: currentAgent,
  })

  const noToolSupport =
    currentAgent &&
    !MODELS.find((model) => model.id === selectedModel)?.tools

  const handleFileUpload = useCallback(
    async (newFiles: File[]) => {
      // ✅ AI SDK PATTERN: Validate files before adding to state
      const validFiles: File[] = []
      
      for (const file of newFiles) {
        const validation = await validateFile(file)
        if (validation.isValid) {
          validFiles.push(file)
        } else {
          toast({
            title: `File "${file.name}" rejected`,
            description: validation.error,
            status: "error",
          })
        }
      }
      
      if (validFiles.length > 0) {
        onFileUpload(validFiles)
      }
    },
    [onFileUpload]
  )

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const hasImageContent = Array.from(items).some((item) =>
        item.type.startsWith("image/")
      )

      if (!isUserAuthenticated && hasImageContent) {
        e.preventDefault()
        return
      }

      if (isUserAuthenticated && hasImageContent) {
        const imageFiles: File[] = []

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file) {
              const newFile = new File(
                [file],
                `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
                { type: file.type }
              )
              imageFiles.push(newFile)
            }
          }
        }

        if (imageFiles.length > 0) {
          handleFileUpload(imageFiles)
        }
      }
      // Text pasting will work by default for everyone
    },
    [isUserAuthenticated, handleFileUpload]
  )

  const handleSend = useCallback(() => {
    if (isSubmitting) {
      return
    }

    if (status === "streaming") {
      stop()
      return
    }

    onSend()
  }, [isSubmitting, onSend, status, stop])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // First process agent command related key handling
      agentCommand.handleKeyDown(e)

      if (isSubmitting) {
        e.preventDefault()
        return
      }

      if (e.key === "Enter" && status === "streaming") {
        e.preventDefault()
        return
      }

      if (e.key === "Enter" && !e.shiftKey && !agentCommand.showAgentCommand && !agentCommand.showToolCommand) {
        e.preventDefault()
        onSend()
      }
    },
    [agentCommand, isSubmitting, onSend, status]
  )

  const handleEnhance = useCallback(async () => {
    if (!value?.trim() || isEnhancing || isSubmitting) return
    
    setIsEnhancing(true)
    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: value })
      })
      
      if (response.ok) {
        const { enhancedPrompt } = await response.json()
        onValueChange(enhancedPrompt)
      } else {
        toast({
          title: "Enhancement failed",
          description: "Could not enhance the prompt. Please try again.",
          status: "error",
        })
      }
    } catch (error) {
      console.error('Enhance prompt error:', error)
      toast({
        title: "Enhancement failed", 
        description: "Could not enhance the prompt. Please try again.",
        status: "error",
      })
    } finally {
      setIsEnhancing(false)
    }
  }, [value, isEnhancing, isSubmitting, onValueChange])

  useEffect(() => {
    const el = agentCommand.textareaRef.current
    if (!el) return
    el.addEventListener("paste", handlePaste)
    return () => el.removeEventListener("paste", handlePaste)
  }, [agentCommand.textareaRef, handlePaste])

  return (
    <div className="relative flex w-full flex-col gap-4">
      {hasSuggestions && (
        <PromptSystem
          onValueChange={onValueChange}
          onSuggestion={onSuggestion}
          value={value}
        />
      )}
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="bg-popover relative z-10 p-0 pt-1 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          value={value}
          onValueChange={agentCommand.handleValueChange}
        >
          {agentCommand.showAgentCommand && (
            <div className="absolute bottom-full left-0 w-full">
              <AgentCommand
                isOpen={agentCommand.showAgentCommand}
                searchTerm={agentCommand.agentSearchTerm}
                onSelect={agentCommand.handleAgentSelect}
                onClose={agentCommand.closeAgentCommand}
                activeIndex={agentCommand.activeAgentIndex}
                onActiveIndexChange={agentCommand.setActiveAgentIndex}
                curatedAgents={curatedAgents || []}
                userAgents={userAgents || []}
              />
            </div>
          )}
          {agentCommand.showToolCommand && (
            <div className="absolute bottom-full left-0 w-full">
              <ToolCommand
                isOpen={agentCommand.showToolCommand}
                onSelect={agentCommand.handleToolSelect}
                onClose={agentCommand.closeToolCommand}
                activeIndex={agentCommand.activeToolIndex}
                onActiveIndexChange={agentCommand.setActiveToolIndex}
                filteredTools={agentCommand.filteredTools}
              />
            </div>
          )}
          {agentCommand.showRuleCommand && (
            <div className="absolute bottom-full left-0 w-full">
              <RuleCommand
                isOpen={agentCommand.showRuleCommand}
                onSelect={agentCommand.handleRuleSelect}
                onClose={agentCommand.closeRuleCommand}
                activeIndex={agentCommand.activeRuleIndex}
                onActiveIndexChange={agentCommand.setActiveRuleIndex}
                filteredRules={agentCommand.filteredRules}
              />
            </div>
          )}
          <SelectedAgent
            selectedAgent={agentCommand.selectedAgent}
            removeSelectedAgent={agentCommand.removeSelectedAgent}
          />
          {agentCommand.pendingTool && (
            <ToolParameterInput
              tool={agentCommand.pendingTool}
              onSubmit={agentCommand.handleToolParametersSubmit}
              onCancel={agentCommand.handleToolParametersCancel}
            />
          )}
          <FileList files={files} onFileRemove={onFileRemove} />
          <PromptInputTextarea
            placeholder={
              "Ask Piper, @mention an agent, or @mention a tool"
            }
            onKeyDown={handleKeyDown}
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
            ref={agentCommand.textareaRef}
          />
          <PromptInputActions className="mt-5 w-full justify-between px-3 pb-3">
            <div className="flex gap-2">
              <AttachMenu
                onFileUpload={handleFileUpload}
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
                onTriggerMention={(prefix) => {
                  // Simulate @mention behavior: add @ and focus input
                  const newValue = value + prefix
                  onValueChange(newValue)
                  // Focus the input after a brief delay to let state update
                  setTimeout(() => {
                    agentCommand.textareaRef.current?.focus()
                  }, 10)
                }}
              />
              <ModelSelector
                availableModels={availableModels}
                selectedModelId={selectedModel}
                setSelectedModelId={(modelId) => {
                  console.log(`🔄 ChatInput ModelSelector: Model changed to "${modelId}"`);
                  console.log(`📊 Available models source: OpenRouter API (${availableModels.length} models)`);
                  console.log(`📋 Internal MODELS array: ${MODELS.length} models from lib/models`);
                  onSelectModel(modelId);
                }}
                onStarModel={onStarModel}
                isUserAuthenticated={isUserAuthenticated}
              />
              {currentAgent && noToolSupport && (
                <div className="flex items-center gap-1">
                  <Warning className="size-4" />
                  <p className="line-clamp-2 text-xs">
                    {selectedModel} does not support tools. Agents may not work
                    as expected.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <PromptInputAction tooltip="Enhance prompt">
                <Button
                  size="sm"
                  variant="outline"
                  className="size-9 rounded-full transition-all duration-300 ease-out"
                  disabled={!value?.trim() || isEnhancing || Boolean(isSubmitting)}
                  type="button"
                  onClick={handleEnhance}
                  aria-label="Enhance prompt"
                >
                  <Sparkle className={`size-4 ${isEnhancing ? 'animate-pulse' : ''}`} />
                </Button>
              </PromptInputAction>
              <PromptInputAction
                tooltip={status === "streaming" ? "Stop" : "Send"}
              >
                <Button
                  size="sm"
                  className="size-9 rounded-full transition-all duration-300 ease-out"
                  disabled={!value?.trim() || Boolean(isSubmitting)}
                  type="button"
                  onClick={handleSend}
                  aria-label={status === "streaming" ? "Stop" : "Send message"}
                >
                  {status === "streaming" ? (
                    <Stop className="size-4" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              </PromptInputAction>
            </div>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}
