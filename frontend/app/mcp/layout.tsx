import * as React from 'react';

export default function McpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </main>
  );
} 