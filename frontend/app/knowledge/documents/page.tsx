'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KnowledgeDocuments } from '@/components/knowledge/knowledge-documents';

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const collection = searchParams.get('collection');
  const tag = searchParams.get('tag');
  const bookmarked = searchParams.has('bookmarked') 
    ? searchParams.get('bookmarked') === 'true' 
    : undefined;

  const handleGoBack = () => {
    router.push('/knowledge');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          type="button" 
          onClick={() => router.push('/knowledge/new')}
        >
          Create Document
        </Button>
      </div>

      {/* Documents with any filters from URL */}
      <KnowledgeDocuments 
        initialFilters={{
          collection: collection || undefined,
          tag: tag || undefined,
          bookmarked: bookmarked
        }}
      />
    </div>
  );
} 