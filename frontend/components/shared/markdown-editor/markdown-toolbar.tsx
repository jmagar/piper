'use client';

import * as React from 'react';
import { 
  Bold, 
  Italic, 
  Link, 
  List, 
  ListOrdered, 
  Code, 
  Image, 
  Quote, 
  Heading1, 
  Heading2, 
  Heading3,
  Braces,
  Table
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Props for the MarkdownToolbar component
 */
export interface MarkdownToolbarProps {
  /** Callback to apply formatting action */
  onAction: (type: string, customText?: string) => void;
  /** Optional CSS classes to add to the toolbar */
  className?: string;
  /** Whether to display the toolbar horizontally or vertically */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Toolbar component for markdown editing with formatting buttons
 * 
 * @example
 * ```tsx
 * <MarkdownToolbar onAction={(type, text) => console.log(type, text)} />
 * ```
 */
export function MarkdownToolbar({
  onAction,
  className,
  orientation = 'horizontal'
}: MarkdownToolbarProps) {
  return (
    <div className={cn(
      'flex gap-1 p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800',
      orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}>
      <TooltipProvider>
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('bold')}
                aria-label="Bold"
                className="h-8 w-8"
                type="button"
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Bold</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('italic')}
                aria-label="Italic"
                className="h-8 w-8"
                type="button"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Italic</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('code')}
                aria-label="Inline Code"
                className="h-8 w-8"
                type="button"
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Inline Code</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('heading')}
                aria-label="Heading 1"
                className="h-8 w-8"
                type="button"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Heading 1</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('heading2')}
                aria-label="Heading 2"
                className="h-8 w-8"
                type="button"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Heading 2</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('heading3')}
                aria-label="Heading 3"
                className="h-8 w-8"
                type="button"
              >
                <Heading3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Heading 3</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('bulletList')}
                aria-label="Bullet List"
                className="h-8 w-8"
                type="button"
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Bullet List</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('numberedList')}
                aria-label="Numbered List"
                className="h-8 w-8"
                type="button"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Numbered List</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('blockquote')}
                aria-label="Blockquote"
                className="h-8 w-8"
                type="button"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Blockquote</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('link')}
                aria-label="Link"
                className="h-8 w-8"
                type="button"
              >
                <Link className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Link</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('image')}
                aria-label="Image"
                className="h-8 w-8"
                type="button"
              >
                <Image className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Image</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('codeBlock')}
                aria-label="Code Block"
                className="h-8 w-8"
                type="button"
              >
                <Braces className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Code Block</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('table')}
                aria-label="Table"
                className="h-8 w-8"
                type="button"
              >
                <Table className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Table</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
} 