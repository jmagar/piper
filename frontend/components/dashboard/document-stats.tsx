"use client";

import * as React from 'react';
import { BookOpen, FilePlus, Clock, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Props for the DocumentStats component
 */
interface DocumentStatsProps {
  /** When true, displays a compact version of the component */
  compact?: boolean;
  limit?: number;
}

interface DocumentStats {
  totalDocuments: number;
  recentDocuments: number;
  collections: { name: string; count: number }[];
  totalCollections: number;
  recentlyAccessed?: { id: string; title: string; timestamp: string };
  mostAccessed?: { id: string; title: string; accessCount: number };
  topTags: { tag: string; count: number }[];
}

/**
 * DocumentStats Component
 * 
 * Displays statistics about the user's knowledge base documents
 */
export function DocumentStats({ limit = 5, compact = false }: DocumentStatsProps) {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocumentStats = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/knowledge/stats');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document stats: ${response.statusText}`);
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching document stats:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocumentStats();
  }, []);

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 my-2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        <p>Unable to load document statistics</p>
        {error && <p className="text-xs mt-1">{error}</p>}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Your Documents</h3>
        <div className="space-y-1">
          {stats.collections.slice(0, 3).map(collection => (
            <div key={collection.name} className="flex items-center justify-between">
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm truncate max-w-[160px]">{collection.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{collection.count} docs</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {stats.totalDocuments} documents in {stats.totalCollections} collections
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
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              In {stats.totalCollections} collections
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
            <div className="text-2xl font-bold">{stats.recentDocuments}</div>
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
            {stats.mostAccessed ? (
              <>
                <div className="text-2xl font-bold truncate">
                  {stats.mostAccessed.title}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.mostAccessed.accessCount} accesses
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
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
            {stats.recentlyAccessed ? (
              <>
                <div className="text-2xl font-bold">
                  {formatDate(stats.recentlyAccessed.timestamp)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last document access
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>
              Document collections in your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.collections.map(collection => (
                <div key={collection.name} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">{collection.name}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge variant="outline">{collection.count} documents</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Tags</CardTitle>
            <CardDescription>
              Most used tags across your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topTags.map(tag => (
                <div key={tag.tag} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <span className="font-medium">{tag.tag}</span>
                  <span className="text-sm text-muted-foreground">{tag.count} documents</span>
                </div>
              ))}
              
              {stats.topTags.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No tags found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 