'use client';

import React from 'react';
import { KnowledgeDocumentCreator } from '@/components/knowledge/knowledge-document-creator';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CreateDocumentPage() {
  const router = useRouter();
  
  const handleGoBack = () => {
    router.push('/knowledge');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      <KnowledgeDocumentCreator />
    </div>
  );
} 