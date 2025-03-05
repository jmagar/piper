'use client';

import * as React from 'react';
import { useState } from 'react';
import { MarkdownEditor, MarkdownEditorProps } from '@/components/shared/markdown-editor/markdown-editor';
import { JSON5Toolbar } from './json5-toolbar';
import './json5-editor.css';

/**
 * Props for the JSON5Editor component
 */
export interface JSON5EditorProps extends Omit<MarkdownEditorProps, 'showToolbar' | 'fileType' | 'theme'> {
  /** Whether to show the JSON5 toolbar */
  showToolbar?: boolean;
}

/**
 * A specialized editor for JSON5 files
 * 
 * @example
 * ```tsx
 * <JSON5Editor 
 *   value={jsonString} 
 *   onChange={setJsonString} 
 * />
 * ```
 */
export function JSON5Editor({
  value,
  onChange,
  showToolbar = true,
  ...props
}: JSON5EditorProps) {
  // Format JSON5 on demand
  const formatJSON5 = () => {
    try {
      // This is a simple formatter that just adds indentation
      // In a real implementation, you would use a proper JSON5 formatter
      const formattedJSON = JSON.stringify(JSON.parse(value), null, 2);
      onChange(formattedJSON);
    } catch (error) {
      console.error('Failed to format JSON5:', error);
      // Don't change the value if there's an error
    }
  };

  // Apply JSON5 formatting actions
  const handleToolbarAction = (type: string, customText?: string) => {
    // The actual implementation is in the MarkdownEditor component
    // This is just a wrapper that passes the action to the editor
    if (type === 'format') {
      formatJSON5();
    }
  };

  return (
    <div className="json5-editor">
      {showToolbar && (
        <JSON5Toolbar onAction={handleToolbarAction} />
      )}
      <MarkdownEditor
        value={value}
        onChange={onChange}
        fileType="json5"
        showToolbar={false}
        theme="dark" // Force dark theme for better syntax highlighting
        {...props}
      />
    </div>
  );
}
