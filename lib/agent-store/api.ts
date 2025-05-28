import { Agent, Tables } from "@/app/types/database.types"
// import { prisma } from "@/lib/prisma" // No longer needed here
// CURATED_AGENTS_SLUGS is no longer needed here as API route handles it.

export async function fetchCuratedAgentsFromDb(): Promise<Tables<'agents'>[] | null> {
  try {
    const response = await fetch("/api/agents/curated")
    if (!response.ok) {
      console.error("Failed to fetch curated agents:", response.statusText)
      return null
    }
    const agents: Tables<'agents'>[] = await response.json()
    return agents
  } catch (error) {
    console.error("Error fetching curated agents:", error)
    return null
  }
}

export async function fetchUserAgentsFromDb(): Promise<Tables<'agents'>[] | null> {
  // _userId parameter removed as it's not used by this function anymore
  // The API route /api/agents/user implicitly handles the admin context.
  try {
    const response = await fetch("/api/agents/user")
    if (!response.ok) {
      console.error("Failed to fetch user agents:", response.statusText)
      return null
    }
    const agents: Tables<'agents'>[] = await response.json()
    return agents
  } catch (error) {
    console.error("Error fetching user agents:", error)
    return null
  }
}

// This function now fetches from the API endpoint
export async function fetchAgentBySlugOrId({
  slug,
  id,
}: {
  slug?: string
  id?: string | null
}): Promise<Agent | null> {
  if (!slug && !id) {
    return null
  }

  try {
    const params = new URLSearchParams()
    if (slug) {
      params.append("slug", slug)
    }
    if (id) {
      params.append("id", id)
    }

    const response = await fetch(`/api/agents/details?${params.toString()}`)

    if (!response.ok) {
      if (response.status === 404) {
        // Agent not found, return null as per original function behavior
        return null;
      }
      console.error("Failed to fetch agent details:", response.statusText, await response.text())
      return null
    }
    const agent: Agent = await response.json()
    return agent
  } catch (error) {
    console.error("Error fetching agent by slug/id:", error)
    return null
  }
}
