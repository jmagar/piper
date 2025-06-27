"use client"

import { useState } from 'react'
import { CodeBlock, CodeBlockCode } from '@/components/prompt-kit/code-block'

export default function TestInteractiveCodeblocks() {
  const [status, setStatus] = useState<string>('')

  const handleSave = async (newCode: string) => {
    setStatus('Saving...')
    try {
      const response = await fetch('/api/prompts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: 'test-interactive-demo.md',
          content: newCode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const result = await response.json()
      setStatus(`Saved successfully: ${result.filename}`)
      setTimeout(() => setStatus(''), 3000)
    } catch {
      setStatus('Error saving file')
      setTimeout(() => setStatus(''), 3000)
    }
  }

  const sampleCode = `# Interactive Codeblock Demo

This is a sample markdown file that you can edit!

## Features
- Double-click to edit
- Click the edit button
- Syntax highlighting with CodeMirror 6
- Save changes back to file
- Cancel to revert changes

## Code Example

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

Try editing this content!`

  const jsCode = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate the 10th Fibonacci number
console.log(fibonacci(10));`

  const pythonCode = `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)

# Example usage
numbers = [64, 34, 25, 12, 22, 11, 90]
sorted_numbers = quicksort(numbers)
print(f"Sorted array: {sorted_numbers}")`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Interactive Codeblock Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Test the new CodeMirror 6 integration with editable codeblocks
          </p>
          {status && (
            <div className={`p-3 rounded-lg ${
              status.includes('Error') 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            }`}>
              {status}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Editable Markdown Content</h2>
            <p className="text-muted-foreground mb-4">
              This codeblock is editable! Double-click or use the edit button to modify the content.
              Changes will be saved to a test file.
            </p>
            <CodeBlock>
              <CodeBlockCode
                code={sampleCode}
                language="markdown"
                onSave={handleSave}
              />
            </CodeBlock>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">JavaScript Example (Read-only)</h2>
            <p className="text-muted-foreground mb-4">
              This codeblock doesn&rsquo;t have an onSave prop, so it&rsquo;s read-only (no edit button or double-click).
            </p>
            <CodeBlock>
              <CodeBlockCode
                code={jsCode}
                language="javascript"
              />
            </CodeBlock>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Python Example (Editable)</h2>
            <p className="text-muted-foreground mb-4">
              Another editable example with Python syntax highlighting.
            </p>
            <CodeBlock>
              <CodeBlockCode
                code={pythonCode}
                language="python"
                onSave={handleSave}
              />
            </CodeBlock>
          </section>

          <section className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">How to Use</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <strong>Edit Mode:</strong> Double-click any editable codeblock or click the edit button (📝) to enter edit mode
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <strong>Editing:</strong> Use the CodeMirror editor with syntax highlighting, line numbers, and code completion
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <strong>Enhance:</strong> While editing, click the enhance button (✨) to AI-improve the prompt content
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <strong>Save:</strong> Click the save button (💾) to save changes back to the file
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                <div>
                  <strong>Cancel:</strong> Click the cancel button (❌) to discard changes and return to view mode
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">⌨️ Keyboard Shortcuts</h4>
              <div className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs">ESC</kbd> - Cancel editing and return to view mode</div>
                <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs">Ctrl+S</kbd> or <kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs">Cmd+S</kbd> - Save changes</div>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Features</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">CodeMirror 6 Integration</h3>
                <ul className="space-y-1 text-muted-foreground">
                                     <li>• Lightweight (~21KB vs Monaco&rsquo;s 5MB)</li>
                  <li>• Excellent mobile support</li>
                  <li>• Modern ES6 modules</li>
                  <li>• Highly performant</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">Language Support</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Markdown</li>
                  <li>• JavaScript/TypeScript</li>
                  <li>• Python</li>
                  <li>• JSON</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Theming</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Automatic light/dark mode</li>
                  <li>• Matches app theme</li>
                  <li>• Custom styling support</li>
                  <li>• Consistent with Shiki</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">User Experience</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Double-click to edit</li>
                  <li>• AI prompt enhancement</li>
                  <li>• Edit button for clarity</li>
                  <li>• Save/cancel controls</li>
                  <li>• Seamless transitions</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
} 