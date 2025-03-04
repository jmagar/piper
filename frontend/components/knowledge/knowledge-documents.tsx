'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, BookmarkCheck, Clock, ExternalLink, Filter, FileText, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Type definitions from the backend
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
}

interface KnowledgeDocumentsResponse {
  documents: KnowledgeDocument[];
  total: number;
  collections: string[];
  tags: string[];
}

interface KnowledgeDocumentsProps {
  initialFilters?: {
    collection?: string | null | undefined;
    tag?: string | null | undefined;
    bookmarked?: boolean | null | undefined;
  };
}

export function KnowledgeDocuments({ initialFilters }: KnowledgeDocumentsProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCollection = initialFilters?.collection || searchParams?.get('collection') || '';
  const initialTag = initialFilters?.tag || searchParams?.get('tag') || '';
  const initialBookmarked = initialFilters?.bookmarked !== undefined && initialFilters?.bookmarked !== null
    ? initialFilters.bookmarked 
    : searchParams?.get('bookmarked') === 'true';
  
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collection, setCollection] = useState<string>(initialCollection);
  const [collections, setCollections] = useState<string[]>([]);
  const [tag, setTag] = useState<string>(initialTag);
  const [tags, setTags] = useState<string[]>([]);
  const [bookmarked, setBookmarked] = useState<boolean>(initialBookmarked);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewType, setViewType] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);
  const [totalDocuments, setTotalDocuments] = useState<number>(0);

  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          ...(collection ? { collection } : {}),
          ...(tag ? { tag } : {}),
          ...(bookmarked ? { bookmarked: 'true' } : {}),
          ...(searchQuery ? { query: searchQuery } : {}),
          limit: limit.toString(),
          offset: offset.toString(),
        });

        const response = await fetch(`/api/knowledge/documents?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch documents');
        
        const data: KnowledgeDocumentsResponse = await response.json();
        
        setDocuments(data.documents);
        setCollections(data.collections);
        setTags(data.tags);
        setTotalDocuments(data.total);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [collection, tag, bookmarked, searchQuery, limit, offset]);

  const handleViewDocument = (id: string) => {
    router.push(`/knowledge/document/${id}`);
  };

  const handleToggleBookmark = async (id: string, isBookmarked: boolean) => {
    // In a real implementation, you would call an API to toggle the bookmark status
    console.log(`Toggle bookmark for document ${id} to ${!isBookmarked}`);
    
    // For now, we'll update the UI optimistically
    setDocuments(documents.map(doc => 
      doc.id === id ? { ...doc, bookmarked: !isBookmarked } : doc
    ));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset offset when searching
    setOffset(0);
  };

  const handleClearFilters = () => {
    setCollection('');
    setTag('');
    setBookmarked(false);
    setSearchQuery('');
    setOffset(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <h2 className="text-xl font-semibold">
          {isLoading 
            ? 'Loading documents...' 
            : documents.length > 0 
              ? `Showing ${documents.length} of ${totalDocuments} document${totalDocuments !== 1 ? 's' : ''}`
              : 'No documents found'}
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <div className="flex items-center gap-2">
            <Button 
              variant={viewType === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewType('grid')}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" className="h-4 w-4">
                <path d="M1.5 1.5H7V7H1.5V1.5ZM8 1.5H13.5V7H8V1.5ZM1.5 8H7V13.5H1.5V8ZM8 8H13.5V13.5H8V8Z" stroke="currentColor" strokeWidth="1" fill="none" />
              </svg>
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
      </div>

      {showFilters && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Collection</label>
                  <Select 
                    value={collection} 
                    onValueChange={setCollection}
                  >
                    <SelectTrigger fullWidth={true}>
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
                  <label className="text-sm font-medium">Tag</label>
                  <Select 
                    value={tag} 
                    onValueChange={setTag}
                  >
                    <SelectTrigger fullWidth={true}>
                      <SelectValue placeholder="All tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All tags</SelectItem>
                      {tags.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Input
                      type="search"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="bookmarked" 
                      checked={bookmarked}
                      onCheckedChange={setBookmarked}
                    />
                    <Label htmlFor="bookmarked">Bookmarked only</Label>
                  </div>
                  <Button type="submit">Apply</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">No documents found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters to find what you're looking for
            </p>
            {(collection || tag || bookmarked || searchQuery) && (
              <Button 
                variant="outline"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      ) : viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => (
            <Card 
              key={document.id} 
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle 
                      className="cursor-pointer hover:underline"
                      onClick={() => handleViewDocument(document.id)}
                    >
                      {document.title || 'Untitled Document'}
                    </CardTitle>
                    <CardDescription>{document.collection}</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleToggleBookmark(document.id, document.bookmarked)}
                  >
                    {document.bookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-3">
                  {document.content.substring(0, 150)}
                  {document.content.length > 150 && '...'}
                </p>
              </CardContent>
              <CardFooter className="pt-0 flex flex-col items-start gap-2">
                <div className="flex flex-wrap gap-1">
                  {document.tags && document.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Updated {formatDate(document.updated_at)}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <Card 
              key={document.id}
              className="hover:shadow-md transition-shadow"
            >
              <div className="flex p-4 items-center">
                <div 
                  className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mr-4 cursor-pointer"
                  onClick={() => handleToggleBookmark(document.id, document.bookmarked)}
                >
                  {document.bookmarked ? (
                    <BookmarkCheck className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => handleViewDocument(document.id)}
                  >
                    {document.title || 'Untitled Document'}
                  </h3>
                  <div className="flex items-center flex-wrap gap-2">
                    <p className="text-sm text-muted-foreground">
                      {document.collection}
                    </p>
                    {document.tags && document.tags.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        • Tags: {document.tags.slice(0, 3).join(', ')}
                        {document.tags.length > 3 && ` +${document.tags.length - 3} more`}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      • Updated {formatDate(document.updated_at)}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost"
                  onClick={() => handleViewDocument(document.id)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {documents.length > 0 && totalDocuments > limit && (
        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + documents.length, totalDocuments)} of {totalDocuments}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={offset + documents.length >= totalDocuments}
              onClick={() => setOffset(offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 