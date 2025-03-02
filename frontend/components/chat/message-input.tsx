"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SendIcon, Paperclip, Smile, Terminal, Sparkles } from "lucide-react";

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  showFileUpload?: boolean;
  showEmojiPicker?: boolean;
  showCommandPalette?: boolean;
  showPromptEnhance?: boolean;
  className?: string;
}

/**
 * Message input component with typing area and action buttons
 * Includes support for file uploads, emoji picker, and command palette
 */
export function MessageInput({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  showFileUpload = true,
  showEmojiPicker = true,
  showCommandPalette = true,
  showPromptEnhance = true,
  className,
}: MessageInputProps) {
  const [isSending, setIsSending] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea based on content
  React.useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    
    // Reset height to measure actual content height
    textarea.style.height = "auto";
    // Set new height based on scroll height (with min and max)
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 24), 200)}px`;
  }, [value]);
  
  // Handle sending the message
  const handleSend = async () => {
    if (!value.trim() || disabled || isSending) return;
    
    try {
      setIsSending(true);
      await onSend(value);
      // Focus the input after sending
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle prompt enhancement
  const enhancePrompt = () => {
    if (!value.trim() || disabled) return;
    
    // Add prefix for prompt enhancement
    const enhancedPrompt = `Enhance this prompt: ${value.trim()}`;
    onChange(enhancedPrompt);
    
    // Focus back on the input
    inputRef.current?.focus();
  };
  
  // Placeholder components for advanced features
  // In a real implementation, these would be actual components
  const FileUploadButton = showFileUpload ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className="h-9 w-9 rounded-full"
      aria-label="Attach file"
      title="Attach file"
      onClick={() => console.log("File upload clicked")}
    >
      <Paperclip className="h-5 w-5" />
    </Button>
  ) : null;
  
  const EmojiPickerButton = showEmojiPicker ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className="h-9 w-9 rounded-full"
      aria-label="Insert emoji"
      title="Insert emoji"
      onClick={() => console.log("Emoji picker clicked")}
    >
      <Smile className="h-5 w-5" />
    </Button>
  ) : null;
  
  const CommandPaletteButton = showCommandPalette ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className="h-9 w-9 rounded-full"
      aria-label="Use commands"
      title="Use commands"
      onClick={() => console.log("Command palette clicked")}
    >
      <Terminal className="h-5 w-5" />
    </Button>
  ) : null;
  
  const PromptEnhanceButton = showPromptEnhance ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled || !value.trim()}
      className={cn(
        "h-9 w-9 rounded-full",
        value.trim() ? "text-primary hover:text-primary-emphasis" : "text-muted-foreground"
      )}
      aria-label="Enhance prompt"
      title="Enhance this prompt with AI"
      onClick={enhancePrompt}
    >
      <Sparkles className="h-5 w-5" />
    </Button>
  ) : null;
  
  return (
    <div
      className={cn(
        "relative flex w-full items-end gap-1.5 rounded-lg border bg-background p-2",
        disabled && "opacity-60",
        className
      )}
    >
      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        {FileUploadButton}
        {EmojiPickerButton}
        {CommandPaletteButton}
      </div>
      
      {/* Text input */}
      <div className="relative flex-1">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex w-full resize-none bg-transparent px-2 py-1.5",
            "text-sm focus-visible:outline-none disabled:cursor-not-allowed",
            "min-h-[40px] max-h-[200px] overflow-y-auto scrollbar-thin",
            "placeholder:text-muted-foreground"
          )}
        />
      </div>
      
      {/* Prompt enhance button - positioned before send button */}
      {PromptEnhanceButton}
      
      {/* Send button */}
      <Button
        type="submit"
        size="icon"
        disabled={!value.trim() || disabled || isSending}
        className={cn(
          "h-9 w-9 shrink-0 rounded-full",
          "transition-opacity",
          !value.trim() && "opacity-50"
        )}
        onClick={handleSend}
        aria-label="Send message"
      >
        <SendIcon className="h-4 w-4" />
      </Button>
    </div>
  );
} 