'use client';

import * as React from 'react';
import { 
  Braces, 
  Quote, 
  List, 
  Hash, 
  MessageSquare, 
  Code, 
  KeySquare,
  Type,
  Brackets
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Props for the JSON5Toolbar component
 */
export interface JSON5ToolbarProps {
  /** Callback to apply formatting action */
  onAction: (type: string, customText?: string) => void;
  /** Optional CSS classes to add to the toolbar */
  className?: string;
  /** Whether to display the toolbar horizontally or vertically */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Toolbar component for JSON5 editing with formatting buttons
 * 
 * @example
 * ```tsx
 * <JSON5Toolbar onAction={(type, text) => console.log(type, text)} />
 * ```
 */
export function JSON5Toolbar({
  onAction,
  className,
  orientation = 'horizontal'
}: JSON5ToolbarProps) {
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
                onClick={() => onAction('object', '{\n  "key": "value"\n}')}
                aria-label="Insert Object"
                className="h-8 w-8"
                type="button"
              >
                <Braces className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert Object</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('array', '[\n  "item1",\n  "item2"\n]')}
                aria-label="Insert Array"
                className="h-8 w-8"
                type="button"
              >
                <Brackets className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert Array</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('keyValue', '"key": "value",')}
                aria-label="Insert Key-Value Pair"
                className="h-8 w-8"
                type="button"
              >
                <KeySquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert Key-Value Pair</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('string', '"string value"')}
                aria-label="Insert String"
                className="h-8 w-8"
                type="button"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert String</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('number', '42')}
                aria-label="Insert Number"
                className="h-8 w-8"
                type="button"
              >
                <Hash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert Number</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('boolean', 'true')}
                aria-label="Insert Boolean"
                className="h-8 w-8"
                type="button"
              >
                <Type className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert Boolean</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('lineComment', '// Comment')}
                aria-label="Insert Line Comment"
                className="h-8 w-8"
                type="button"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert Line Comment</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAction('blockComment', '/* \n * Multi-line comment\n */')}
                aria-label="Insert Block Comment"
                className="h-8 w-8"
                type="button"
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert Block Comment</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
