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
 * Type definition for toolbar button action
 */
export type ToolbarAction = (selection: string, view: any) => void;

/**
 * Props for the MarkdownToolbar component
 */
interface MarkdownToolbarProps {
  /** CodeMirror view instance */
  view: any;
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
 * <MarkdownToolbar view={editorView} />
 * ```
 */
export function MarkdownToolbar({
  view,
  className,
  orientation = 'horizontal'
}: MarkdownToolbarProps) {
  // Helper function to apply markdown formatting
  const applyFormatting = React.useCallback((formatting: ToolbarAction) => {
    if (!view) return;
    
    const { state } = view;
    const selection = state.sliceDoc(
      state.selection.main.from,
      state.selection.main.to
    );
    
    formatting(selection, view);
    // Focus the editor after applying format
    setTimeout(() => view.focus(), 0);
  }, [view]);

  // Markdown formatting functions
  const formatters = React.useMemo(() => ({
    bold: (selection: string, view: any) => {
      const newText = selection ? `**${selection}**` : '**bold text**';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 2, head: from + newText.length - 2 }
      });
    },
    
    italic: (selection: string, view: any) => {
      const newText = selection ? `*${selection}*` : '*italic text*';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 1, head: from + newText.length - 1 }
      });
    },
    
    heading1: (selection: string, view: any) => {
      const newText = selection ? `# ${selection}` : '# Heading 1';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 2, head: from + newText.length }
      });
    },
    
    heading2: (selection: string, view: any) => {
      const newText = selection ? `## ${selection}` : '## Heading 2';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 3, head: from + newText.length }
      });
    },
    
    heading3: (selection: string, view: any) => {
      const newText = selection ? `### ${selection}` : '### Heading 3';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 4, head: from + newText.length }
      });
    },
    
    link: (selection: string, view: any) => {
      const newText = selection 
        ? `[${selection}](https://example.com)` 
        : '[link text](https://example.com)';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { 
          anchor: selection ? from + selection.length + 3 : from + 11,
          head: selection ? from + newText.length - 1 : from + newText.length - 1
        }
      });
    },
    
    image: (selection: string, view: any) => {
      const newText = selection 
        ? `![${selection}](https://example.com/image.jpg)` 
        : '![image alt text](https://example.com/image.jpg)';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { 
          anchor: selection ? from + selection.length + 4 : from + 17,
          head: selection ? from + newText.length - 1 : from + newText.length - 1
        }
      });
    },
    
    code: (selection: string, view: any) => {
      const newText = selection ? `\`${selection}\`` : '`code`';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 1, head: from + newText.length - 1 }
      });
    },
    
    codeBlock: (selection: string, view: any) => {
      const newText = selection 
        ? `\`\`\`\n${selection}\n\`\`\`` 
        : "```\ncode block\n```";
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { 
          anchor: selection ? from + 4 : from + 4,
          head: selection ? from + selection.length + 4 : from + 14
        }
      });
    },
    
    quote: (selection: string, view: any) => {
      const newText = selection ? `> ${selection}` : '> blockquote';
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 2, head: from + newText.length }
      });
    },
    
    unorderedList: (selection: string, view: any) => {
      const lines = selection ? selection.split('\n') : ['List item'];
      const newText = lines.map(line => `- ${line}`).join('\n');
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 2, head: from + newText.length }
      });
    },
    
    orderedList: (selection: string, view: any) => {
      const lines = selection ? selection.split('\n') : ['List item'];
      const newText = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText },
        selection: { anchor: from + 3, head: from + newText.length }
      });
    },
    
    table: (selection: string, view: any) => {
      const newText = `| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |`;
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      view.dispatch({
        changes: { from, to, insert: newText }
      });
    }
  }), []);

  return (
    <div className={cn(
      'flex gap-1 p-2 bg-[hsl(var(--muted))]',
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
                onClick={() => applyFormatting(formatters.bold)}
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
                onClick={() => applyFormatting(formatters.italic)}
                aria-label="Italic"
                className="h-8 w-8"
                type="button"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Italic</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting(formatters.heading1)}
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
                onClick={() => applyFormatting(formatters.heading2)}
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
                onClick={() => applyFormatting(formatters.heading3)}
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
                onClick={() => applyFormatting(formatters.link)}
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
                onClick={() => applyFormatting(formatters.image)}
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
                onClick={() => applyFormatting(formatters.unorderedList)}
                aria-label="Unordered List"
                className="h-8 w-8"
                type="button"
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Unordered List</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting(formatters.orderedList)}
                aria-label="Ordered List"
                className="h-8 w-8"
                type="button"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Ordered List</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting(formatters.code)}
                aria-label="Inline Code"
                className="h-8 w-8"
                type="button"
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Inline Code</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting(formatters.codeBlock)}
                aria-label="Code Block"
                className="h-8 w-8"
                type="button"
              >
                <Braces className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Code Block</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} className="mx-1" />
        
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting(formatters.quote)}
                aria-label="Quote"
                className="h-8 w-8"
                type="button"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Quote</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting(formatters.table)}
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