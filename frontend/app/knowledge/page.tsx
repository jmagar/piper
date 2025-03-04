'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KnowledgeSearch } from '@/components/knowledge/knowledge-search';
import { KnowledgeCollections } from '@/components/knowledge/knowledge-collections';
import { KnowledgeDocuments } from '@/components/knowledge/knowledge-documents';

export default function KnowledgePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // If we're not already on the search tab, switch to it
      if (activeTab !== 'search') {
        setActiveTab('search');
      }
    }
  };

  return (
    <div className="space-y-6">
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
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push('/knowledge/new')}
        >
          Create Document
        </Button>
      </form>

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <KnowledgeSearch query={searchQuery} />
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <KnowledgeCollections />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <KnowledgeDocuments />
        </TabsContent>
      </Tabs>
    </div>
  );
} 