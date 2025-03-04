"use client";

import * as React from 'react';
import { BookOpen, FilePlus, Clock, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Props for the DocumentStats component
 */
interface DocumentStatsProps {
  /** When true, displays a compact version of the component */
  compact?: boolean;
}

interface Document {
  id: string;
  title: string;
  type: string;
  addedAt: string;
  accessCount: number;
  lastAccessed: string;
  size: number;
  collections: string[];
}

/**
 * DocumentStats Component
 * 
 * Displays statistics about the user's knowledge base documents
 */
export function DocumentStats({ compact = false }: DocumentStatsProps) {
  // Mock data - in a real implementation, these would be fetched from an API with user-specific data
  const [documents, setDocuments] = React.useState<Document[]>([
    {
      id: '1',
      title: 'Project Requirements.docx',
      type: 'document',
      addedAt: '2024-03-01T12:30:45Z',
      accessCount: 12,
      lastAccessed: '2024-03-03T09:15:22Z',
      size: 1240000,
      collections: ['Work', 'Projects']
    },
    {
      id: '2',
      title: 'Research Paper.pdf',
      type: 'pdf',
      addedAt: '2024-03-02T15:22:33Z',
      accessCount: 8,
      lastAccessed: '2024-03-03T14:12:05Z',
      size: 2450000,
      collections: ['Research', 'Academic']
    },
    {
      id: '3',
      title: 'Meeting Notes.md',
      type: 'markdown',
      addedAt: '2024-03-03T09:45:12Z',
      accessCount: 5,
      lastAccessed: '2024-03-03T16:30:45Z',
      size: 45000,
      collections: ['Work', 'Meetings']
    },
    {
      id: '4',
      title: 'Product Roadmap.xlsx',
      type: 'spreadsheet',
      addedAt: '2024-02-28T11:15:33Z',
      accessCount: 10,
      lastAccessed: '2024-03-02T10:05:18Z',
      size: 890000,
      collections: ['Work', 'Planning']
    },
    {
      id: '5',
      title: 'API Documentation.md',
      type: 'markdown',
      addedAt: '2024-03-02T08:30:15Z',
      accessCount: 15,
      lastAccessed: '2024-03-03T13:45:22Z',
      size: 120000,
      collections: ['Technical', 'Documentation']
    }
  ]);

  // Recently added documents (last 7 days)
  const recentDocuments = documents.filter(doc => {
    const addedDate = new Date(doc.addedAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return addedDate >= sevenDaysAgo;
  });

  // Most accessed documents
  const mostAccessedDocuments = [...documents].sort((a, b) => b.accessCount - a.accessCount);

  // Get collections from documents
  const collections = Array.from(new Set(documents.flatMap(doc => doc.collections)));

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format file size to a more readable format
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get most accessed document
  const mostAccessedDocument = React.useMemo(() => {
    if (documents.length === 0) return null;
    return [...documents].sort((a, b) => b.accessCount - a.accessCount)[0];
  }, [documents]);

  // Find the most recently accessed document
  const mostRecentlyAccessed = React.useMemo(() => {
    if (documents.length === 0) return null;
    return [...documents].sort((a, b) => 
      new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    )[0];
  }, [documents]);

  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Your Documents</h3>
        <div className="space-y-1">
          {recentDocuments.slice(0, 3).map(doc => (
            <div key={doc.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm truncate max-w-[160px]">{doc.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(doc.addedAt)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {documents.length} documents in {collections.length} collections
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Documents
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">
              In {collections.length} collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recently Added
            </CardTitle>
            <FilePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentDocuments.length}</div>
            <p className="text-xs text-muted-foreground">
              Documents added in the last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Accessed
            </CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mostAccessedDocument ? (
              <>
                <div className="text-2xl font-bold">
                  {mostAccessedDocument.title.substring(0, 15)}...
                </div>
                <p className="text-xs text-muted-foreground">
                  {mostAccessedDocument.accessCount} accesses
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No documents yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Activity
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mostRecentlyAccessed ? (
              <>
                <div className="text-2xl font-bold">
                  {formatDate(mostRecentlyAccessed.lastAccessed)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last document access
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No documents yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recently Added Documents</CardTitle>
            <CardDescription>
              Documents you've added to your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.map(doc => (
                <div key={doc.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">{doc.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Added: {formatDate(doc.addedAt)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge variant="outline">{doc.type}</Badge>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {formatFileSize(doc.size)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Accessed Documents</CardTitle>
            <CardDescription>
              Your frequently accessed knowledge base documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mostAccessedDocuments.slice(0, 5).map(doc => (
                <div key={doc.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">{doc.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Last accessed: {formatDate(doc.lastAccessed)}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{doc.accessCount}</span>
                    <span className="ml-1 text-xs text-muted-foreground">accesses</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 