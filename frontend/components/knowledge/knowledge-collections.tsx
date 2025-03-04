'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, Book, Clock, FileText, FolderOpen, GridIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Type definitions from the backend
interface KnowledgeCollection {
  name: string;
  description: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

interface KnowledgeCollectionsResponse {
  collections: KnowledgeCollection[];
}

export function KnowledgeCollections() {
  const router = useRouter();
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/knowledge/collections');
        if (!response.ok) throw new Error('Failed to fetch collections');
        
        const data: KnowledgeCollectionsResponse = await response.json();
        setCollections(data.collections);
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []);

  const handleViewCollection = (name: string) => {
    router.push(`/knowledge/documents?collection=${encodeURIComponent(name)}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const sortedCollections = [...collections].sort((a, b) => {
    // Sort by document count (descending)
    return b.document_count - a.document_count;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {isLoading 
            ? 'Loading collections...' 
            : collections.length > 0 
              ? `${collections.length} Collection${collections.length !== 1 ? 's' : ''}`
              : 'No collections found'}
        </h2>
        <div className="flex items-center gap-2">
          <Button 
            variant={viewType === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewType('grid')}
          >
            <GridIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewType === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewType('list')}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-4 w-1/3" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <div className="flex p-4 items-center">
                  <Skeleton className="h-10 w-10 rounded-full mr-4" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </Card>
            ))}
          </div>
        )
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">No collections found</h3>
            <p className="text-muted-foreground">
              There are no knowledge collections available
            </p>
          </div>
        </div>
      ) : viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCollections.map((collection) => (
            <Card 
              key={collection.name} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewCollection(collection.name)}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Book className="h-5 w-5 mr-2" />
                  {collection.name}
                </CardTitle>
                <CardDescription>
                  {collection.description || 'No description available'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-1" />
                    <span>{collection.document_count} document{collection.document_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Updated {formatDate(collection.updated_at)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="ghost"
                  className="w-full"
                >
                  Browse Collection
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedCollections.map((collection) => (
            <Card 
              key={collection.name}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewCollection(collection.name)}
            >
              <div className="flex p-4 items-center">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                  <Book className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{collection.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {collection.document_count} document{collection.document_count !== 1 ? 's' : ''} • 
                    Updated {formatDate(collection.updated_at)}
                  </p>
                </div>
                <Button variant="ghost">
                  Browse
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {collections.length > 0 && (
        <div className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-2">Documents by Collection</h4>
                  <div className="h-60 flex items-end gap-2">
                    {sortedCollections.slice(0, 6).map((collection) => (
                      <div key={collection.name} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-primary/80 rounded-t" 
                          style={{ 
                            height: `${Math.max(
                              10,
                              (collection.document_count / Math.max(...collections.map(c => c.document_count))) * 180
                            )}px` 
                          }}
                        />
                        <span className="text-xs text-muted-foreground max-w-full truncate">
                          {collection.name}
                        </span>
                        <span className="text-xs font-medium">{collection.document_count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-2">Collection Overview</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Collections</span>
                      <span className="text-sm font-medium">{collections.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Documents</span>
                      <span className="text-sm font-medium">
                        {collections.reduce((sum, col) => sum + col.document_count, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average Documents per Collection</span>
                      <span className="text-sm font-medium">
                        {Math.round(
                          collections.reduce((sum, col) => sum + col.document_count, 0) / collections.length
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Largest Collection</span>
                      <span className="text-sm font-medium">
                        {collections.length > 0 
                          ? collections.reduce((max, col) => 
                              col.document_count > max.document_count ? col : max, 
                              collections[0]
                            ).name
                          : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 