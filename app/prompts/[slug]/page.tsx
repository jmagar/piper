import { PromptModalPagePresenter } from "./prompt-modal-page-presenter"
import { fetchClient } from "@/lib/fetch"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

type Prompt = {
  id: string
  name: string
  description: string
  slug: string
  system_prompt: string
  createdAt: string
  updatedAt: string
}

type PromptDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

async function getPromptBySlug(slug: string): Promise<Prompt | null> {
  try {
    const response = await fetchClient(`/api/prompts/${encodeURIComponent(slug)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Prompt not found
      }
      // Handle other errors if needed, or let it fall through to the catch
      throw new Error(`Failed to fetch prompt: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("Error fetching prompt by slug:", error);
    return null;
  }
}

async function getMorePrompts(currentPromptId: string, limit: number = 4): Promise<Prompt[]> {
  try {
    const response = await fetchClient(`/api/prompts?limit=${limit + 1}`)
    
    if (!response.ok) {
      return []
    }

    const data = await response.json()
    
    // Filter out current prompt and limit results
    return data.data
      .filter((p: Prompt) => p.id !== currentPromptId)
      .slice(0, limit)
  } catch (error) {
    console.error("Error fetching more prompts:", error)
    return []
  }
}

export default async function PromptDetailPage({ params }: PromptDetailPageProps) {
  const { slug } = await params
  const prompt = await getPromptBySlug(slug)

  if (!prompt) {
    notFound()
  }

  const morePrompts = await getMorePrompts(prompt.id)

  return (
    <PromptModalPagePresenter prompt={prompt} morePrompts={morePrompts} />
  )
}

export async function generateMetadata({ params }: PromptDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const prompt = await getPromptBySlug(slug)

  if (!prompt) {
    return {
      title: "Prompt Not Found",
    }
  }

  return {
    title: `${prompt.name} - Prompts`,
    description: prompt.description,
  }
} 