import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { promptService, previewService, handleApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { Paperclip } from 'lucide-react';
import { FilePreview } from './file-preview';

interface LinkPreview {
    title: string;
    description: string;
    image?: string;
    favicon?: string;
    siteName?: string;
}

interface EnhancePromptResponse {
    enhancedPrompt: string;
}

interface ApiErrorResponse {
    message: string;
}

/**
 * Props for the MessageInput component
 */
interface MessageInputProps {
    /** The current value of the input */
    value: string;  
    /** Callback when the input value changes */
    onChange: (value: string) => void; // eslint-disable-line no-unused-vars
    /** Callback when the message is submitted */
    onSubmit: (value: string, files: File[]) => void; // eslint-disable-line no-unused-vars
    /** Optional callback when files are attached */
    onAttach?: (files: File[]) => void; // eslint-disable-line no-unused-vars
    /** Optional CSS class name */
    className?: string;
    /** Whether the message is currently being sent */
    isSending?: boolean;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Placeholder text for the input */
    placeholder?: string;
}

/**
 * A modern, refined message input component with file upload support, prompt enhancement,
 * and link preview capabilities
 */
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
    const [isEnhancing, setIsEnhancing] = React.useState(false);
    const [linkPreview, setLinkPreview] = React.useState<LinkPreview | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [files, setFiles] = React.useState<File[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        // Check for URLs when content changes
        const urlMatch = e.target.value.match(/https?:\/\/[^\s]+/);
        if (urlMatch && !isLoadingPreview) {
            void handleLinkPreview(urlMatch[0]);
        } else if (!urlMatch) {
            setLinkPreview(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!value.trim() && files.length === 0) return;
        onSubmit(value, files);
        setFiles([]);
        setLinkPreview(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            const newFiles = Array.from(selectedFiles);
            setFiles(prev => [...prev, ...newFiles]);
            if (onAttach) {
                onAttach(newFiles);
            }
        }
    };

    const handleRemoveFile = (file: File) => {
        setFiles(prev => prev.filter(f => f !== file));
    };

    const handleEnhancePrompt = async () => {
        if (!value.trim()) return;
        
        setIsEnhancing(true);
        try {
            const response = await promptService.enhancePrompt({
                prompt: value
            }) as EnhancePromptResponse;

            if (response.enhancedPrompt) {
                onChange(response.enhancedPrompt);
                toast({
                    title: "Prompt Enhanced",
                    description: "Your message has been enhanced for better AI interaction.",
                });
            }
        } catch (error) {
            const apiError = handleApiError(error) as ApiErrorResponse;
            toast({
                title: "Enhancement Failed",
                description: apiError.message || "Failed to enhance prompt",
                variant: "destructive",
            });
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleLinkPreview = async (url: string) => {
        setIsLoadingPreview(true);
        try {
            const response = await previewService.getLinkPreview({
                url
            });
            if (response) {
                setLinkPreview({
                    title: response.title || '',
                    description: response.description || '',
                    image: response.image,
                    favicon: response.favicon,
                    siteName: response.siteName
                });
            }
        } catch (error) {
            if (ApiError.isApiError(error)) {
                console.error('Failed to load link preview:', error.message);
            } else {
                console.error('Failed to load link preview:', error);
            }
            setLinkPreview(null);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {linkPreview && (
                <div className="flex items-center gap-2 rounded-md bg-muted p-2">
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
            <div className="flex items-end gap-2 p-4">
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
                    className="min-h-[80px] flex-1"
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