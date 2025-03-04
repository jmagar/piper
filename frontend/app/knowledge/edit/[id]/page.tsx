'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { KnowledgeDocumentCreator } from '@/components/knowledge/knowledge-document-creator';

interface DocumentEditPageProps {
  params: {
    id: string;
  };
}

export default function DocumentEditPage({ params }: DocumentEditPageProps) {
  const router = useRouter();
  const [document, setDocument] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/knowledge/documents/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch document');
        }
        const data = await response.json();
        setDocument(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocument();
  }, [params.id]);
  
  const handleGoBack = () => {
    router.push(`/knowledge/document/${params.id}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !document) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="p-6 text-center text-destructive">
          {error || 'Document not found'}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      <KnowledgeDocumentCreator 
        mode="edit"
        documentId={params.id}
        initialData={document}
      />
    </div>
  );
} 