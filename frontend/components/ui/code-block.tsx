"use client";

import * as React from 'react';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  /**
   * The programming language of the code
   */
  language: string;
  
  /**
   * The code content to display
   */
  value: string;
  
  /**
   * Whether to show a copy button
   */
  copyable?: boolean;
  
  /**
   * Additional CSS classes to apply to the component
   */
  className?: string;
}

/**
 * A component for displaying code with syntax highlighting and a copy button
 */
export function CodeBlock({
  language,
  value,
  copyable = true,
  className,
}: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  
  // Handle copying code to clipboard
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  return (
    <div className={cn("relative group my-4 rounded-md overflow-hidden", className)}>
      {/* Language label */}
      {language && language !== 'plaintext' && (
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-2 py-1 rounded-bl-md z-10">
          {language}
        </div>
      )}
      
      {/* Copy button */}
      {copyable && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded bg-gray-700/50 hover:bg-gray-700/70 text-white transition-colors duration-200 opacity-0 group-hover:opacity-100"
          aria-label={isCopied ? "Copied!" : "Copy code"}
        >
          {isCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      )}
      
      {/* Syntax highlighter */}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          lineHeight: 1.5,
        }}
        wrapLongLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
} 