import { fetchClient } from "./fetch"
import {
  API_ROUTE_CREATE_GUEST,
  API_ROUTE_UPDATE_CHAT_AGENT,
  API_ROUTE_UPDATE_CHAT_MODEL,
} from "./routes"

/**
 * Creates a guest user record on the server (admin-only mode)
 */
export async function createGuestUser(guestId: string) {
  try {
    const res = await fetchClient(API_ROUTE_CREATE_GUEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: guestId }),
    })
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to create guest user: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (err) {
    console.error("Error creating guest user:", err)
    throw err
  }
}

export class UsageLimitError extends Error {
  code: string
  constructor(message: string) {
    super(message)
    this.code = "DAILY_LIMIT_REACHED"
  }
}

/**
 * Checks the user's daily usage and increments both overall and daily counters.
 * Resets the daily counter if a new day (UTC) is detected.
 * In admin-only mode, this uses the API endpoint.
 *
 * @param userId - The ID of the user (should be "admin").
 * @param isAuthenticated - Whether the user is authenticated.
 * @returns The remaining daily limit.
 */
export async function checkRateLimits(
  userId: string,
  isAuthenticated: boolean
) {
  try {
    const res = await fetchClient(
      `/api/rate-limits?userId=${userId}&isAuthenticated=${isAuthenticated}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    )
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to check rate limits: ${res.status} ${res.statusText}`
      )
    }
    return responseData
  } catch (err) {
    console.error("Error checking rate limits:", err)
    throw err
  }
}

/**
 * Updates the model for an existing chat
 */
export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_MODEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, model }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update chat model: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

/**
 * Updates the agent for an existing chat
 */
export async function updateChatAgent(
  userId: string,
  chatId: string,
  agentId: string | null,
  isAuthenticated: boolean
) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_AGENT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, chatId, agentId, isAuthenticated }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update chat agent: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (error) {
    console.error("Error updating chat agent:", error)
    throw error
  }
}

/**
 * In admin-only mode, always return "admin" as the user ID
 */
export const getOrCreateGuestUserId = async (): Promise<string> => {
  return "admin"
}
