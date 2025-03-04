'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, BookmarkCheck, Calendar, Clock, Download, Edit, ExternalLink, FileText, Tag, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Type definitions
interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  collection: string;
  metadata: Record<string, any>;
  bookmarked: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  extracted_text?: string;
  url?: string;
  original_file?: string;
}

interface DocumentViewerProps {
  documentId: string;
}

export function KnowledgeDocumentViewer({ documentId }: DocumentViewerProps) {
  const router = useRouter();
  
  const [document, setDocument] = useState<KnowledgeDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('content');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/knowledge/documents/${documentId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Document not found');
          }
          throw new Error('Failed to fetch document');
        }
        
        const data = await response.json();
        setDocument(data);
      } catch (error) {
        console.error('Error fetching document:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const handleGoBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push(`/knowledge/edit/${documentId}`);
  };

  const handleToggleBookmark = async () => {
    if (!document) return;
    
    // Optimistic UI update
    setDocument({ ...document, bookmarked: !document.bookmarked });
    
    try {
      const response = await fetch(`/api/knowledge/documents/${documentId}/bookmark`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookmarked: !document.bookmarked }),
      });
      
      if (!response.ok) {
        // Revert the optimistic update if the request fails
        setDocument({ ...document, bookmarked: document.bookmarked });
        throw new Error('Failed to update bookmark status');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Error already handled by reverting the optimistic update
    }
  };

  const handleDownload = () => {
    if (!document || !document.original_file) return;
    
    // Create a temporary anchor element
    const anchor = window.document.createElement('a');
    anchor.href = `/api/knowledge/documents/${documentId}/download`;
    anchor.download = document.title || 'document';
    anchor.click();
  };

  const handleDelete = async () => {
    if (!document) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/knowledge/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      setIsDeleteDialogOpen(false);
      // Redirect to documents page after successful deletion
      router.push('/knowledge');
    } catch (error) {
      console.error('Error deleting document:', error);
      setDeleteError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-24" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'Failed to load document'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleToggleBookmark}
            title={document.bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            {document.bookmarked ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
          {document.original_file && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleDownload}
              title="Download original file"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleEdit}
            title="Edit document"
          >
            <Edit className="h-5 w-5" />
          </Button>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-destructive hover:text-destructive"
                title="Delete document"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Document</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{document.title}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
            <div>
              <CardTitle className="text-2xl">{document.title}</CardTitle>
              <CardDescription>
                Collection: {document.collection}
              </CardDescription>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Created {formatDate(document.created_at)}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                <span>Updated {formatDate(document.updated_at)}</span>
              </div>
            </div>
          </div>
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {document.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              {document.metadata && Object.keys(document.metadata).length > 0 && (
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              )}
              {document.extracted_text && (
                <TabsTrigger value="extracted">Extracted Text</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="content" className="prose dark:prose-invert max-w-none">
              {/* Render content using a markdown renderer in a real implementation */}
              <div className="whitespace-pre-wrap">
                {document.content}
              </div>
            </TabsContent>
            
            {document.metadata && Object.keys(document.metadata).length > 0 && (
              <TabsContent value="metadata">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(document.metadata).map(([key, value]) => (
                    <div key={key} className="border rounded-md p-3">
                      <h3 className="text-sm font-medium">{key}</h3>
                      <p className="text-sm text-muted-foreground">
                        {typeof value === 'object' 
                          ? JSON.stringify(value) 
                          : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
            
            {document.extracted_text && (
              <TabsContent value="extracted">
                <div className="border rounded-md p-4 whitespace-pre-wrap text-sm">
                  {document.extracted_text}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
        {document.url && (
          <CardFooter>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <a 
                href={document.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View Original Source
              </a>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 