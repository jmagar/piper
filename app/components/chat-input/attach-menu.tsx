"use client"

import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MODELS } from "@/lib/models"
import { 
  FileArrowUp, 
  Paperclip, 
  Robot,
  BookOpen,
  Wrench,
  File,
  Link,
  Sparkle
} from "@phosphor-icons/react"
import React, { useState } from "react"

type AttachMenuProps = {
  onFileUpload: (files: File[]) => void
  isUserAuthenticated: boolean
  model: string
  // Callbacks to simulate @mention behavior
  onTriggerMention: (prefix: string) => void
}

// Clean vision detection function
function hasVisionSupport(modelId: string): boolean {
  const exactMatch = MODELS.find(m => m.id === modelId);
  if (exactMatch) {
    return exactMatch.vision || false;
  }

  if (modelId.includes('claude-4') || modelId.includes('claude-3.5') || modelId.includes('claude-3.7')) {
    return true;
  }

  if (modelId.includes('gpt-4') || modelId.includes('o1') || modelId.includes('o3')) {
    return true;
  }

  const similarModels = MODELS.filter(m => 
    m.vision && (
      m.id.includes(modelId.split('-')[1]) ||
      (m.id.includes('claude') && modelId.includes('claude')) ||
      (m.id.includes('gpt') && modelId.includes('gpt'))
    )
  );

  return similarModels.length > 0;
}

export function AttachMenu({
  onFileUpload,
  isUserAuthenticated,
  model,
  onTriggerMention,
}: AttachMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isFileUploadAvailable = hasVisionSupport(model)

  const handleSectionSelect = (section: string) => {
    setIsOpen(false) // Close the dropdown
    
    switch (section) {
      case 'agents':
        onTriggerMention('@') // Trigger @mention for agents
        break
      case 'tools':
        onTriggerMention('@') // Trigger @mention for tools  
        break
      case 'rules':
        onTriggerMention('@') // Trigger @mention for rules
        break
      case 'files':
        // File upload is handled by FileUpload component itself
        break
      case 'prompts':
        console.log('Prompts section selected - feature coming soon!')
        break
      case 'urls':
        console.log('URLs section selected - feature coming soon!')
        break
    }
  }

  if (!isUserAuthenticated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="border-border dark:bg-secondary size-9 rounded-full border bg-transparent opacity-50 min-h-[44px] min-w-[44px] sm:size-9"
            type="button"
            disabled
            aria-label="Attach content (requires authentication)"
          >
            <Paperclip className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sign in to attach content</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="relative">
      {/* Main attach menu */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="border-border dark:bg-secondary size-9 rounded-full border bg-transparent min-h-[44px] min-w-[44px] sm:size-9"
                type="button"
                aria-label="Attach content"
              >
                <Paperclip className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Attach content</TooltipContent>
        </Tooltip>
        
        <DropdownMenuContent align="start" className="w-48 sm:w-52">
          <DropdownMenuItem 
            onClick={() => handleSectionSelect('rules')}
            className="flex items-center gap-2 min-h-[48px] py-3 px-3"
          >
            <BookOpen className="size-4 text-green-600 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Rules</span>
              <span className="text-xs text-muted-foreground">Apply database rules</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => handleSectionSelect('prompts')}
            className="flex items-center gap-2 min-h-[48px] py-3 px-3"
          >
            <Sparkle className="size-4 text-purple-600 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Prompts</span>
              <span className="text-xs text-muted-foreground">Use saved templates</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => handleSectionSelect('agents')}
            className="flex items-center gap-2 min-h-[48px] py-3 px-3"
          >
            <Robot className="size-4 text-blue-600 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Agents</span>
              <span className="text-xs text-muted-foreground">Switch AI agents</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => handleSectionSelect('tools')}
            className="flex items-center gap-2 min-h-[48px] py-3 px-3"
          >
            <Wrench className="size-4 text-orange-600 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Tools</span>
              <span className="text-xs text-muted-foreground">Execute MCP tools</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {isFileUploadAvailable ? (
            <FileUpload
              onFilesAdded={onFileUpload}
              multiple
              disabled={!isUserAuthenticated}
              accept=".txt,.md,application/pdf,image/jpeg,image/png,image/gif,image/webp,image/svg,image/heic,image/heif"
            >
              <FileUploadTrigger asChild>
                <DropdownMenuItem 
                  className="flex items-center gap-2 min-h-[48px] py-3 px-3"
                  onSelect={(e) => e.preventDefault()}
                >
                  <File className="size-4 text-indigo-600 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium">Files</span>
                    <span className="text-xs text-muted-foreground">Upload documents & images</span>
                  </div>
                </DropdownMenuItem>
              </FileUploadTrigger>
              <FileUploadContent>
                <div className="border-input bg-background flex flex-col items-center rounded-lg border border-dashed p-8">
                  <FileArrowUp className="text-muted-foreground size-8" />
                  <span className="mt-4 mb-1 text-lg font-medium">Drop files here</span>
                  <span className="text-muted-foreground text-sm">
                    Drop any files here to add to the conversation
                  </span>
                </div>
              </FileUploadContent>
            </FileUpload>
          ) : (
            <DropdownMenuItem disabled className="flex items-center gap-2 min-h-[48px] py-3 px-3">
              <File className="size-4 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-400">Files</span>
                <span className="text-xs text-muted-foreground">Model doesn&apos;t support files</span>
              </div>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={() => handleSectionSelect('urls')}
            className="flex items-center gap-2 min-h-[48px] py-3 px-3"
          >
            <Link className="size-4 text-cyan-600 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">URLs</span>
              <span className="text-xs text-muted-foreground">Fetch web content</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 