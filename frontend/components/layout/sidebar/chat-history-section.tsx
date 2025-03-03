"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Archive, 
  ArchiveRestore, 
  Edit, 
  MessageSquare, 
  PlusCircle, 
  Search, 
  Star, 
  Trash 
} from "lucide-react";
import { Conversation, useChatHistory } from "@/components/chat/history/chat-history-provider";
import { ConversationSearch } from "@/components/chat/history/conversation-search";
import { useSidebar } from "./sidebar-context";
import { SidebarSection } from "./sidebar-section";

/**
 * ChatHistorySection props
 */
interface ChatHistorySectionProps {
  /** Optional additional className */
  className?: string;
}

/**
 * Formats a date to EST timezone with 12-hour format
 */
function formatDateToEST(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  }).format(date);
}

/**
 * ChatHistorySection component
 * Enhanced sidebar section that displays recent conversations
 * Integrates with the app's existing sidebar structure
 *
 * @example
 * ```tsx
 * <ChatHistorySection />
 * ```
 */
export function ChatHistorySection({ className }: ChatHistorySectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  // Default to collapsed when first loaded to prevent visual glitches
  const [isExpanded, setIsExpanded] = React.useState(false);
  
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
  
  // Determine if we're on the history page
  const isHistoryPage = pathname === '/chat/history' || pathname?.startsWith('/chat/history/');
  
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
  
  // If sidebar is collapsed, return the standard collapsed view
  if (isCollapsed) {
    return (
      <SidebarSection
        title="Chat"
        icon={MessageSquare}
        className={className || ""}
      >
        {/* New Chat Button */}
        <button
          onClick={handleNewConversation}
          className="flex h-8 w-full items-center justify-center rounded-md bg-[hsl(var(--accent))]/10 hover:bg-[hsl(var(--accent))]/15"
          aria-label="New conversation"
        >
          <PlusCircle className="h-4 w-4" />
        </button>
      </SidebarSection>
    );
  }
  
  return (
    <SidebarSection
      title="Chat"
      icon={MessageSquare}
      className={className || ""}
      defaultOpen={isExpanded}
    >
      {/* New conversation button */}
      <button
        onClick={handleNewConversation}
        className="flex h-9 w-full items-center justify-start rounded-md px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]/10"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        <span className="truncate">New Conversation</span>
      </button>
      
      {/* Conversation search - only show if expanded */}
      {isExpanded && (
        <div className="mt-2 px-1">
          <ConversationSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search conversations..."
          />
        </div>
      )}
      
      {/* Archived filter toggle */}
      {isExpanded && (
        <button
          onClick={toggleShowArchived}
          className={cn(
            "mt-2 flex h-8 w-full items-center justify-start rounded-md px-3 py-2 text-sm",
            showArchived ? "bg-[hsl(var(--accent))]/10" : "hover:bg-[hsl(var(--accent))]/10"
          )}
        >
          {showArchived ? (
            <>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              <span className="truncate">Showing Archived</span>
            </>
          ) : (
            <>
              <Archive className="mr-2 h-4 w-4" />
              <span className="truncate">Show Archived</span>
            </>
          )}
        </button>
      )}
      
      {/* Error display */}
      {error && isExpanded && (
        <div className="mt-2 px-3 py-1 text-xs text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}
      
      {/* Conversation list */}
      {isExpanded && (
        <div className="mt-2 space-y-1 px-1 max-h-[40vh] overflow-y-auto pr-2 overscroll-contain">
          {isLoading && filteredConversations.length === 0 ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-md bg-[hsl(var(--accent))]/10 animate-pulse"
                />
              ))}
            </>
          ) : filteredConversations.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
              {searchQuery
                ? "No conversations found"
                : showArchived
                ? "No archived conversations"
                : "No conversations yet"}
            </div>
          ) : (
            <>
              {filteredConversations.slice(0, 10).map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversationId === conversation.id}
                  onClick={handleSelect}
                  onEdit={editTitle}
                  onDelete={deleteConversation}
                  onArchive={toggleArchive}
                  onStar={toggleStar}
                />
              ))}
              
              {filteredConversations.length > 10 && (
                <button
                  onClick={() => router.push('/chat/history')}
                  className="flex w-full items-center justify-center rounded-md px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]/10"
                >
                  <span>View all ({filteredConversations.length})</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Standard links if not expanded */}
      {!isExpanded && (
        <>
          <button
            onClick={() => router.push('/chat/history')}
            className={cn(
              "flex h-9 w-full items-center justify-start rounded-md px-3 py-2 text-sm",
              isHistoryPage ? "bg-[hsl(var(--accent))]/10" : "hover:bg-[hsl(var(--accent))]/10"
            )}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            <span className="truncate">My Conversations</span>
          </button>
          
          <button
            onClick={() => router.push('/chat/starred')}
            className="flex h-9 w-full items-center justify-start rounded-md px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]/10"
          >
            <Star className="mr-2 h-4 w-4" />
            <span className="truncate">Starred</span>
          </button>
        </>
      )}
    </SidebarSection>
  );
}

/**
 * ConversationItem component displays a single conversation in the sidebar
 */
function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onArchive,
  onStar
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: (id: string) => void;
  onEdit: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onStar: (id: string) => Promise<void>;
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(conversation.title);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Reset edit value when conversation changes
  React.useEffect(() => {
    setEditValue(conversation.title);
  }, [conversation.title]);
  
  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);
  
  // Start editing title
  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  // Cancel editing
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditValue(conversation.title);
  };
  
  // Save edited title
  const handleEditSave = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (editValue.trim() === '') {
      return;
    }
    
    if (editValue === conversation.title) {
      setIsEditing(false);
      return;
    }
    
    setIsLoading(true);
    try {
      await onEdit(conversation.id, editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update title:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handler for delete button
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      setIsLoading(true);
      try {
        await onDelete(conversation.id);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Handler for archive button
  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await onArchive(conversation.id);
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handler for star button
  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await onStar(conversation.id);
    } catch (error) {
      console.error('Failed to star conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-md px-3 py-2 text-sm transition-colors",
        isSelected
          ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
          : "hover:bg-[hsl(var(--accent))]/10",
        conversation.isArchived && "opacity-70",
        isLoading && "opacity-70 pointer-events-none"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isEditing && onClick(conversation.id)}
      data-testid="conversation-item"
      aria-selected={isSelected}
      tabIndex={0}
      role="option"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isEditing) {
          onClick(conversation.id);
        }
      }}
    >
      {/* Conversation title */}
      {isEditing ? (
        <form onSubmit={handleEditSave} className="flex gap-1 w-full pr-2">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className={cn(
              "w-full rounded border border-[hsl(var(--border))] px-2 py-1 text-sm",
              "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
              "focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
            )}
            onClick={(e) => e.stopPropagation()}
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleEditCancel}
            className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            aria-label="Cancel editing"
          >
            <Trash className="h-3 w-3" />
          </button>
        </form>
      ) : (
        <div className="flex items-center">
          {/* Icon */}
          <div className="mr-2 flex-shrink-0 text-[hsl(var(--muted-foreground))]">
            {conversation.isStarred ? (
              <Star className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5" />
            )}
          </div>
          
          {/* Title */}
          <div className="truncate font-medium">
            {conversation.title}
          </div>
        </div>
      )}
      
      {/* Timestamp and message count */}
      {!isEditing && (
        <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          {formatDateToEST(new Date(conversation.updatedAt || conversation.createdAt))}
          {(conversation.metadata?.messageCount ?? 0) > 0 &&
            ` • ${conversation.metadata?.messageCount} msg${(conversation.metadata?.messageCount === 1) ? '' : 's'}`}
        </div>
      )}
      
      {/* Hover actions */}
      {isHovered && !isEditing && (
        <div
          className={cn(
            "absolute right-2 top-2 flex items-center gap-1",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isSelected ? "text-[hsl(var(--accent-foreground))]" : "text-[hsl(var(--muted-foreground))]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit button */}
          <button
            onClick={handleEditStart}
            className="p-1 rounded-sm hover:bg-[hsl(var(--accent))]/20"
            aria-label="Edit title"
            disabled={isLoading}
          >
            <Edit className="h-3 w-3" />
          </button>
          
          {/* Star/unstar button */}
          <button
            onClick={handleStar}
            className={cn(
              "p-1 rounded-sm hover:bg-[hsl(var(--accent))]/20",
              conversation.isStarred && "text-[hsl(var(--warning))]"
            )}
            aria-label={conversation.isStarred ? "Unstar" : "Star"}
            disabled={isLoading}
          >
            <Star className="h-3 w-3" />
          </button>
          
          {/* Archive/unarchive button */}
          <button
            onClick={handleArchive}
            className="p-1 rounded-sm hover:bg-[hsl(var(--accent))]/20"
            aria-label={conversation.isArchived ? "Unarchive" : "Archive"}
            disabled={isLoading}
          >
            {conversation.isArchived ? (
              <ArchiveRestore className="h-3 w-3" />
            ) : (
              <Archive className="h-3 w-3" />
            )}
          </button>
          
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-1 rounded-sm hover:bg-[hsl(var(--destructive))]/20 hover:text-[hsl(var(--destructive))]"
            aria-label="Delete"
            disabled={isLoading}
          >
            <Trash className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}