'use client';

import * as React from 'react';
import { Wrench, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ExtendedChatMessage } from '@/types/chat';
import { useMarkdown } from '@/hooks/use-markdown';
import {
    baseProseClasses,
    proseSpacingClasses,
    proseCodeClasses,
    proseListClasses,
    userProseClasses,
    messageContainerClasses
} from './message-styles';

interface MessageContentProps {
    message: ExtendedChatMessage;
    isUser: boolean;
    isSystem: boolean;
    isAssistant: boolean;
}

/**
 * Formats potential JSON strings for better readability
 * Removes raw JSON formatting that might appear in responses
 */
const formatContent = (content: string): string => {
    if (!content) return '';
    
    // Replace JSON-like patterns to make them more readable
    let formattedContent = content;
    
    // Try to detect JSON objects and arrays to format them
    const jsonObjectRegex = /\{(?:[^{}]|\{[^{}]*\})*\}/g;
    const jsonArrayRegex = /\[(?:[^[\]]|\[[^[\]]*\])*\]/g;
    
    // Helper to format detected JSON-like strings
    const formatJsonString = (jsonStr: string): string => {
        try {
            // Try to parse and format the JSON
            const parsed = JSON.parse(jsonStr);
            
            // For small objects, create a simple key-value display
            if (typeof parsed === 'object' && parsed !== null) {
                // Simple object representation
                if (Array.isArray(parsed)) {
                    return parsed.map(item => 
                        typeof item === 'object' ? '- ' + JSON.stringify(item) : '- ' + item
                    ).join('\n');
                } else {
                    return Object.entries(parsed)
                        .map(([key, value]) => `**${key}**: ${value}`)
                        .join('\n');
                }
            }
            return jsonStr;
        } catch (_) {
            // If it's not valid JSON, return as is
            return jsonStr;
        }
    };
    
    // First replace objects, then arrays
    formattedContent = formattedContent.replace(jsonObjectRegex, (match) => {
        // Only transform if it looks like a proper JSON object
        if (match.includes('"') || match.includes(':')) {
            return formatJsonString(match);
        }
        return match;
    });
    
    formattedContent = formattedContent.replace(jsonArrayRegex, (match) => {
        // Only transform if it looks like a proper JSON array
        if (match.includes('"') || match.includes(',')) {
            return formatJsonString(match);
        }
        return match;
    });
    
    return formattedContent;
};

export function MessageContent({ message, isUser, isSystem, isAssistant }: MessageContentProps) {
    const { renderMarkdown } = useMarkdown({
        allowHtml: false,
        enableSyntaxHighlight: true,
        enableGfm: true,
        showCopyButton: true
    });

    // Debug log to track message content
    React.useEffect(() => {
        console.log(`MessageContent rendering:
            - ID: ${message.id}
            - Status: ${message.status}
            - Content length: ${typeof message.content === 'string' ? message.content.length : 0}
            - Content source: ${message.metadata?.contentSource || 'direct'}
            - First 50 chars: ${typeof message.content === 'string' ? message.content.substring(0, 50) : 'non-string'}`);
    }, [message.id, message.status, message.content, message.metadata?.contentSource]);

    const containerClasses = cn(
        messageContainerClasses.base,
        {
            [messageContainerClasses.system]: isSystem,
            [messageContainerClasses.user]: isUser,
            [messageContainerClasses.assistant]: isAssistant,
            [messageContainerClasses.tool]: message.metadata?.toolOutput,
            [messageContainerClasses.streaming]: message.status === 'streaming' && isAssistant
        }
    );

    const proseClasses = cn(
        baseProseClasses,
        proseSpacingClasses,
        proseCodeClasses,
        proseListClasses,
        { [userProseClasses]: isUser }
    );

    // Check if a tool is currently being invoked
    const isInvokingTool = message.status === 'streaming' && 
                          message.metadata?.toolInvocation === true && 
                          isAssistant;

    // Display the tool invocation indicator
    if (isInvokingTool) {
        return (
            <div className={containerClasses}>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary border-b border-primary/20 pb-2 mb-2 bg-primary/5 p-2 rounded">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Invoking tool...</span>
                    </div>
                    <div className={proseClasses}>
                        {typeof message.content === 'string' && message.content.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                                {renderMarkdown(message.content)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (message.metadata?.toolOutput) {
        return (
            <div className={containerClasses}>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border/50 pb-2 mb-2">
                        <Wrench className="h-3 w-3" />
                        <span>Tool Output: {message.metadata.toolUsed?.name}</span>
                    </div>
                    <div className={proseClasses}>
                        <pre className="bg-muted/50 border border-border/50 rounded-md p-4 overflow-x-auto">
                            <code className="text-sm">
                                {typeof message.content === 'string' ? message.content : null}
                            </code>
                        </pre>
                    </div>
                </div>
            </div>
        );
    }

    // Extract content with fallback to prevent empty displays
    const rawContent = typeof message.content === 'string' && message.content.length > 0 
        ? message.content 
        : message.status === 'streaming' 
            ? 'Thinking...' 
            : 'No content available';
    
    // Apply formatting to improve readability 
    const displayContent = isAssistant 
        ? formatContent(rawContent) 
        : rawContent;

    return (
        <div className={containerClasses}>
            <div className={proseClasses}>
                <article>
                    {/* STREAMING: Only show status indicator when actively streaming AND is assistant */}
                    {message.status === 'streaming' && isAssistant && (
                        <div className="mb-2 text-xs rounded border px-2 py-1 text-primary/80 bg-primary/5 border-primary/20">
                            Streaming ({displayContent.length} chars)
                            <span className="inline-block w-1.5 h-3 bg-primary/50 ml-1 animate-pulse rounded-sm"></span>
                        </div>
                    )}
                    
                    {/* CONTENT: Always render markdown for the content */}
                    {renderMarkdown(displayContent)}
                </article>
            </div>
        </div>
    );
}
