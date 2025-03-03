"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  Archive, 
  ArchiveRestore, 
  Edit, 
  MessageSquare, 
  Star, 
  Trash, 
  X 
} from "lucide-react";
import { Conversation } from "./chat-history-provider";

/**
 * ConversationItem props
 */
interface ConversationItemProps {
  /** The conversation data */
  conversation: Conversation;
  /** Whether this conversation is selected */
  isSelected: boolean;
  /** Callback when the conversation is clicked */
  onClick: (id: string) => void;
  /** Callback to edit the conversation title */
  onEdit: (id: string, title: string) => Promise<void>;
  /** Callback to delete the conversation */
  onDelete: (id: string) => Promise<void>;
  /** Callback to archive/unarchive the conversation */
  onArchive: (id: string) => Promise<void>;
  /** Callback to star/unstar the conversation */
  onStar: (id: string) => Promise<void>;
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
 * ConversationItem component displays a single conversation in the history list
 * Includes hover actions for editing, deleting, archiving, and starring
 * 
 * @example
 * ```tsx
 * <ConversationItem
 *   conversation={conversation}
 *   isSelected={selectedId === conversation.id}
 *   onClick={handleSelect}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onArchive={handleArchive}
 *   onStar={handleStar}
 * />
 * ```
 */
export function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onArchive,
  onStar,
  className
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(conversation.title);
  const [isActionsVisible, setIsActionsVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const inputRef = React.useRef<HTMLInputElement>(null);
  const actionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Handle hover actions visibility with delay to prevent flickering
  const showActions = React.useCallback(() => {
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = null;
    }
    setIsActionsVisible(true);
  }, []);
  
  const hideActions = React.useCallback(() => {
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
    }
    actionTimeoutRef.current = setTimeout(() => {
      setIsActionsVisible(false);
    }, 300);
  }, []);
  
  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);
  
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
        "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        isSelected
          ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
          : "hover:bg-[hsl(var(--accent))]/10",
        conversation.isArchived && "opacity-70",
        isLoading && "opacity-70 pointer-events-none",
        className
      )}
      onMouseEnter={showActions}
      onMouseLeave={hideActions}
      onClick={() => !isEditing && onClick(conversation.id)}
      data-testid="conversation-item"
      aria-selected={isSelected}
      aria-current={isSelected ? "true" : undefined}
      tabIndex={0}
      role="option"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isEditing) {
          onClick(conversation.id);
        }
      }}
    >
      {/* Message icon or star indicator */}
      <div className="flex-shrink-0 text-[hsl(var(--muted-foreground))]">
        {conversation.isStarred ? (
          <Star className="h-4 w-4 text-[hsl(var(--warning))]" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </div>
      
      {/* Conversation content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <form onSubmit={handleEditSave} className="flex gap-1 w-full pr-6">
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
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <>
            <div className="truncate font-medium leading-none">
              {conversation.title}
            </div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {formatDateToEST(new Date(conversation.updatedAt || conversation.createdAt))}
              {(conversation.metadata?.messageCount ?? 0) > 0 &&
                ` • ${conversation.metadata?.messageCount} message${(conversation.metadata?.messageCount === 1) ? '' : 's'}`}
            </div>
          </>
        )}
      </div>
      
      {/* Hover actions */}
      {isActionsVisible && !isEditing && (
        <div
          className={cn(
            "absolute right-2 flex items-center gap-1",
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
            <Edit className="h-3.5 w-3.5" />
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
            <Star className="h-3.5 w-3.5" />
          </button>
          
          {/* Archive/unarchive button */}
          <button
            onClick={handleArchive}
            className="p-1 rounded-sm hover:bg-[hsl(var(--accent))]/20"
            aria-label={conversation.isArchived ? "Unarchive" : "Archive"}
            disabled={isLoading}
          >
            {conversation.isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
          </button>
          
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-1 rounded-sm hover:bg-[hsl(var(--destructive))]/20 hover:text-[hsl(var(--destructive))]"
            aria-label="Delete"
            disabled={isLoading}
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}