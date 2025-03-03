"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Archive, ArchiveX, Plus, Settings } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar/sidebar-context";
import { ConversationSearch } from "./conversation-search";
import { ConversationItem } from "./conversation-item";
import { Conversation, useChatHistory } from "./chat-history-provider";

/**
 * Props for the HistorySidebar component
 */
interface HistorySidebarProps {
  /** Optional additional className */
  className?: string;
}

/**
 * HistorySidebar component
 * Displays a list of chat conversations with search and filtering
 * Integrates with the app's sidebar system
 * 
 * @example
 * ```tsx
 * <HistorySidebar />
 * ```
 */
export function HistorySidebar({ className }: HistorySidebarProps) {
  const router = useRouter();
  const { isCollapsed } = useSidebar();
  const {
    filteredConversations,
    selectedConversationId,
    searchQuery,
    showArchived,
    isLoading,
    error,
    setSearchQuery,
    selectConversation,
    editTitle,
    deleteConversation,
    toggleArchive,
    toggleStar,
    toggleShowArchived,
    refreshConversations
  } = useChatHistory();
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Handle conversation selection
  const handleSelect = (id: string) => {
    selectConversation(id);
    router.push(`/chat/${id}`);
  };
  
  // Handle creating a new conversation
  const handleNewConversation = () => {
    router.push("/chat/new");
  };
  
  // Refresh conversations on mount and periodically
  React.useEffect(() => {
    refreshConversations();
    
    const interval = setInterval(() => {
      refreshConversations();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [refreshConversations]);
  
  // Handle scroll to selected conversation on mount
  React.useEffect(() => {
    if (selectedConversationId && containerRef.current) {
      const selectedElement = containerRef.current.querySelector(`[data-id="${selectedConversationId}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedConversationId]);
  
  // If sidebar is collapsed, show a minimal version
  if (isCollapsed) {
    return (
      <div className={cn("flex h-full w-full flex-col", className)}>
        <div className="flex items-center justify-center p-2">
          <button
            onClick={handleNewConversation}
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[hsl(var(--accent))]"
            aria-label="New conversation"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {/* Header with search and new button */}
      <div className="flex flex-col space-y-2 p-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Chat History</h2>
          <button
            onClick={handleNewConversation}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90 h-8 w-8"
            aria-label="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <ConversationSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search conversations..."
        />
      </div>
      
      {/* Conversation list filters */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">
        <button
          onClick={toggleShowArchived}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[hsl(var(--accent))]/10",
            showArchived && "bg-[hsl(var(--accent))]/10 text-[hsl(var(--foreground))]"
          )}
          aria-pressed={showArchived}
        >
          {showArchived ? (
            <>
              <ArchiveX className="h-3.5 w-3.5" />
              <span>Showing Archived</span>
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5" />
              <span>Show Archived</span>
            </>
          )}
        </button>
      </div>
      
      {/* Error state */}
      {error && (
        <div className="px-3 py-2 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}
      
      {/* Conversation list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        {isLoading && filteredConversations.length === 0 ? (
          <div className="flex flex-col space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-md bg-[hsl(var(--accent))]/10 animate-pulse"
              />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center p-3">
            <div className="text-[hsl(var(--muted-foreground))] text-sm">
              {searchQuery
                ? "No conversations found matching your search"
                : showArchived
                ? "No archived conversations"
                : "No conversations yet"}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-sm text-[hsl(var(--primary))]"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <div key={conversation.id} data-id={conversation.id}>
                <ConversationItem
                  conversation={conversation}
                  isSelected={selectedConversationId === conversation.id}
                  onClick={handleSelect}
                  onEdit={editTitle}
                  onDelete={deleteConversation}
                  onArchive={toggleArchive}
                  onStar={toggleStar}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with settings */}
      <div className="flex items-center justify-between p-3 border-t border-[hsl(var(--border))]">
        <Link 
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}