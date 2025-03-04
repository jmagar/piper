"use client";

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, PaperclipIcon, XIcon, ImageIcon, FileIcon, Send, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';
import { toast } from '@/components/ui/use-toast';

interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string | undefined;
  file: File;
  uploading: boolean;
  progress?: number | undefined;
  error?: string | undefined;
}

/**
 * Props for the ChatInput component
 */
interface ChatInputProps {
  /**
   * Additional CSS classes to apply to the component
   */
  className?: string;
  
  /**
   * Placeholder text for the input field
   */
  placeholder?: string;
  
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  
  /**
   * Callback for when a message is sent
   * If not provided, will use the sendMessage from chat store
   */
  onSubmit?: (content: string, files?: FileUpload[]) => Promise<void>;
  
  /**
   * Callback for clearing the conversation
   * If not provided, will use clearMessages from chat store
   */
  onClear?: () => void;
  
  /**
   * Callback for regenerating the response
   */
  onRegenerate?: () => Promise<void>;
  
  /**
   * Callback for enhancing the prompt
   */
  onEnhancePrompt?: () => void;
  
  /**
   * Callback for when a key is pressed in the input field
   */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  
  /**
   * Maximum number of files that can be uploaded
   */
  maxFiles?: number;
  
  /**
   * Maximum size of files that can be uploaded (in bytes)
   */
  maxFileSize?: number;
  
  /**
   * Allowed file types
   */
  allowedFileTypes?: string[];
  
  /**
   * Whether to show the file upload button
   */
  showFileUpload?: boolean;
  
  /**
   * Whether to show the prompt enhance button
   */
  showPromptEnhance?: boolean;
}

/**
 * Input component for typing chat messages with send/clear/regenerate actions
 */
export function ChatInput({
  className,
  placeholder = 'Type your message...',
  disabled = false,
  onSubmit,
  onClear,
  onRegenerate,
  onEnhancePrompt,
  onKeyDown,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFileTypes = ['image/*', 'application/pdf', 'text/*', 'application/json'],
  showFileUpload = false,
  showPromptEnhance = false,
}: ChatInputProps) {
  // Get chat state from store
  const {
    input,
    setInput,
    isSending,
    messages,
    clearMessages: storeClearMessages
  } = useChatStore(state => ({
    input: state.input,
    setInput: state.setInput,
    isSending: state.isSending,
    messages: state.messages,
    clearMessages: state.clearMessages
  }));
  
  const [localInput, setLocalInput] = useState(input);
  const [inputError, setInputError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileUpload[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sync input from store to local state
  useEffect(() => {
    setLocalInput(input);
  }, [input]);
  
  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Function to adjust height
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    };
    
    adjustHeight();
    
    // Set up a resize observer
    const resizeObserver = new ResizeObserver(adjustHeight);
    resizeObserver.observe(textarea);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [localInput]);
  
  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInput(e.target.value);
    setInput(e.target.value);
    setInputError(null);
  }, [setInput]);
  
  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!localInput.trim() && files.length === 0) {
      setInputError('Please enter a message or attach a file');
      return;
    }
    
    if (disabled || isSending) return;
    
    try {
      setInputError(null);
      
      // Filter out files with errors or still uploading
      const readyFiles = files.filter(f => !f.error && !f.uploading);
      
      // Submit form
      if (onSubmit) {
        await onSubmit(localInput, readyFiles.length > 0 ? readyFiles : undefined);
      } else {
        // No onSubmit provided, log a warning
        console.warn("No onSubmit function provided to ChatInput");
      }
      
      // Clear input after successful submission
      setLocalInput('');
      setInput('');
      setFiles([]);
      
      // Focus back on textarea
      if (textareaRef.current && textareaRef.current.focus) {
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputError(`Failed to send message: ${(error as Error).message}`);
      toast({
        title: 'Error',
        description: `Failed to send message: ${(error as Error).message}`,
        type: 'error'
      });
    }
  }, [localInput, files, disabled, isSending, onSubmit, setInput, toast]);
  
  // Handle clear conversation
  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    } else {
      storeClearMessages();
    }
    
    setLocalInput('');
    setInput('');
    setFiles([]);
    textareaRef.current?.focus();
    
    toast({
      title: 'Conversation cleared',
      description: 'All messages have been removed',
      duration: 3000
    });
  }, [onClear, storeClearMessages, setInput, toast]);
  
  // Handle message regeneration
  const handleRegenerate = useCallback(async () => {
    if (disabled || isSending) return;
    
    if (onRegenerate) {
      try {
        await onRegenerate();
      } catch (error) {
        console.error('Error regenerating response:', error);
        toast({
          title: 'Error',
          description: `Failed to regenerate response: ${(error as Error).message}`,
          type: 'error'
        });
      }
    } else {
      toast({
        title: 'Not implemented',
        description: 'Regenerate functionality not provided',
        type: 'error'
      });
    }
  }, [disabled, isSending, onRegenerate, toast]);
  
  // Handle prompt enhancement
  const handleEnhancePrompt = useCallback(() => {
    if (!localInput.trim() || disabled) return;
    
    if (onEnhancePrompt) {
      onEnhancePrompt();
    } else {
      // Add prefix for prompt enhancement
      const enhancedPrompt = `Enhance this prompt: ${localInput.trim()}`;
      setLocalInput(enhancedPrompt);
      setInput(enhancedPrompt);
    }
    
    // Focus back on the input
    textareaRef.current?.focus();
  }, [localInput, disabled, onEnhancePrompt, setInput]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow custom key handling
    if (onKeyDown) {
      onKeyDown(e);
      if (e.defaultPrevented) return;
    }
    
    // Submit on Enter (not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, onKeyDown]);
  
  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputError(null);
    
    if (!e.target.files?.length) return;
    
    // Check file count
    if (files.length + e.target.files.length > maxFiles) {
      setInputError(`You can only upload a maximum of ${maxFiles} files`);
      return;
    }
    
    // Process each file
    Array.from(e.target.files).forEach(file => {
      // Check file size
      if (file.size > maxFileSize) {
        setInputError(`File ${file.name} exceeds the maximum file size of ${maxFileSize / (1024 * 1024)}MB`);
        return;
      }
      
      // Create a new file upload object
      const newFile: FileUpload = {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        uploading: true
      };
      
      setFiles(prev => [...prev, newFile]);
      
      // Create a preview URL for images
      if (file.type.startsWith('image/')) {
        newFile.url = URL.createObjectURL(file);
        setFiles(prev => 
          prev.map(f => f.id === newFile.id ? { ...f, url: newFile.url } : f)
        );
      }
      
      // Simulate upload progress (this would be replaced with actual upload logic)
      simulateFileUpload(newFile);
    });
    
    // Reset file input
    if (e.target && e.target.value) {
      e.target.value = '';
    }
  }, [files, maxFiles, maxFileSize]);
  
  // Simulate file upload progress
  const simulateFileUpload = useCallback((file: FileUpload) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      
      if (progress >= 100) {
        clearInterval(interval);
        setFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, uploading: false, progress: 100 } : f)
        );
      } else {
        setFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, progress: Math.min(progress, 99) } : f)
        );
      }
    }, 300);
  }, []);
  
  // Handle file removal
  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      
      // Revoke object URL to prevent memory leaks
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      
      return prev.filter(f => f.id !== id);
    });
  }, []);
  
  // Trigger file input click
  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  // If message list is empty, don't show clear/regen buttons
  const hasMessages = messages && messages.length > 0;
  const isLastMessageFromAssistant = 
    messages && messages.length > 0 && 
    messages[messages.length - 1]?.role === 'assistant';
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className={cn('flex flex-col space-y-2', className)}>
      {/* File preview area */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map(file => (
            <div 
              key={file.id}
              className="relative bg-gray-100 dark:bg-gray-800 rounded p-2 pr-8 flex items-center gap-2"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="h-4 w-4 text-blue-500" />
              ) : (
                <FileIcon className="h-4 w-4 text-gray-500" />
              )}
              
              <div className="text-xs max-w-[150px] truncate">{file.name}</div>
              
              {file.uploading && (
                <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300" style={{ width: `${file.progress || 0}%` }} />
              )}
              
              <button
                type="button"
                onClick={() => handleRemoveFile(file.id)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Input area */}
      <div className="relative flex max-h-60">
        <Textarea
          ref={textareaRef}
          value={localInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className={cn(
            "min-h-12 resize-none pr-12 rounded-md",
            inputError && "border-red-500 focus-visible:ring-red-500"
          )}
          rows={1}
        />
        
        {/* Action buttons */}
        <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
          {showPromptEnhance && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={!localInput.trim() || disabled}
                    onClick={handleEnhancePrompt}
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enhance with AI</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {showFileUpload && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled || files.length >= maxFiles}
                    onClick={handleAttachClick}
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <PaperclipIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach files</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button 
            type="submit"
            size="icon" 
            disabled={(!localInput.trim() && files.length === 0) || disabled || isSending}
            onClick={() => handleSubmit()}
            className="h-8 w-8"
          >
            {isSending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
      
      {/* Error message */}
      {inputError && (
        <div className="text-sm text-red-500 mt-1">{inputError}</div>
      )}
      
      {/* Hidden file input */}
      {showFileUpload && (
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          multiple
          accept={allowedFileTypes.join(',')}
        />
      )}
      
      {/* Action buttons when there are messages */}
      {hasMessages && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 px-2 text-xs"
            disabled={disabled || isSending}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear chat
          </Button>
          
          {isLastMessageFromAssistant && onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              className="h-8 px-2 text-xs"
              disabled={disabled || isSending}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Regenerate
            </Button>
          )}
        </div>
      )}
    </form>
  );
}