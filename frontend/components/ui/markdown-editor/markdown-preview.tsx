'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/**
 * Props for the MarkdownPreview component
 */
interface MarkdownPreviewProps {
  /** The markdown content to render */
  content: string;
  /** Optional CSS classes to apply to the preview container */
  className?: string;
  /** Optional height for the preview container */
  height?: string | number;
}

/**
 * Component for rendering markdown content with support for GFM
 * 
 * @example
 * ```tsx
 * <MarkdownPreview content="# Hello World" />
 * ```
 */
export function MarkdownPreview({
  content,
  className,
  height = 'auto',
}: MarkdownPreviewProps) {
  // Add custom styles for the markdown preview
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .markdown-preview {
        font-family: system-ui, -apple-system, sans-serif;
      }
      .markdown-preview h1, 
      .markdown-preview h2, 
      .markdown-preview h3, 
      .markdown-preview h4, 
      .markdown-preview h5, 
      .markdown-preview h6 {
        font-weight: 600;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        line-height: 1.25;
      }
      .markdown-preview h1 { font-size: 1.75rem; }
      .markdown-preview h2 { font-size: 1.5rem; }
      .markdown-preview h3 { font-size: 1.25rem; }
      .markdown-preview h4 { font-size: 1.1rem; }
      .markdown-preview p, 
      .markdown-preview ul, 
      .markdown-preview ol, 
      .markdown-preview blockquote {
        margin-top: 0.75em;
        margin-bottom: 0.75em;
      }
      .markdown-preview code {
        font-family: monospace;
        font-size: 0.9em;
        background-color: hsla(var(--muted), 0.4);
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }
      .markdown-preview pre {
        background-color: hsla(var(--muted), 0.6);
        padding: 1em;
        border-radius: 4px;
        overflow-x: auto;
        margin: 1em 0;
      }
      .markdown-preview pre code {
        background-color: transparent;
        padding: 0;
        font-size: 0.9em;
      }
      .markdown-preview a {
        color: hsl(var(--primary));
        text-decoration: underline;
      }
      .markdown-preview blockquote {
        border-left: 4px solid hsl(var(--border));
        padding-left: 1em;
        font-style: italic;
        color: hsl(var(--muted-foreground));
      }
      .markdown-preview hr {
        border: none;
        border-top: 1px solid hsl(var(--border));
        margin: 1.5em 0;
      }
      .markdown-preview ul, 
      .markdown-preview ol {
        padding-left: 1.5em;
      }
      .markdown-preview table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      .markdown-preview th {
        border: 1px solid hsl(var(--border));
        padding: 0.5em;
        background-color: hsla(var(--muted), 0.4);
        font-weight: 600;
        text-align: left;
      }
      .markdown-preview td {
        border: 1px solid hsl(var(--border));
        padding: 0.5em;
      }
      .markdown-preview img {
        max-width: 100%;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const containerStyle = React.useMemo(() => {
    return {
      height: typeof height === 'number' ? `${height}px` : height
    };
  }, [height]);

  return (
    <ScrollArea className={cn('relative', className)} style={containerStyle}>
      <div className="markdown-preview p-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
        >
          {content || '*No content to preview*'}
        </ReactMarkdown>
      </div>
    </ScrollArea>
  );
} 