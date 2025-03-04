"use client";

import React from 'react';
import { ExtendedChatMessage } from '@/types/chat';
import { AlertTriangle, FileWarning, Code, FileCode, FileText } from 'lucide-react';
import { validateMessage } from '@/lib/chat/message-validator';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { traceMessage } from '../chat-debug';

// For tracing message rendering lifecycle
const DEBUG_RENDER = process.env.NODE_ENV === 'development';

// Content types that can be rendered
type ContentType = 'text' | 'code' | 'file-list' | 'system' | 'stream-chunk' | 'error';

/**
 * Validates a message before rendering to prevent errors
 * @param message The message to validate
 * @returns Validation result with any issues
 */
// function validateMessageForRendering(message: any): { 
//   isValid: boolean;
//   issues: string[];
//   contentType: ContentType;
// } {
//   // Function body removed to save space
// }

/**
 * Props for the MessageRenderer component
 */
interface MessageRendererProps {
  message: ExtendedChatMessage;
}

/**
 * Message Renderer component
 * Renders different types of message content
 */
export function MessageRenderer({ message }: MessageRendererProps) {
  const { content, type = 'text' } = message;
  
  // If message has no content, return empty
  if (!content) {
    return (
      <div className="text-yellow-600 text-sm">
        <AlertTriangle className="inline-block mr-1 h-4 w-4" />
        <span>Empty message content</span>
      </div>
    );
  }
  
  // Render based on message type
  switch (type) {
    case 'code':
      return (
        <pre className="text-sm bg-gray-800 text-gray-200 p-2 rounded overflow-auto">
          <code>{content}</code>
        </pre>
      );
      
    case 'system':
      return (
        <div className="text-sm italic text-gray-500">
          {content}
        </div>
      );
      
    case 'stream-chunk':
      return (
        <span className="text-sm">{content}</span>
      );
    
    case 'file-list':
      try {
        const files = JSON.parse(content);
        return (
          <div className="text-sm">
            <p className="font-medium mb-1">Files:</p>
            <ul className="list-disc pl-5">
              {files.map((file: any, index: number) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        );
      } catch (error) {
        console.error('Failed to parse file list:', error);
        return <div className="text-sm">{content}</div>;
      }
      
    case 'text':
    default:
      return (
        <div className="text-sm whitespace-pre-wrap">{content}</div>
      );
  }
}

/**
 * Renders a standard text message
 * @deprecated This function is no longer used
 */
// function renderTextContent(message: ExtendedChatMessage, className?: string) {
//   // Function body removed to save space
// }

/**
 * Renders an error message
 * @deprecated This function is no longer used
 */
// function renderErrorMessage(message: ExtendedChatMessage, className?: string) {
//   // Function body removed to save space
// }

/**
 * Renders code content
 * @deprecated This function is no longer used
 */
// function renderCodeContent(message: ExtendedChatMessage, className?: string) {
//   // Function body removed to save space
// }

/**
 * Renders file list content
 * @deprecated This function is no longer used
 */
// function renderFileListContent(message: ExtendedChatMessage, className?: string) {
//   // Function body removed to save space
// }

/**
 * Renders system message
 * @deprecated This function is no longer used
 */
// function renderSystemMessage(message: ExtendedChatMessage, className?: string) {
//   // Function body removed to save space
// }

/**
 * Formats file size to human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
} 