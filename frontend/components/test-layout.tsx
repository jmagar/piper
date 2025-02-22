'use client';

export function TestLayout() {
  return (
    <div className="flex min-h-screen w-full bg-[hsl(var(--background))]">
      <div className="w-64 border-r bg-[hsl(var(--card))] p-4">
        <div className="text-lg font-bold text-[hsl(var(--foreground))]">Sidebar</div>
        <div className="mt-4 space-y-2">
          <div className="rounded-lg bg-[hsl(var(--muted))] p-2 text-[hsl(var(--muted-foreground))]">Item 1</div>
          <div className="rounded-lg bg-[hsl(var(--muted))] p-2 text-[hsl(var(--muted-foreground))]">Item 2</div>
          <div className="rounded-lg bg-[hsl(var(--muted))] p-2 text-[hsl(var(--muted-foreground))]">Item 3</div>
        </div>
      </div>
      <div className="flex-1 p-4">
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Main Content</h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            This is a test component to verify Tailwind styles are working correctly.
          </p>
          <div className="mt-4 space-x-2">
            <button 
              className="rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--primary))]/90 active:bg-[hsl(var(--primary))]/70"
            >
              Primary Button
            </button>
            <button 
              className="rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-[hsl(var(--secondary-foreground))] transition-colors hover:bg-[hsl(var(--secondary))]/90 active:bg-[hsl(var(--secondary))]/70"
            >
              Secondary Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 