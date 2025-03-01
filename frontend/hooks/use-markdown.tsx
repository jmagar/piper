import * as React from 'react';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface UseMarkdownOptions {
    /**
     * Whether to allow HTML in markdown
     * @default false
     */
    allowHtml?: boolean;

    /**
     * Whether to enable syntax highlighting
     * @default true
     */
    enableSyntaxHighlight?: boolean;

    /**
     * Whether to enable GitHub Flavored Markdown
     * @default true
     */
    enableGfm?: boolean;

    /**
     * Whether to show copy button on code blocks
     * @default true
     */
    showCopyButton?: boolean;
}

interface UseMarkdownResult {
    renderMarkdown: (markdown: string) => React.ReactElement;
}

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
    inline?: boolean;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {}

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

/**
 * Hook for rendering markdown content with syntax highlighting and code block support
 */
export function useMarkdown({
    allowHtml = false,
    enableSyntaxHighlight = true,
    enableGfm = true,
    showCopyButton = true
}: UseMarkdownOptions = {}): UseMarkdownResult {
    // Memoize components to prevent unnecessary re-renders
    const components = React.useMemo<Components>(() => ({
        // Root wrapper component
        root: function Root({ children }: { children: React.ReactNode }): React.ReactElement {
            return (
                <article className="prose prose-sm dark:prose-invert max-w-none break-words">
                    {children}
                </article>
            );
        },
        // Custom code block rendering
        code: function Code({ inline, className, children, ...props }: CodeProps): React.ReactElement {
            const match = /language-(\w+)/.exec(className ?? '');
            const language = match ? match[1] : '';
            const code = String(children).replace(/\n$/, '');

            if (inline) {
                return (
                    <code className={className} {...props}>
                        {children}
                    </code>
                );
            }

            const handleCopy = () => {
                if (typeof navigator === 'undefined' || !navigator.clipboard) {
                    toast.error('Clipboard API not available');
                    return;
                }
                navigator.clipboard.writeText(code).then(() => {
                    toast.success('Code copied to clipboard');
                }).catch(() => {
                    toast.error('Failed to copy code');
                });
            };

            return (
                <pre className="relative group">
                    <div
                        className={`${className ?? ''} p-4 rounded-lg bg-[hsl(var(--muted))] overflow-x-auto`}
                    >
                        {language ? (
                            <div className="absolute top-2 right-2 text-xs text-[hsl(var(--muted-foreground))]">
                                {language}
                            </div>
                        ) : null}
                        <code className={className}>{code}</code>
                    </div>
                    {showCopyButton ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleCopy}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        </Button>
                    ) : null}
                </pre>
            );
        },
        // Custom link rendering
        a: function Link({ children, href, ...props }: LinkProps): React.ReactElement {
            const isExternal = href?.startsWith('http');
            return (
                <a
                    href={href}
                    className="text-[hsl(var(--primary))] hover:underline"
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    {...props}
                >
                    {children}
                </a>
            );
        },
        // Custom table rendering
        table: function Table({ children, ...props }: TableProps): React.ReactElement {
            return (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[hsl(var(--border))]" {...props}>
                        {children}
                    </table>
                </div>
            );
        },
        // Custom table header rendering
        th: function TableHeader({ children, ...props }: TableCellProps): React.ReactElement {
            return (
                <th
                    className="px-4 py-2 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider"
                    {...props}
                >
                    {children}
                </th>
            );
        },
        // Custom table cell rendering
        td: function TableCell({ children, ...props }: TableCellProps): React.ReactElement {
            return (
                <td className="px-4 py-2 whitespace-nowrap text-sm" {...props}>
                    {children}
                </td>
            );
        },
        // Override paragraph to prevent div nesting issues
        p: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
            function Paragraph({ children, ...props }, ref): React.ReactElement {
                // If the child is a div or pre, render it directly to avoid nesting issues
                if (React.Children.toArray(children).some(
                    child => React.isValidElement(child) && 
                    (child.type === 'div' || child.type === 'pre')
                )) {
                    return <>{children}</>;
                }
                return <p ref={ref} {...props}>{children}</p>;
            }
        )
    }), [showCopyButton]);

    // Memoize rehype plugins to prevent unnecessary re-renders
    const rehypePlugins = React.useMemo<any[]>(() => {
        const plugins = [];
        if (allowHtml) plugins.push(rehypeRaw);
        if (enableSyntaxHighlight) plugins.push(rehypeHighlight);
        return plugins;
    }, [allowHtml, enableSyntaxHighlight]);

    // Memoize remark plugins to prevent unnecessary re-renders
    const remarkPlugins = React.useMemo<any[]>(() => {
        const plugins = [];
        if (enableGfm) plugins.push(remarkGfm);
        return plugins;
    }, [enableGfm]);

    // Render function
    const renderMarkdown = React.useCallback(
        (markdown: string): React.ReactElement => (
            <ReactMarkdown
                components={components}
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
            >
                {markdown}
            </ReactMarkdown>
        ),
        [components, remarkPlugins, rehypePlugins]
    );

    return {
        renderMarkdown
    };
}