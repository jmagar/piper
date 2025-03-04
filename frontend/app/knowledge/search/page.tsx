'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KnowledgeSearch } from '@/components/knowledge/knowledge-search';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    // Update search query when URL param changes
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Update the URL with the search query
      router.push(`/knowledge/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleGoBack = () => {
    router.push('/knowledge');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex w-full gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search the knowledge base..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Search results */}
      <div className="space-y-4">
        <KnowledgeSearch query={searchQuery} />
      </div>
    </div>
  );
} 