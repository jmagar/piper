import { Metadata } from 'next';
import { AppLayout } from '@/components/layout/app-layout';

export const metadata: Metadata = {
  title: 'Knowledge Management - Pooper MCP',
  description: 'Search, browse, and manage your knowledge base',
};

/**
 * Knowledge section layout
 * Provides consistent layout for all Knowledge pages with sidebar
 */
export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Knowledge Management">
      <div className="container py-4">
        {children}
      </div>
    </AppLayout>
  );
} 