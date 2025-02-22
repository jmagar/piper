"use client"

import { useCallback, useEffect, useState } from "react"

import { formatDistanceToNow } from "date-fns"
import { Star } from "lucide-react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { FilterSort  } from "@/components/chat/filter-sort"
import type {FilterSortOptions} from "@/components/chat/filter-sort";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll"


interface StarredMessage {
  id: string
  content: string
  createdAt: string
  conversationId: string
  conversationTitle: string
  note?: string
}

const ITEMS_PER_PAGE = 10

const sortOptions = [
  { value: "created_at", label: "Date Starred" },
  { value: "message_id", label: "Message" },
  { value: "user_id", label: "User" }
]

function MessageSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
    </Card>
  )
}

export default function StarredPage() {
  const [filterOptions, setFilterOptions] = useState<FilterSortOptions>({
    search: "",
    sortBy: "created_at",
    sortOrder: "desc"
  });

  const fetchStarredMessages = useCallback(async (page: number) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: filterOptions.search,
        sortBy: filterOptions.sortBy,
        sortOrder: filterOptions.sortOrder
      });

      const response = await fetch(`/api/chat/starred?${params}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      const data = await response.json();
      return {
        data: data.messages,
        hasMore: data.hasMore,
        total: data.total
      };
    } catch (error) {
      console.error('Error fetching starred messages:', error);
      toast.error('Failed to fetch starred messages');
      throw error;
    }
  }, [filterOptions]);

  const {
    data: starredMessages,
    loading,
    error,
    lastElementRef,
    reset
  } = useInfiniteScroll<StarredMessage>({
    fetchData: fetchStarredMessages,
    threshold: 300
  });

  // Reset infinite scroll when filter options change
  useEffect(() => {
    reset();
  }, [filterOptions, reset]);

  const handleUnstar = async (messageId: string) => {
    try {
      const response = await fetch(`/api/chat/starred?messageId=${messageId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Message unstarred');
      
      // Remove the message from the list and reset to refetch
      reset();
    } catch (error) {
      console.error('Error unstarring message:', error);
      toast.error('Failed to unstar message');
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 w-full p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Starred Messages</h1>
            <p className="text-muted-foreground">Your important messages</p>
          </div>

          <FilterSort
            onFilterChange={setFilterOptions}
            sortOptions={sortOptions}
            placeholder="Search messages..."
            className="mb-6"
          />
          
          <div className="h-[calc(100vh-250px)] overflow-auto">
            <div className="grid gap-4">
              {starredMessages.map((message, index) => (
                <Card
                  key={message.id}
                  ref={index === starredMessages.length - 1 ? lastElementRef : null}
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">From conversation: {message.conversationTitle}</CardTitle>
                      <CardDescription>
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        {message.note ? ` · Note: ${message.note}` : null}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUnstar(message.id)}
                      className="h-8 w-8"
                    >
                      <Star className="h-4 w-4 text-yellow-500" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </CardContent>
                </Card>
              ))}
              
              {loading ? Array.from({ length: 3 }).map((_, index) => (
                  <MessageSkeleton key={`skeleton-${index}`} />
                )) : null}

              {error ? <div className="text-red-500 p-4 text-center">
                  Error loading starred messages. Please try again.
                </div> : null}

              {!loading && starredMessages.length === 0 ? <div className="text-center p-4">
                  {filterOptions.search
                    ? `No starred messages found matching "${filterOptions.search}"`
                    : "No starred messages found"}
                </div> : null}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 