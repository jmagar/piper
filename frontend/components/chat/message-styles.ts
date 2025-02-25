// Base prose styles
export const baseProseClasses = "prose prose-sm dark:prose-invert max-w-none";

// Spacing and layout
export const proseSpacingClasses = [
    "prose-pre:my-0",
    "prose-p:leading-normal",
    "prose-p:my-1",
    "prose-headings:mb-2",
    "prose-headings:mt-4",
    "first:prose-headings:mt-0"
].join(' ');

// Code block styles
export const proseCodeClasses = [
    "prose-pre:bg-muted/50",
    "prose-pre:border",
    "prose-pre:border-border/50",
    "prose-code:text-foreground/90",
    "prose-code:bg-muted/50",
    "prose-code:px-1",
    "prose-code:py-0.5",
    "prose-code:rounded-md",
    "prose-code:before:content-none",
    "prose-code:after:content-none"
].join(' ');

// List styles
export const proseListClasses = [
    "prose-ul:my-1",
    "prose-ul:list-none",
    "prose-li:my-1",
    "[&_ul]:space-y-1",
    "[&_ul]:pl-6",
    "[&_ul>li]:relative",
    "[&_ul>li]:pl-6",
    "[&_ul>li]:before:absolute",
    "[&_ul>li]:before:left-0",
    "[&_ul>li]:before:top-[0.6875em]",
    "[&_ul>li]:before:h-px",
    "[&_ul>li]:before:w-4",
    "[&_ul>li]:before:bg-border/40",
    "[&_ul>li]:after:absolute",
    "[&_ul>li]:after:left-0",
    "[&_ul>li]:after:top-0",
    "[&_ul>li]:after:h-full",
    "[&_ul>li]:after:w-px",
    "[&_ul>li]:after:bg-border/40",
    "[&_ul>li:last-child]:after:h-[0.875em]"
].join(' ');

// User-specific styles
export const userProseClasses = [
    "prose-headings:text-white",
    "prose-p:text-white/90",
    "prose-code:text-white",
    "prose-code:bg-white/10",
    "[&_ul>li]:before:bg-white/40",
    "[&_ul>li]:after:bg-white/40"
].join(' ');

// Container styles
export const messageContainerClasses = {
    base: 'rounded-2xl px-4 py-3 text-sm shadow-sm transition-colors relative',
    system: 'bg-muted/30 mx-auto max-w-2xl border border-border/50 dark:bg-muted/10',
    user: 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-auto shadow-lg hover:shadow-xl',
    assistant: 'bg-[hsl(var(--card))] dark:bg-[hsl(var(--card))] text-card-foreground dark:text-card-foreground border border-border/50 dark:border-border/20',
    tool: 'bg-[hsl(var(--card))] border border-border/50 dark:border-border/20',
    streaming: 'animate-pulse border-2 border-blue-500/50'
} as const;
