'use client';

import React, { useState } from 'react';
import { MarkdownEditor } from './markdown-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DownloadIcon } from 'lucide-react';

/**
 * Example component that demonstrates how to use the markdown editor
 */
export function MarkdownEditorExample() {
  const [markdown, setMarkdown] = useState<string>(
    `# Markdown Editor Example

This is an example of the markdown editor component.

## Features

- **Bold** and *italic* text formatting
- Lists (ordered and unordered)
- [Links](https://example.com)
- Code blocks

\`\`\`javascript
function greet() {
  console.log("Hello, world!");
}
\`\`\`

- Tables

| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

> Blockquotes are also supported!
`
  );
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fileType, setFileType] = useState<string>('markdown');
  
  // Download content as file
  const downloadContent = () => {
    const extension = fileType === 'markdown' ? '.md' : 
                     fileType === 'javascript' ? '.js' :
                     fileType === 'json' ? '.json' :
                     fileType === 'yaml' ? '.yml' : '.txt';
                     
    const blob = new Blob([markdown], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Markdown Editor</h2>
        <div className="flex items-center space-x-4">
          <select 
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1"
          >
            <option value="markdown">Markdown</option>
            <option value="javascript">JavaScript</option>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="plaintext">Plain Text</option>
          </select>
          
          <select 
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
            className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1"
          >
            <option value="light">Light Theme</option>
            <option value="dark">Dark Theme</option>
          </select>
          
          <Button variant="outline" size="sm" onClick={downloadContent}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      
      <MarkdownEditor
        value={markdown}
        onChange={setMarkdown}
        height="600px"
        showPreview={true}
        defaultView="split"
        fileType={fileType}
        theme={theme}
      />
    </div>
  );
} 