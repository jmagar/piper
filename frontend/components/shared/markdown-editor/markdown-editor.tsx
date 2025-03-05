'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';
import { history, historyKeymap } from '@codemirror/commands';
import { defaultKeymap } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { MarkdownPreview } from './markdown-preview';
import { MarkdownToolbar } from './markdown-toolbar';
import { getFileTypeById } from '@/lib/file-types';

const themes = new Compartment();

/**
 * Props for the MarkdownEditor component
 */
export interface MarkdownEditorProps {
  /** Current content value */
  value: string;
  /** Callback for content changes */
  onChange: (value: string) => void;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Additional CSS class names */
  className?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether to show the toolbar */
  showToolbar?: boolean;
  /** Height of the editor */
  height?: string;
  /** Whether to show the preview */
  showPreview?: boolean;
  /** Default view mode: 'write', 'preview', or 'split' */
  defaultView?: 'write' | 'preview' | 'split';
  /** File type identifier for syntax highlighting */
  fileType?: string;
  /** Theme name: 'light' or 'dark' */
  theme?: 'light' | 'dark';
}

/**
 * A rich text editor component with markdown support and preview
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className = '',
  readOnly = false,
  showToolbar = true,
  height = '400px',
  showPreview = true,
  defaultView = 'write',
  fileType = 'markdown',
  theme = 'light',
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [viewMode, setViewMode] = useState<'write' | 'preview' | 'split'>(defaultView);
  const [editorExtensions, setEditorExtensions] = useState<any[]>([]);
  const [isExtensionsLoaded, setIsExtensionsLoaded] = useState(false);

  // Initialize language extensions based on file type
  useEffect(() => {
    const loadExtensions = async () => {
      try {
        const fileTypeObj = getFileTypeById(fileType);
        const languageExtension = await fileTypeObj.getLanguage();
        
        // Enhanced JSON5 highlighting
        const isJson5 = fileType === 'json5';
        
        const extensions = [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          indentUnit.of('    '),
          EditorState.readOnly.of(readOnly),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
          }),
          // Force dark theme for JSON5 files with enhanced styling
          themes.of(isJson5 ? oneDark : (theme === 'dark' ? oneDark : [])),
          languageExtension,
          // Add additional highlighting for JSON5
          ...(isJson5 ? [
            EditorView.theme({
              "&": {
                backgroundColor: "#0a0e14 !important",
                color: "#e6edf3 !important"
              },
              ".cm-content": {
                caretColor: "#58a6ff"
              },
              ".cm-cursor": {
                borderLeftColor: "#58a6ff !important"
              },
              ".cm-activeLine": {
                backgroundColor: "rgba(33, 150, 243, 0.1) !important"
              },
              ".cm-activeLineGutter": {
                backgroundColor: "rgba(33, 150, 243, 0.1) !important"
              },
              ".cm-selectionMatch": {
                backgroundColor: "rgba(33, 150, 243, 0.3) !important"
              }
            })
          ] : [])
        ];
        
        setEditorExtensions(extensions);
        setIsExtensionsLoaded(true);
      } catch (error) {
        console.error('Error loading editor extensions:', error);
      }
    };
    
    loadExtensions();
  }, [fileType, readOnly, onChange, theme]);

  // Set up the editor
  useEffect(() => {
    if (!editorRef.current || !isExtensionsLoaded) return;
    
    // Clean up previous view
    if (editorView) {
      editorView.destroy();
    }
    
    const state = EditorState.create({
      doc: value,
      extensions: editorExtensions,
    });
    
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    
    setEditorView(view);
    
    return () => {
      view.destroy();
    };
  }, [isExtensionsLoaded, editorExtensions]);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorView && value !== editorView.state.doc.toString()) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value, editorView]);
  
  // Update theme when theme prop changes
  useEffect(() => {
    if (editorView) {
      editorView.dispatch({
        effects: themes.reconfigure(theme === 'dark' ? oneDark : [])
      });
    }
  }, [theme, editorView]);

  // Apply formatting to selected text
  const applyFormatting = (type: string, customText?: string) => {
    if (!editorView) return;
    
    const selection = editorView.state.selection.main;
    const selectedText = editorView.state.doc.sliceString(selection.from, selection.to);
    
    let updatedText = '';
    
    switch (type) {
      case 'bold':
        updatedText = `**${selectedText}**`;
        break;
      case 'italic':
        updatedText = `*${selectedText}*`;
        break;
      case 'code':
        updatedText = `\`${selectedText}\``;
        break;
      case 'link':
        updatedText = customText || `[${selectedText || 'Link text'}](url)`;
        break;
      case 'image':
        updatedText = customText || `![${selectedText || 'Alt text'}](image-url)`;
        break;
      case 'heading':
        updatedText = `# ${selectedText}`;
        break;
      case 'heading2':
        updatedText = `## ${selectedText}`;
        break;
      case 'heading3':
        updatedText = `### ${selectedText}`;
        break;
      case 'bulletList':
        updatedText = selectedText
          .split('\n')
          .map(line => `- ${line}`)
          .join('\n');
        break;
      case 'numberedList':
        updatedText = selectedText
          .split('\n')
          .map((line, i) => `${i + 1}. ${line}`)
          .join('\n');
        break;
      case 'blockquote':
        updatedText = selectedText
          .split('\n')
          .map(line => `> ${line}`)
          .join('\n');
        break;
      case 'codeBlock':
        updatedText = `\`\`\`\n${selectedText}\n\`\`\``;
        break;
      case 'table':
        updatedText = `| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |`;
        break;
      default:
        updatedText = selectedText;
    }
    
    editorView.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: updatedText,
      },
    });
    
    // Focus back on editor
    editorView.focus();
  };

  // Toggle view mode between write, preview and split
  const toggleView = (mode: 'write' | 'preview' | 'split') => {
    setViewMode(mode);
  };

  return (
    <div
      className={`markdown-editor flex flex-col border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-950 ${className}`}
      style={{ height }}
    >
      {showToolbar && fileType === 'markdown' && (
        <MarkdownToolbar onAction={applyFormatting} />
      )}
      
      {showPreview && (
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <button
            className={`px-3 py-1 text-sm ${
              viewMode === 'write'
                ? 'bg-white dark:bg-gray-950 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => toggleView('write')}
          >
            Edit
          </button>
          {showPreview && (
            <>
              <button
                className={`px-3 py-1 text-sm ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-gray-950 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => toggleView('split')}
              >
                Split
              </button>
              <button
                className={`px-3 py-1 text-sm ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-gray-950 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => toggleView('preview')}
              >
                Preview
              </button>
            </>
          )}
        </div>
      )}
      
      <div
        className={`flex-1 flex overflow-hidden ${
          viewMode === 'split' ? 'flex-row' : 'flex-col'
        }`}
      >
        {(viewMode === 'write' || viewMode === 'split') && (
          <div
            ref={editorRef}
            className={`editor-container overflow-auto ${
              viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-800' : 'w-full'
            }`}
            style={{
              height: viewMode === 'split' ? '100%' : viewMode === 'write' ? '100%' : '0',
              display: viewMode === 'preview' ? 'none' : 'block',
            }}
          />
        )}
        
        {(viewMode === 'preview' || viewMode === 'split') && fileType === 'markdown' && (
          <div
            className={`preview-container overflow-auto ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
            style={{
              height: viewMode === 'split' ? '100%' : viewMode === 'preview' ? '100%' : '0',
              display: viewMode === 'write' ? 'none' : 'block',
            }}
          >
            <MarkdownPreview markdown={value} />
          </div>
        )}
        
        {/* For non-markdown files in preview mode, show a code preview */}
        {(viewMode === 'preview' || viewMode === 'split') && fileType !== 'markdown' && (
          <div
            className={`preview-container overflow-auto ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
            style={{
              height: viewMode === 'split' ? '100%' : viewMode === 'preview' ? '100%' : '0',
              display: viewMode === 'write' ? 'none' : 'block',
            }}
          >
            <pre className="p-4 overflow-auto h-full bg-gray-50 dark:bg-gray-900 text-sm">
              <code>{value}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 