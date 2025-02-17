"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll"
import { FilterSort, type FilterSortOptions } from "@/components/chat/filter-sort"

interface Conversation {
  id: string
  title: string
  createdAt: string
  lastMessage: string
  messageCount: number
}

const ITEMS_PER_PAGE = 10

const sortOptions = [
  { value: "created_at", label: "Date Created" },
  { value: "last_message_at", label: "Last Message" },
  { value: "title", label: "Title" },
  { value: "messageCount", label: "Message Count" },
]

function ConversationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5 mt-2" />
      </CardContent>
    </Card>
  )
}

export default function HistoryPage() {
  const [filterOptions, setFilterOptions] = useState<FilterSortOptions>({
    search: "",
    sortBy: "created_at",
    sortOrder: "desc"
  });

  const fetchConversations = useCallback(async (page: number) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: filterOptions.search,
        sortBy: filterOptions.sortBy,
        sortOrder: filterOptions.sortOrder
      });

      const response = await fetch(`/api/chat/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      return {
        data: data.conversations,
        hasMore: data.hasMore
      };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }, [filterOptions]);

  const {
    data: conversations,
    loading,
    error,
    lastElementRef,
    reset
  } = useInfiniteScroll<Conversation>({
    fetchData: fetchConversations,
    threshold: 300
  });

  // Reset infinite scroll when filter options change
  useEffect(() => {
    reset();
  }, [filterOptions, reset]);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 w-full p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Chat History</h1>
            <p className="text-muted-foreground">View your past conversations</p>
          </div>

          <FilterSort
            onFilterChange={setFilterOptions}
            sortOptions={sortOptions}
            placeholder="Search conversations..."
            className="mb-6"
          />
          
          <div className="h-[calc(100vh-250px)] overflow-auto">
            <div className="grid gap-4">
              {conversations.map((conversation, index) => (
                <Card
                  key={conversation.id}
                  ref={index === conversations.length - 1 ? lastElementRef : null}
                  className="hover:bg-accent/50 cursor-pointer"
                >
                  <CardHeader>
                    <CardTitle>{conversation.title}</CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
                      {' · '}
                      {conversation.messageCount} messages
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {conversation.lastMessage}
                    </p>
                  </CardContent>
                </Card>
              ))}
              
              {loading && (
                Array.from({ length: 3 }).map((_, index) => (
                  <ConversationSkeleton key={`skeleton-${index}`} />
                ))
              )}

              {error && (
                <div className="text-red-500 p-4 text-center">
                  Error loading conversations. Please try again.
                </div>
              )}

              {!loading && conversations.length === 0 && (
                <div className="text-center p-4">
                  {filterOptions.search
                    ? `No conversations found matching "${filterOptions.search}"`
                    : "No conversations found"}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 