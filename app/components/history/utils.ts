import { Chats } from "@/lib/chat-store/types"

type TimeGroup = {
  name: string
  chats: Chats[]
}

// Type guard to ensure we have a valid Chats array
function isValidChatsArray(chats: unknown): chats is Chats[] {
  return Array.isArray(chats) && (chats.length === 0 || chats.every(chat => 
    chat && typeof chat === 'object' && 'id' in chat
  ))
}

// Group chats by time periods
export function groupChatsByDate(
  chats: Chats[] | undefined | null,
  searchQuery: string
): TimeGroup[] | null {
  if (searchQuery) return null // Don't group when searching

  // Enhanced defensive checks to prevent runtime errors during initialization
  if (!chats) {
    console.warn("groupChatsByDate: chats is null or undefined, returning empty array")
    return []
  }

  if (!isValidChatsArray(chats)) {
    console.warn("groupChatsByDate: chats is not a valid array or contains invalid chat objects, returning empty array")
    return []
  }

  const now = new Date()
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000
  const monthAgo = today - 30 * 24 * 60 * 60 * 1000
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime()

  const todayChats: Chats[] = []
  const last7DaysChats: Chats[] = []
  const last30DaysChats: Chats[] = []
  const thisYearChats: Chats[] = []
  const olderChats: Record<number, Chats[]> = {}

  chats.forEach((chat) => {
    try {
      if (!chat || typeof chat !== 'object') {
        console.warn("groupChatsByDate: Invalid chat object, skipping", chat)
        return
      }

      if (!chat.createdAt) {
        todayChats.push(chat)
        return
      }

      const chatTimestamp = new Date(chat.createdAt).getTime()
      
      // Validate timestamp
      if (isNaN(chatTimestamp)) {
        console.warn("groupChatsByDate: Invalid date for chat", chat.id, chat.createdAt)
        todayChats.push(chat) // Default to today if date is invalid
        return
      }

      if (chatTimestamp >= today) {
        todayChats.push(chat)
      } else if (chatTimestamp >= weekAgo) {
        last7DaysChats.push(chat)
      } else if (chatTimestamp >= monthAgo) {
        last30DaysChats.push(chat)
      } else if (chatTimestamp >= yearStart) {
        thisYearChats.push(chat)
      } else {
        const year = new Date(chat.createdAt).getFullYear()
        if (!olderChats[year]) {
          olderChats[year] = []
        }
        olderChats[year].push(chat)
      }
    } catch (error) {
      console.error("groupChatsByDate: Error processing chat", chat, error)
      // Add to today as fallback
      todayChats.push(chat)
    }
  })

  const result: TimeGroup[] = []

  if (todayChats.length > 0) {
    result.push({ name: "Today", chats: todayChats })
  }

  if (last7DaysChats.length > 0) {
    result.push({ name: "Last 7 days", chats: last7DaysChats })
  }

  if (last30DaysChats.length > 0) {
    result.push({ name: "Last 30 days", chats: last30DaysChats })
  }

  if (thisYearChats.length > 0) {
    result.push({ name: "This year", chats: thisYearChats })
  }

  Object.entries(olderChats)
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .forEach(([year, yearChats]) => {
      result.push({ name: year, chats: yearChats })
    })

  return result
}

// Format date in a human-readable way
export function formatDate(date?: Date | string | null): string {
  if (!date) return "No date"

  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Less than 1 hour: show minutes
  if (diffMinutes < 60) {
    if (diffMinutes < 1) return "Just now"
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`
  }

  // Less than 24 hours: show hours
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`
  }

  // Less than 7 days: show days
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`
  }

  // Same year: show month and day
  if (dateObj.getFullYear() === now.getFullYear()) {
    return dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  }

  // Different year: show month, day and year
  return dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}
