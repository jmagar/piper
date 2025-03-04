'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Filter, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarkdown } from '@/hooks/use-markdown';

// Type definitions from the backend
interface KnowledgeSearchResult {
  id: string;
  score: number;
  content: string;
  metadata: {
    title: string;
    source: string;
    collection: string;
    created_at: string;
    updated_at: string;
    tags: string[];
  };
}

interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
  total: number;
  query: string;
}

interface KnowledgeSearchProps {
  query: string;
}

export function KnowledgeSearch({ query }: KnowledgeSearchProps) {
  const router = useRouter();
  const { renderMarkdown } = useMarkdown();
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collection, setCollection] = useState<string>('');
  const [collections, setCollections] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(0.7);
  const [limit, setLimit] = useState<number>(10);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Fetch available collections
    const fetchCollections = async () => {
      try {
        const response = await fetch('/api/knowledge/collections');
        const data = await response.json();
        setCollections(data.collections.map((c: any) => c.name));
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };

    fetchCollections();
  }, []);

  useEffect(() => {
    if (!query.trim()) return;

    const fetchSearchResults = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          query,
          ...(collection ? { collection } : {}),
          threshold: threshold.toString(),
          limit: limit.toString(),
        });

        const response = await fetch(`/api/knowledge/search?${params.toString()}`);
        if (!response.ok) throw new Error('Search failed');
        
        const data: KnowledgeSearchResponse = await response.json();
        setSearchResults(data.results);
      } catch (error) {
        console.error('Error searching knowledge base:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, collection, threshold, limit]);

  const handleViewDocument = (id: string) => {
    router.push(`/knowledge/document/${id}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (query.trim() === '') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Enter a search query</h3>
          <p className="text-muted-foreground">
            Type a query above to search through the knowledge base
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {isLoading 
            ? 'Searching...' 
            : searchResults.length > 0 
              ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
              : 'No results found'}
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Collection</label>
              <Select 
                value={collection} 
                onValueChange={setCollection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All collections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All collections</SelectItem>
                  {collections.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Similarity Threshold</label>
                <span className="text-sm text-muted-foreground">{threshold.toFixed(1)}</span>
              </div>
              <Slider
                value={[threshold]} 
                min={0.1}
                max={1.0}
                step={0.1}
                onValueChange={(values) => setThreshold(values[0])}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Results Limit</label>
              <Select 
                value={limit.toString()} 
                onValueChange={(val) => setLimit(parseInt(val, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="10 results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 results</SelectItem>
                  <SelectItem value="10">10 results</SelectItem>
                  <SelectItem value="25">25 results</SelectItem>
                  <SelectItem value="50">50 results</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-4 w-1/3" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : searchResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {searchResults.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{result.metadata.title || 'Untitled Document'}</CardTitle>
                    <CardDescription>
                      {result.metadata.collection} • Relevance: {(result.score * 100).toFixed(0)}%
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleViewDocument(result.id)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-hidden relative">
                  {renderMarkdown(result.content.substring(0, 500))}
                  {result.content.length > 500 && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex gap-2 flex-wrap">
                  {result.metadata.tags && result.metadata.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div>
                  Updated {formatDate(result.metadata.updated_at)}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 