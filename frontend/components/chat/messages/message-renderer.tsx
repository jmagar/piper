"use client";

import * as React from 'react';
import { FileIcon, ImageIcon, FileTextIcon, FilmIcon, PackageIcon } from 'lucide-react';
import { ExtendedChatMessage } from '@/types/chat';

interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Renders a chat message based on its content type
 */
export function MessageRenderer({ message }: { message: ExtendedChatMessage }) {
  return messageRenderer(message);
}

/**
 * Render file attachments with appropriate icons based on file type
 */
function FileAttachmentRenderer({ file }: { file: FileAttachment }) {
  // Determine file type for icon selection
  const fileType = file.type || '';
  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');
  const isText = fileType.startsWith('text/') || fileType.includes('json') || fileType.includes('xml');
  
  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Determine icon based on file type
  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (isVideo) return <FilmIcon className="h-5 w-5 text-red-500" />;
    if (isText) return <FileTextIcon className="h-5 w-5 text-green-500" />;
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  };
  
  return (
    <a 
      href={file.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded-md border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors mb-2"
    >
      {getFileIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        {file.size && <p className="text-xs text-gray-500">{formatSize(file.size)}</p>}
      </div>
    </a>
  );
}

/**
 * Render multiple image attachments in a grid
 */
function ImageGridRenderer({ files }: { files: FileAttachment[] }) {
  const imageFiles = files.filter(file => file.type?.startsWith('image/'));
  
  if (imageFiles.length === 0) return null;
  
  return (
    <div className={`grid gap-2 mb-4 ${
      imageFiles.length === 1 ? 'grid-cols-1' : 
      imageFiles.length === 2 ? 'grid-cols-2' : 
      'grid-cols-3'
    }`}>
      {imageFiles.map(file => (
        <a 
          key={file.id} 
          href={file.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="relative aspect-square block overflow-hidden rounded-md border border-gray-200 dark:border-gray-700"
        >
          <img 
            src={file.url} 
            alt={file.name} 
            className="h-full w-full object-cover transition-all hover:scale-105"
          />
        </a>
      ))}
    </div>
  );
}

/**
 * Function to render message content based on its type and format
 */
export function messageRenderer(message: ExtendedChatMessage): React.ReactNode {
  const { content, type = 'text', status, role, metadata = {} } = message;
  
  // If content is empty, show a placeholder
  if (!content && type !== 'file-list') {
    return <em className="text-muted-foreground">Empty message</em>;
  }
  
  // File list handling
  if (type === 'file-list') {
    const files = metadata.files as FileAttachment[] || [];
    
    if (files.length === 0) {
      return <em className="text-muted-foreground">No files attached</em>;
    }
    
    // Extract images for grid display
    const imageFiles = files.filter(file => file.type?.startsWith('image/'));
    const otherFiles = files.filter(file => !file.type?.startsWith('image/'));
    
    return (
      <div>
        {content && (
          <div className="mb-4 whitespace-pre-wrap break-words">
            {content.split('\n').map((line, index) => 
              line.trim() ? (
                <p key={`p-${index}`} className="mb-2">
                  {line}
                </p>
              ) : (
                <br key={`br-${index}`} />
              )
            )}
          </div>
        )}
        
        {/* Display images in a grid if available */}
        {imageFiles.length > 0 && <ImageGridRenderer files={imageFiles} />}
        
        {/* Display other files in a list */}
        {otherFiles.map(file => (
          <FileAttachmentRenderer key={file.id} file={file} />
        ))}
      </div>
    );
  }
  
  // System messages get special styling
  if (type === 'system') {
    return (
      <div className="text-sm italic text-muted-foreground">
        {content}
      </div>
    );
  }
  
  // Error messages get error styling
  if (status === 'error') {
    return (
      <div className="text-sm text-red-500 dark:text-red-400">
        <p>Error: {content || 'An error occurred'}</p>
      </div>
    );
  }
  
  // For assistant messages, handle code blocks with basic regex
  if (role === 'assistant') {
    // Basic handling for code blocks with ```
    if (content.includes('```')) {
      const parts = content.split(/```([\w-]*)?/);
      return (
        <div>
          {parts.map((part, index) => {
            if (index % 2 === 0) {
              // Regular text, split into paragraphs
              return part.split('\n').map((line, lineIndex) => 
                line.trim() ? (
                  <p key={`p-${index}-${lineIndex}`} className="mb-2 whitespace-pre-wrap">
                    {line}
                  </p>
                ) : (
                  <br key={`br-${index}-${lineIndex}`} />
                )
              );
            } else {
              // Code block (odd indexes)
              return (
                <pre key={`code-${index}`} className="bg-gray-100 dark:bg-gray-800 p-3 rounded my-2 overflow-x-auto">
                  <code className="text-sm">{parts[index + 1]}</code>
                </pre>
              );
            }
          })}
        </div>
      );
    }
    
    // Handle bullet points with basic regex
    if (content.match(/^[-*]\s/m)) {
      return (
        <div>
          {content.split('\n').map((line, index) => {
            if (line.match(/^[-*]\s/)) {
              return (
                <div key={`li-${index}`} className="flex items-start mb-1">
                  <span className="mr-2">•</span>
                  <span>{line.replace(/^[-*]\s/, '')}</span>
                </div>
              );
            }
            return line.trim() ? (
              <p key={`p-${index}`} className="mb-2 whitespace-pre-wrap">
                {line}
              </p>
            ) : (
              <br key={`br-${index}`} />
            );
          })}
        </div>
      );
    }
  }
  
  // Default: just display the content with line breaks
  return (
    <div className="whitespace-pre-wrap break-words">
      {content.split('\n').map((line, index) => 
        line.trim() ? (
          <p key={`p-${index}`} className="mb-2">
            {line}
          </p>
        ) : (
          <br key={`br-${index}`} />
        )
      )}
    </div>
  );
} 