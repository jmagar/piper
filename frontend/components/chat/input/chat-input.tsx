"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  disabled?: boolean;
  onSendMessage: (content: string) => void;
  onRegenerateMessage?: () => void;
}

/**
 * Chat Input component
 * Handles text input for sending messages
 */
export function ChatInput({
  disabled = false,
  onSendMessage,
  onRegenerateMessage
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize the textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);
  
  // Submit message when pressing Enter (without Shift)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    
    onSendMessage(input);
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            className="min-h-[40px] max-h-[200px] pr-12 resize-none"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="absolute right-1 bottom-1"
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        
        {onRegenerateMessage && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onRegenerateMessage}
            disabled={disabled}
            title="Regenerate response"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 