'use client';

import * as React from 'react';
import { MarkdownEditor } from './markdown-editor';

/**
 * Example component demonstrating how to use the MarkdownEditor
 */
export function MarkdownEditorExample() {
  const [content, setContent] = React.useState<string>(
    `# Markdown Editor Example

This is a **markdown editor** built with CodeMirror and React.

## Features

- Syntax highlighting
- Live preview
- Toolbar for formatting
- Split view mode
- Customizable height

### Code Example

\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

> This is a blockquote

| Feature | Supported |
|---------|-----------|
| Bold    | ✅        |
| Italic  | ✅        |
| Tables  | ✅        |
| Links   | ✅        |
| Images  | ✅        |
`
  );

  // Add styles for the checkmarks
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Additional styles for the example */
      .cm-content {
        padding-bottom: 500px !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Markdown Editor</h2>
      <p className="text-muted-foreground">
        A full-featured markdown editor with live preview and formatting tools.
      </p>
      
      <div className="border rounded-lg p-4 bg-card">
        <MarkdownEditor
          value={content}
          onChange={setContent}
          height={500}
          showPreview={true}
          defaultView="split"
        />
      </div>
      
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-2">Raw Markdown</h3>
        <pre className="p-4 bg-muted rounded-md overflow-auto max-h-[200px]">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
} 