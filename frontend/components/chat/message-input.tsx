"use client"

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { promptService } from '@/lib/api-client';
import { handleApiError } from '@/lib/errors';
import { Paperclip } from 'lucide-react';
import { FilePreview } from './file-preview';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string, files: File[]) => void;
  onAttach?: (files: File[]) => void;
  className?: string;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  onAttach,
  className,
  isSending = false,
  disabled = false,
  placeholder = "Type a message..."
}: MessageInputProps) {
  const { toast } = useToast();
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [linkPreview, setLinkPreview] = useState<{
    title: string;
    description: string;
    image?: string;
    favicon?: string;
    siteName?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!value.trim() && files.length === 0) || isSending || disabled) return;
    onSubmit(value, files);
    setFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
    onAttach?.(selectedFiles);
  };

  const handleRemoveFile = (file: File) => {
    setFiles(prev => prev.filter(f => f !== file));
  };

  const handleEnhancePrompt = async () => {
    if (!value.trim()) return;
    
    setIsEnhancing(true);
    try {
      const response = await promptService.enhancePrompt({
        requestBody: {
          prompt: value
        }
      });

      if (response.enhancedPrompt) {
        onChange(response.enhancedPrompt);
        toast({
          title: "Prompt Enhanced",
          description: "Your message has been enhanced for better AI interaction.",
        });
      }
    } catch (error) {
      const apiError = handleApiError(error);
      toast({
        title: "Enhancement Failed",
        description: apiError.message,
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {linkPreview && (
        <div className="flex items-center gap-2 rounded-md bg-[hsl(var(--muted))] p-2">
          {linkPreview.image && (
            <Image 
              src={linkPreview.image} 
              alt={linkPreview.title} 
              width={48}
              height={48}
              className="rounded object-cover"
            />
          )}
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-medium">{linkPreview.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {linkPreview.description}
            </p>
          </div>
          <Button
            onClick={() => setLinkPreview(null)}
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
          >
            <span>×</span>
            <span className="sr-only">Remove preview</span>
          </Button>
        </div>
      )}
      {files.length > 0 && (
        <FilePreview
          files={files}
          onRemove={handleRemoveFile}
          className="px-4"
        />
      )}
      <div className="flex items-end gap-2 p-4 bg-[hsl(var(--background))]">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          size="icon"
          variant="ghost"
          className="h-10 w-10 shrink-0 rounded-full"
        >
          <Paperclip className="h-5 w-5" />
          <span className="sr-only">Attach files</span>
        </Button>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[80px] flex-1 bg-[hsl(var(--background))]"
          disabled={disabled}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => void handleEnhancePrompt()}
            disabled={disabled || isSending || !value.trim() || isEnhancing}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
          >
            {isEnhancing ? (
              <span className="loading loading-spinner" />
            ) : (
              <span>✨</span>
            )}
            <span className="sr-only">Enhance prompt</span>
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={(!value.trim() && files.length === 0) || isSending || disabled}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
          >
            <span>➤</span>
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        multiple
        className="hidden"
        id="file-upload"
      />
    </div>
  );
}