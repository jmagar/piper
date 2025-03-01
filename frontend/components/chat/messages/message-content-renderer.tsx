"use client";

import * as React from 'react';

/**
 * Renders message content with support for markdown-like syntax
 * Handles code blocks, lists, and regular text
 * 
 * @param content - The message content to render
 * @param isUserMessage - Whether the message is from the user (affects styling)
 */
interface MessageContentRendererProps {
  content: string;
  isUserMessage: boolean;
}

export function MessageContentRenderer({ content, isUserMessage }: MessageContentRendererProps) {
  // If the content contains markdown-like syntax, handle it specially
  if (content.includes('```') || content.includes('- ') || content.includes('* ')) {
    // Basic handling for code blocks
    const formattedContent = content
      .split('```')
      .map((part, index) => {
        // Every odd index is a code block
        if (index % 2 === 1) {
          // Extract language if specified
          const lines = part.split('\n');
          const language = lines[0]?.trim() || '';
          const code = lines.slice(1).join('\n').trim();
          
          return (
            <div key={index} className="my-2 rounded overflow-hidden">
              {language && (
                <div className="bg-gray-700 text-gray-300 text-xs px-3 py-1">
                  {language}
                </div>
              )}
              <pre className="p-3 bg-gray-800 text-gray-100 overflow-x-auto">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        
        // Handle lists and paragraphs in regular text
        return (
          <div key={index}>
            {part.split('\n').map((line, lineIndex) => {
              if (line?.trim()?.startsWith('- ') || line?.trim()?.startsWith('* ')) {
                return (
                  <div key={`list-${lineIndex}`} className="ml-5 flex">
                    <span className="mr-2">•</span>
                    <span>{line.trim().substring(2)}</span>
                  </div>
                );
              }
              
              return line?.trim() ? (
                <p key={`p-${lineIndex}`} className="mb-2">
                  {line}
                </p>
              ) : (
                <div key={`space-${lineIndex}`} className="h-2" />
              );
            })}
          </div>
        );
      });
      
    return (
      <div className={isUserMessage ? 'text-white' : 'text-gray-900 dark:text-gray-100'}>
        {formattedContent}
      </div>
    );
  }
  
  // Simple text handling for non-markdown content
  return (
    <div className={isUserMessage ? 'text-white' : 'text-gray-900 dark:text-gray-100'}>
      {content.split('\n').map((line, i) => 
        line.trim() === '' ? 
          <div key={`br-${i}`} className="h-2" /> : 
          <p key={`p-${i}`} className="mb-2">{line}</p>
      )}
    </div>
  );
} 