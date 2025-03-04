"use client";

import React from 'react';
import { ExtendedChatMessage } from '@/types/chat';
import { AlertTriangle } from 'lucide-react';
import { traceMessage } from '../chat-debug';

// For tracing message rendering lifecycle
const DEBUG_RENDER = process.env.NODE_ENV === 'development';

/**
 * Validates a message before rendering to prevent errors
 * @param message The message to validate
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
  
  // If message has no content or is empty after trimming, return empty message indicator
  if (!content || content.trim() === '') {
    return (
      <div className="text-yellow-600 text-sm">
        <AlertTriangle className="inline-block mr-1 h-4 w-4" />
        <span>Empty message content</span>
      </div>
    );
  }
  
  // Try to parse JSON content if it looks like JSON
  let parsedContent = content;
  if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      
      // Handle array of objects with text/content fields
      if (Array.isArray(parsed)) {
        // Extract and join all text content from the array
        parsedContent = parsed.map(item => {
          if (typeof item === 'string') return item;
          // Handle items with 'text' field (common in AI responses)
          if (item && item.text) return item.text;
          // Handle items with 'content' field
          if (item && item.content) return item.content;
          // Fallback to string representation
          return JSON.stringify(item);
        }).filter(Boolean).join('\n');
      } 
      // Handle single object with text field
      else if (parsed && typeof parsed === 'object') {
        // First try common message format patterns
        if (parsed.text) parsedContent = parsed.text;
        else if (parsed.content) parsedContent = parsed.content;
        // Handle nested content structures (e.g., {"index":0,"type":"text","text":"..."})
        else if (parsed.type === 'text' && parsed.text) parsedContent = parsed.text;
        // Fallback to original content if no recognizable pattern
        else parsedContent = JSON.stringify(parsed);

        // Log for diagnostic purposes in development
        if (DEBUG_RENDER) {
          traceMessage('message-renderer', 'parsed-json-object', { 
            original: content.substring(0, 100), 
            result: parsedContent.substring(0, 100) 
          });
        }
      }
    } catch (e) {
      // If parsing fails, use the original content
      if (DEBUG_RENDER) {
        const error = e as Error;
        console.warn('Failed to parse message content as JSON:', error);
        traceMessage('message-renderer', 'json-parse-error', { error: error.message });
      }
    }
  }
  
  // Render based on message type
  const renderContent = () => {
    switch (type) {
      case 'code':
        return (
          <pre className="text-sm bg-gray-800 text-gray-200 p-2 rounded overflow-auto">
            <code>{parsedContent}</code>
          </pre>
        );
        
      case 'system':
        return (
          <div className="text-sm italic text-gray-500">
            {parsedContent}
          </div>
        );
        
      case 'stream-chunk':
        return (
          <span className="text-sm">{parsedContent}</span>
        );
      
      case 'file-list':
        try {
          // Try to determine if content is already parsed
          const files = typeof content === 'string' ? JSON.parse(content) : content;
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
          return <div className="text-sm">{parsedContent}</div>;
        }
        
      case 'text':
      default:
        return (
          <div className="text-sm whitespace-pre-wrap">{parsedContent}</div>
        );
    }
  };

  // Render the message content based on its type
  return (
    <div className="message-content">
      {renderContent()}
    </div>
  );
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
// function formatFileSize(bytes: number): string {
//   if (bytes < 1024) return bytes + ' bytes';
//   else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
//   else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
//   else return (bytes / 1073741824).toFixed(1) + ' GB';
// }

/**
 * Render the message content based on its type
 */
export function renderMessageContent(message: ExtendedChatMessage) {
  const { content, type = 'text' } = message;
  
  // If message has no content or is empty after trimming, return empty message indicator
  if (!content || content.trim() === '') {
    return (
      <div className="text-yellow-600 text-sm">
        <AlertTriangle className="inline-block mr-1 h-4 w-4" />
        <span>Empty message content</span>
      </div>
    );
  }
  
  // Try to parse JSON content if it looks like JSON
  let parsedContent = content;
  if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      
      // Handle array of objects with text/content fields
      if (Array.isArray(parsed)) {
        // Extract and join all text content from the array
        parsedContent = parsed.map(item => {
          if (typeof item === 'string') return item;
          // Handle items with 'text' field (common in AI responses)
          if (item && item.text) return item.text;
          // Handle items with 'content' field
          if (item && item.content) return item.content;
          // Fallback to string representation
          return JSON.stringify(item);
        }).filter(Boolean).join('\n');
      } 
      // Handle single object with text field
      else if (parsed && typeof parsed === 'object') {
        // First try common message format patterns
        if (parsed.text) parsedContent = parsed.text;
        else if (parsed.content) parsedContent = parsed.content;
        // Handle nested content structures (e.g., {"index":0,"type":"text","text":"..."})
        else if (parsed.type === 'text' && parsed.text) parsedContent = parsed.text;
        // Fallback to original content if no recognizable pattern
        else parsedContent = JSON.stringify(parsed);

        // Log for diagnostic purposes in development
        if (DEBUG_RENDER) {
          traceMessage('message-renderer', 'parsed-json-object', { 
            original: content.substring(0, 100), 
            result: parsedContent.substring(0, 100) 
          });
        }
      }
    } catch (e) {
      // If parsing fails, use the original content
      if (DEBUG_RENDER) {
        const error = e as Error;
        console.warn('Failed to parse message content as JSON:', error);
        traceMessage('message-renderer', 'json-parse-error', { error: error.message });
      }
    }
  }
  
  // Render based on message type
  switch (type) {
    case 'code':
      return (
        <pre className="text-sm bg-gray-800 text-gray-200 p-2 rounded overflow-auto">
          <code>{parsedContent}</code>
        </pre>
      );
      
    case 'system':
      return (
        <div className="text-sm italic text-gray-500">
          {parsedContent}
        </div>
      );
      
    case 'stream-chunk':
      return (
        <span className="text-sm">{parsedContent}</span>
      );
    
    case 'file-list':
      try {
        // Try to determine if content is already parsed
        const files = typeof content === 'string' ? JSON.parse(content) : content;
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
        return <div className="text-sm">{parsedContent}</div>;
      }
      
    case 'text':
    default:
      return (
        <div className="text-sm whitespace-pre-wrap">{parsedContent}</div>
      );
  }
}

// Render the message content based on its type
export function renderMessageContentBasedOnType(message: ExtendedChatMessage) {
  const { content, type = 'text' } = message;
  
  // If message has no content or is empty after trimming, return empty message indicator
  if (!content || content.trim() === '') {
    return (
      <div className="text-yellow-600 text-sm">
        <AlertTriangle className="inline-block mr-1 h-4 w-4" />
        <span>Empty message content</span>
      </div>
    );
  }
  
  // Try to parse JSON content if it looks like JSON
  let parsedContent = content;
  if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      
      // Handle array of objects with text/content fields
      if (Array.isArray(parsed)) {
        // Extract and join all text content from the array
        parsedContent = parsed.map(item => {
          if (typeof item === 'string') return item;
          // Handle items with 'text' field (common in AI responses)
          if (item && item.text) return item.text;
          // Handle items with 'content' field
          if (item && item.content) return item.content;
          // Fallback to string representation
          return JSON.stringify(item);
        }).filter(Boolean).join('\n');
      } 
      // Handle single object with text field
      else if (parsed && typeof parsed === 'object') {
        // First try common message format patterns
        if (parsed.text) parsedContent = parsed.text;
        else if (parsed.content) parsedContent = parsed.content;
        // Handle nested content structures (e.g., {"index":0,"type":"text","text":"..."})
        else if (parsed.type === 'text' && parsed.text) parsedContent = parsed.text;
        // Fallback to original content if no recognizable pattern
        else parsedContent = JSON.stringify(parsed);

        // Log for diagnostic purposes in development
        if (DEBUG_RENDER) {
          traceMessage('message-renderer', 'parsed-json-object', { 
            original: content.substring(0, 100), 
            result: parsedContent.substring(0, 100) 
          });
        }
      }
    } catch (e) {
      // If parsing fails, use the original content
      if (DEBUG_RENDER) {
        const error = e as Error;
        console.warn('Failed to parse message content as JSON:', error);
        traceMessage('message-renderer', 'json-parse-error', { error: error.message });
      }
    }
  }
  
  // Render based on message type
  switch (type) {
    case 'code':
      return (
        <pre className="text-sm bg-gray-800 text-gray-200 p-2 rounded overflow-auto">
          <code>{parsedContent}</code>
        </pre>
      );
      
    case 'system':
      return (
        <div className="text-sm italic text-gray-500">
          {parsedContent}
        </div>
      );
      
    case 'stream-chunk':
      return (
        <span className="text-sm">{parsedContent}</span>
      );
    
    case 'file-list':
      try {
        // Try to determine if content is already parsed
        const files = typeof content === 'string' ? JSON.parse(content) : content;
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
        return <div className="text-sm">{parsedContent}</div>;
      }
      
    case 'text':
    default:
      return (
        <div className="text-sm whitespace-pre-wrap">{parsedContent}</div>
      );
  }
} 