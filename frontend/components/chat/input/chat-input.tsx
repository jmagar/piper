"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Sparkles, PaperclipIcon, XIcon, ImageIcon, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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
   * Callback for when a message is sent
   */
  onSend: (content: string, files?: FileUpload[]) => void;
  
  /**
   * Reference to the textarea element
   */
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  
  /**
   * Whether the input is disabled
   */
  isDisabled?: boolean;
  
  /**
   * Callback for enhancing the prompt
   */
  onEnhancePrompt?: () => void;
  
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
}

/**
 * Component for chat input field with file upload support
 */
export function ChatInput({ 
  onSend, 
  inputRef, 
  isDisabled = false,
  onEnhancePrompt,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFileTypes = ['image/*', 'application/pdf', 'text/*', 'application/json']
}: ChatInputProps) {
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    
    // Validate input is available
    if (!inputRef.current) {
      console.error("Input reference is not available");
      return;
    }
    
    const content = inputRef.current.value.trim();
    
    // Validate content or files are present
    if (!content && files.length === 0) {
      setInputError("Please enter a message or attach a file");
      return;
    }
    
    console.log("Submitting message:", content, "with files:", files);
    
    try {
      // Filter out any files that are still uploading
      const readyFiles = files.filter(f => !f.uploading && !f.error);
      
      onSend(content, readyFiles.length > 0 ? readyFiles : undefined);
      
      // Clear input after sending
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.style.height = "60px"; // Reset height
      }
      
      // Clear files
      setFiles([]);
    } catch (error) {
      console.error("Error in chat submit handler:", error);
      setInputError("Failed to send message");
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  // Simulate file upload progress
  const simulateFileUpload = (file: FileUpload) => {
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
  };

  // Handle file removal
  const handleRemoveFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      
      // Revoke object URL to prevent memory leaks
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      
      return prev.filter(f => f.id !== id);
    });
  };

  // Trigger file input click
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // Handle textarea auto-resize
  const autoResizeTextarea = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  };

  // Listen for input changes to resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.addEventListener('input', autoResizeTextarea);
      return () => textarea.removeEventListener('input', autoResizeTextarea);
    }
  }, [inputRef]);

  return (
    <form onSubmit={handleSubmit} className="border-t dark:border-gray-700 p-4 bg-white dark:bg-gray-900 sticky bottom-0 left-0 right-0 z-10">
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
      
      {inputError && (
        <div className="mb-2 text-sm text-red-600 dark:text-red-400">{inputError}</div>
      )}
      
      <div className="flex gap-2 items-end">
        <div className="flex-1 flex flex-col">
          <div className="relative">
            <textarea
              ref={inputRef}
              placeholder="Type your message..."
              className="w-full p-3 border rounded-md resize-none min-h-[60px] max-h-[150px] pr-16 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              disabled={isDisabled}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            
            <div className="absolute right-2 bottom-2 flex gap-1">
              {/* File attachment button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleAttachClick}
                      disabled={isDisabled || files.length >= maxFiles}
                      className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 disabled:opacity-50"
                      title="Attach file"
                    >
                      <PaperclipIcon size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {files.length >= maxFiles 
                      ? `Maximum ${maxFiles} files allowed` 
                      : "Attach file"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={allowedFileTypes.join(',')}
                className="hidden"
                onChange={handleFileSelect}
                disabled={isDisabled || files.length >= maxFiles}
              />
              
              {/* Prompt enhancer button */}
              {onEnhancePrompt && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={onEnhancePrompt}
                        disabled={isDisabled}
                        className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 disabled:opacity-50 ml-1"
                        title="Enhance prompt"
                      >
                        <Sparkles size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Improve your prompt
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Press Enter to send, Shift+Enter for new line
            {files.length > 0 && ` • ${files.length} file${files.length > 1 ? 's' : ''} attached`}
          </div>
        </div>
        
        <Button
          type="submit"
          disabled={isDisabled || (files.some(f => f.uploading) && !inputRef.current?.value.trim())}
          className="px-4 py-3 h-[60px]"
          variant="default"
        >
          {files.some(f => f.uploading) ? "Uploading..." : "Send"}
        </Button>
      </div>
    </form>
  );
} 