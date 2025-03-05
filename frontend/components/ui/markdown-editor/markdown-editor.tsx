'use client';

import * as React from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { LanguageSupport } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownToolbar } from './markdown-toolbar';
import { MarkdownPreview } from './markdown-preview';
import { cn } from '@/lib/utils';
import { markdown } from '@codemirror/lang-markdown';

/**
 * Props for the markdown editor component
 */
interface MarkdownEditorProps {
  /** Initial markdown content */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional CSS class for the container */
  className?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether to show the toolbar */
  showToolbar?: boolean;
  /** Height of the editor */
  height?: number | string;
  /** Whether to show the preview tab */
  showPreview?: boolean;
  /** Default view mode */
  defaultView?: 'write' | 'preview' | 'split';
}

/**
 * A full-featured markdown editor using CodeMirror
 * 
 * @example
 * ```tsx
 * <MarkdownEditor
 *   value={markdownContent}
 *   onChange={setMarkdownContent}
 *   placeholder="Write something..."
 *   height={400}
 *   showPreview={true}
 *   defaultView="split"
 * />
 * ```
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder: placeholderText = 'Write markdown content here...',
  className,
  readOnly = false,
  showToolbar = true,
  height = 400,
  showPreview = true,
  defaultView = 'write',
}: MarkdownEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const viewRef = React.useRef<EditorView | null>(null);
  const [view, setActiveView] = React.useState<'write' | 'preview' | 'split'>(defaultView);
  const [localValue, setLocalValue] = React.useState(value);
  const [isEditorReady, setIsEditorReady] = React.useState(false);

  // Setup editor extensions
  const getExtensions = React.useCallback(() => {
    const extensions: Extension[] = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      lineNumbers(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const doc = update.state.doc;
          const newValue = doc.toString();
          setLocalValue(newValue);
          onChange(newValue);
        }
      }),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];

    if (placeholderText) {
      extensions.push(placeholder(placeholderText));
    }

    return extensions;
  }, [onChange, placeholderText, readOnly]);

  // Create or update editor
  React.useEffect(() => {
    if (!editorRef.current) return;

    // If we already have a view, destroy it first
    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...getExtensions(),
        markdown({ codeLanguages: languages }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current as Element,
    });

    viewRef.current = view;
    setLocalValue(value);
    setIsEditorReady(true);

    // Cleanup on unmount
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        setIsEditorReady(false);
      }
    };
  }, [value, getExtensions]);

  // Handle resize when height changes
  React.useEffect(() => {
    if (viewRef.current) {
      viewRef.current.requestMeasure();
    }
  }, [height]);

  // Add custom CSS for CodeMirror
  React.useEffect(() => {
    // Add styles for the editor
    const style = document.createElement('style');
    style.textContent = `
      .cm-editor {
        height: 100%;
        overflow: auto;
      }
      .cm-editor .cm-content {
        font-family: monospace;
        font-size: 14px;
        padding: 8px;
      }
      .cm-editor .cm-gutters {
        background-color: transparent;
        border-right: 1px solid hsl(var(--border));
      }
      .cm-editor .cm-activeLineGutter {
        background-color: hsl(var(--muted));
      }
      .cm-editor .cm-activeLine {
        background-color: hsla(var(--muted), 0.3);
      }
      .cm-editor .cm-line {
        padding: 0 8px 0 4px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Calculate component style based on props
  const containerStyle = React.useMemo(() => {
    const baseHeight = typeof height === 'number' ? `${height}px` : height;
    
    return {
      '--editor-height': baseHeight,
    } as React.CSSProperties;
  }, [height]);

  return (
    <div 
      className={cn(
        'markdown-editor-container border border-[hsl(var(--border))] rounded-md',
        className
      )} 
      style={containerStyle}
    >
      {showToolbar && (view === 'write' || view === 'split') && (
        <div className="toolbar-container">
          {isEditorReady && viewRef.current ? (
            <MarkdownToolbar view={viewRef.current} className="border-b border-[hsl(var(--border))]" />
          ) : (
            <div className="h-10 bg-[hsl(var(--muted))] animate-pulse border-b border-[hsl(var(--border))]"></div>
          )}
        </div>
      )}

      {showPreview ? (
        <Tabs value={view} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="p-1 bg-[hsl(var(--muted))]">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="split">Split</TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="mt-0">
            <div 
              ref={editorRef} 
              className="cm-editor-container h-[calc(var(--editor-height)-80px)]"
            />
          </TabsContent>
          
          <TabsContent value="preview" className="mt-0">
            <MarkdownPreview 
              content={localValue} 
              height={`calc(var(--editor-height) - 40px)`}
            />
          </TabsContent>
          
          <TabsContent value="split" className="mt-0">
            <div className="grid grid-cols-2 divide-x divide-[hsl(var(--border))]">
              <div className="overflow-hidden">
                <div 
                  ref={view === 'split' ? editorRef : undefined} 
                  className="cm-editor-container h-[calc(var(--editor-height)-80px)] overflow-auto"
                />
              </div>
              <div className="overflow-hidden">
                <MarkdownPreview 
                  content={localValue} 
                  height={`calc(var(--editor-height) - 80px)`}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div 
          ref={editorRef} 
          className="cm-editor-container h-[calc(var(--editor-height)-40px)]"
        />
      )}
    </div>
  );
} 