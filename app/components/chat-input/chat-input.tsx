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
import React, { useCallback, useEffect, useState, useRef } from "react"
import { PromptSystem } from "../suggestions/prompt-system"
import { FileList } from "./file-list"
import { SelectedAgent } from "./selected-agent"
import { SelectedPromptDisplay } from './selected-prompt-display';
import { SelectedToolDisplay } from './selected-tool-display';
import { SelectedUrlDisplay } from './selected-url-display';
// Note: AttachedUrl type is provided by the useAgentCommand hook for agentCommand.attachedUrls
import { ToolParameterInput } from "./tool-parameter-input";
import { UnifiedSelectionModal } from "./unified-selection-modal";
import { AttachMenu } from "./attach-menu";
import { FileExplorerModal } from '../files/file-explorer-modal';
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
  onValueChangeAction: (value: string) => void
  onSendAction: () => void
  isSubmitting?: boolean
  hasMessages?: boolean
  files: File[]
  onFileUploadAction: (files: File[]) => void
  onFileRemoveAction?: (file: File) => void
  onSuggestionAction?: (suggestion: string) => Promise<void>
  hasSuggestions?: boolean
  onSelectModelAction: (model: string) => void
  selectedModel: string
  availableModels: AvailableModelData[]
  onStarModelAction: (modelId: string) => void;
  isUserAuthenticated: boolean
  stopAction: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
}

export function ChatInput({
  value,
  onValueChangeAction,
  onSendAction,
  isSubmitting,
  files,
  onFileUploadAction,
  onFileRemoveAction,
  onSuggestionAction,
  hasSuggestions,
  onSelectModelAction,
  selectedModel,
  availableModels,
  onStarModelAction,
  isUserAuthenticated,
  stopAction,
  status,
}: ChatInputProps) {
  const { currentAgent, curatedAgents, userAgents } = useAgent()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hiddenFileInputRef = useRef<HTMLInputElement>(null); // Added for triggering file upload
  const [isEnhancing, setIsEnhancing] = useState(false)

  const agentCommand = useAgentCommand({
    value,
    onValueChangeAction,
    agents: [...(curatedAgents || []), ...(userAgents || [])],
    defaultAgent: currentAgent,
    textareaRef,
  });

  const { 
    showSelectionModal, 
    activeCommandType, 
    currentSearchTerm, 
    filteredAgents, 
    filteredTools, 
    filteredPrompts, 
    handleAgentSelectAction, 
    handleToolSelectAction, 
    handlePromptSelectAction, 
    closeSelectionModal, 
    activeSelectionIndex,
    handleModalSearchChange,
    handleUrlSubmit,
    selectedPrompt,
    removeSelectedPrompt,
    selectedTool, // Added for tool display
    removeSelectedTool, // Added for tool display
    attachedUrls, // Added for URL display
    removeAttachedUrl, // Added for URL display
    // File Explorer Modal props
    isFileExplorerModalOpen,
    setIsFileExplorerModalOpen, // Or a dedicated close handler if preferred
    handleFileMentionSelectedFromModal,
  } = agentCommand;

  const handleTriggerMention = useCallback((prefix: string) => {
    console.log('[ChatInput] handleTriggerMention called with prefix:', prefix);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentValue = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    // Insert the prefix at the current cursor position or replace selection
    const newValue = currentValue.substring(0, selectionStart) + prefix + currentValue.substring(selectionEnd);
    
    // Directly call the hook's comprehensive value change handler.
    // This will update parent state, internal ref, and call processInputForMentions.
    console.log('[ChatInput] Calling agentCommand.handleInputChange with newValue:', newValue);
    const newCursorPos = selectionStart + prefix.length;

    // Directly update the textarea's value
    textarea.value = newValue;
    // Set the cursor position
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);

    // Now, trigger the value change handler that useAgentCommand listens to.
    agentCommand.handleInputChange(newValue);
    
  }, [textareaRef, agentCommand]);

  // handleFileUpload must be defined before handleHiddenInputChange
  const handleFileUpload = useCallback(
    async (newFiles: File[]) => {
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
        onFileUploadAction(validFiles)
      }
    },
    [onFileUploadAction] // Ensure all dependencies like onFileUploadAction are included
  );

  const handleHiddenInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFileUpload(Array.from(event.target.files));
    }
  }, [handleFileUpload]);

  const handleTriggerFileUpload = useCallback(() => {
    hiddenFileInputRef.current?.click();
  }, []);

  const handleTriggerFileBrowse = useCallback(() => {
    agentCommand.setIsFileExplorerModalOpen(true);
    agentCommand.closeSelectionModal(); // Close UnifiedSelectionModal
  }, [agentCommand]);

  const handleToolParametersCancel = useCallback(() => {
    agentCommand.setPendingTool(null);
    // Optionally, if a modal is always open with parameter input:
    // agentCommand.closeSelectionModal(); 
  }, [agentCommand]);

  const handleToolParametersSubmit = useCallback((submittedParams: Record<string, unknown>) => {
    const tool = agentCommand.pendingTool;
    if (!tool) {
      console.error("handleToolParametersSubmit called without a pending tool");
      return;
    }

    let toolMentionString = `@tools/${tool.name}`;
    for (const [key, value] of Object.entries(submittedParams)) {
      // Simple serialization; consider more robust query string style if needed
      toolMentionString += ` ${key}=${JSON.stringify(value)}`;
    }

    // Update the main input with the full tool call string
    agentCommand.handleInputChange(toolMentionString);
    
    // Confirm the tool selection (might be redundant if already selected, but good for state consistency)
    agentCommand.setSelectedTool(tool); 

    // Clear the pending tool state
    agentCommand.setPendingTool(null);

    // Ensure any modals are closed
    agentCommand.closeSelectionModal();

    // Focus the main input textarea
    textareaRef.current?.focus();

  }, [agentCommand, textareaRef]);

  const noToolSupport =
    currentAgent &&
    !MODELS.find((model) => model.id === selectedModel)?.tools;

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
      stopAction()
      return
    }

    onSendAction()
  }, [isSubmitting, onSendAction, status, stopAction])

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
        onValueChangeAction(enhancedPrompt)
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
  }, [value, isEnhancing, isSubmitting, onValueChangeAction])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.addEventListener("paste", handlePaste)
    return () => el.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  return (
    <div className="relative flex w-full flex-col gap-4">
      {hasSuggestions && (
        <PromptSystem
          onValueChange={onValueChangeAction} 
          onSuggestion={suggestion => { void onSuggestionAction?.(suggestion); }} 
          value={value}
        />
      )}

      {/* File Explorer Modal for @files/ mentions */}
      {isFileExplorerModalOpen && (
        <FileExplorerModal
          isOpen={isFileExplorerModalOpen}
          onClose={() => setIsFileExplorerModalOpen(false)}
          onFileSelectForMention={handleFileMentionSelectedFromModal}
        />
      )}
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="bg-popover relative z-10 p-0 pt-1 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          value={value}
          onValueChange={agentCommand.handleInputChange} // This is for the main textarea input
        >
          {showSelectionModal && (
            <UnifiedSelectionModal
              isOpen={showSelectionModal}
              activeCommandType={activeCommandType}
              searchTerm={currentSearchTerm}
              agents={filteredAgents}
              tools={filteredTools}
              prompts={filteredPrompts}
              onSelectAgent={agentCommand.handleAgentSelectAction}
              onSelectTool={agentCommand.handleToolSelectAction}
              onSelectPrompt={agentCommand.handlePromptSelectAction}
              onUrlSubmit={(url) => agentCommand.handleUrlSubmit(url, `@url/${url}`)} // Adapted for expected signature
              onClose={agentCommand.closeSelectionModal}
              activeIndex={activeSelectionIndex}
              onModalSearchChange={agentCommand.handleModalSearchChange}
              onTriggerFileUpload={handleTriggerFileUpload} // Added prop
              onTriggerFileBrowse={handleTriggerFileBrowse} // Added prop
            />
          )}
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={hiddenFileInputRef} 
            onChange={handleHiddenInputChange} 
            style={{ display: 'none' }} 
            multiple 
          />
          {/* All old placeholder logic and duplicate UnifiedSelectionModal calls are removed. */}
          <SelectedAgent
            selectedAgent={agentCommand.selectedAgent}
            removeSelectedAgent={() => agentCommand.setSelectedAgent(null)}
          />
          <SelectedPromptDisplay 
            selectedPrompt={selectedPrompt}
            removeSelectedPrompt={removeSelectedPrompt}
          />
          <SelectedToolDisplay
            selectedTool={selectedTool}
            removeSelectedTool={removeSelectedTool}
          />
          <SelectedUrlDisplay
            attachedUrls={attachedUrls}
            removeAttachedUrl={removeAttachedUrl}
          />
          {/* Removed duplicate UnifiedSelectionModal call that was here */}
          {agentCommand.pendingTool && (
            <ToolParameterInput
              tool={agentCommand.pendingTool}
              onSubmit={handleToolParametersSubmit}
              onCancel={handleToolParametersCancel}
            />
          )}
          <FileList files={files} onFileRemove={onFileRemoveAction || (() => { /* no-op */ })} />
          <PromptInputTextarea
            placeholder={
              "Ask Piper, @mention an agent, or @mention a tool"
            }
            onKeyDown={agentCommand.handleKeyDown} // Correct: useAgentCommand returns handleKeyDown
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
            ref={textareaRef} // Use the local textareaRef
            disabled={isSubmitting || agentCommand.pendingTool !== null}
          />
          <PromptInputActions className="mt-5 w-full justify-between px-3 pb-3">
            <div className="flex gap-2">
              <AttachMenu
                onFileUploadAction={onFileUploadAction} // Ensure this uses the prop passed to ChatInput
                onTriggerMentionAction={handleTriggerMention} // Use the new local handler
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
              />
              <ModelSelector
                availableModels={availableModels} // Correct prop name for ModelSelector
                selectedModelId={selectedModel}
                setSelectedModelId={onSelectModelAction} // Correct: ModelSelector expects setSelectedModelId
                onStarModel={onStarModelAction}
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
