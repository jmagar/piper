import { Check, Copy } from 'lucide-react';
import * as React from 'react';
import Prism from 'prismjs';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
}

/**
 * A component that renders syntax-highlighted code blocks
 * @param code - The code to highlight
 * @param language - The programming language (defaults to typescript)
 * @param className - Optional className for styling
 * @param showLineNumbers - Whether to show line numbers
 */
export function CodeBlock({
  code,
  language = 'typescript',
  className,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const codeRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = React.useCallback(() => {
    void navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [code]);

  return (
    <div className={cn('group relative rounded-lg bg-muted', className)}>
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-muted-foreground">{language}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <pre className={cn(
        'overflow-x-auto p-4',
        showLineNumbers && 'line-numbers'
      )}>
        <code
          ref={codeRef}
          className={`language-${language}`}
        >
          {code.trim()}
        </code>
      </pre>
    </div>
  );
} 