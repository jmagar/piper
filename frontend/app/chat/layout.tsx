import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Chat">
      <div className="flex h-full flex-col">
        {children}
      </div>
    </AppLayout>
  );
} 