"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { PromptCard } from "@/app/components/prompts/prompt-card"
import { DialogCreatePromptTrigger } from "@/app/components/prompts/dialog-create-prompt/dialog-trigger-create-prompt"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchClient } from "@/lib/fetch"
import { Plus, MagnifyingGlass } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { Prompt as PromptType } from "@/app/types/prompt"

type PromptsResponse = {
  success: boolean
  data: PromptType[] // Use global PromptType
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PromptsResponse['pagination'] | null>(null)
  const router = useRouter()

  const fetchPrompts = async (searchTerm: string = "", currentPage: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12", // Show 12 rules per page
      })
      
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim())
      }

      const response = await fetchClient(`/api/prompts?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch prompts")
      }

      const data: PromptsResponse = await response.json()
      setPrompts(data.data)
      setPagination(data.pagination)
    } catch (err) {
      console.error("Error fetching prompts:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch prompts")
      setPrompts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts(search, page)
  }, [search, page])

  const handlePromptClick = (prompt: PromptType) => {
    router.push(`/prompts/${prompt.slug}`)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1) // Reset to first page when searching
  }

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage)
    }
  }

  return (
    <LayoutApp>
      <div className="bg-background mx-auto max-w-6xl pt-20">
        <div className="mb-8 flex items-center justify-between px-4 md:px-8">
          <div>
            <h1 className="text-3xl font-bold">Prompts</h1>
            <p className="text-muted-foreground mt-2">
              Reusable prompt snippets that can be @mentioned in conversations
            </p>
          </div>
          <DialogCreatePromptTrigger
            trigger={
              <Button>
                <Plus className="size-4" />
                Create Prompt
              </Button>
            }
          />
        </div>

        {/* Search */}
        <div className="mb-6 px-4 md:px-8">
          <div className="relative max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search prompts..."
              value={search}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        <div className="px-4 md:px-8">
          {loading && (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Loading prompts...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-8 text-center">
              <p className="font-medium">Error loading prompts</p>
              <p className="text-sm mt-1">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fetchPrompts(search, page)}
              >
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && prompts.length === 0 && (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              {search ? (
                <>
                  <h3 className="text-lg font-medium mb-2">No prompts found</h3>
                  <p className="text-muted-foreground mb-4">
                    No prompts match your search for &quot;{search}&quot;
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("")
                      setPage(1)
                    }}
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">No prompts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first prompt to get started with reusable prompts
                  </p>
                  <DialogCreatePromptTrigger
                    trigger={
                      <Button>
                        <Plus className="size-4" />
                        Create your first prompt
                      </Button>
                    }
                  />
                </>
              )}
            </div>
          )}

          {!loading && !error && prompts.length > 0 && (
            <>
              {/* Prompts Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {prompts.map((prompt: PromptType) => (
                  <PromptCard
                    key={prompt.id}
                    id={prompt.id}
                    name={prompt.name}
                    description={prompt.description}
                    slug={prompt.slug}
                    system_prompt={prompt.system_prompt}
                    onClick={() => handlePromptClick(prompt)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(p => 
                        p === 1 || 
                        p === pagination.totalPages || 
                        Math.abs(p - page) <= 1
                      )
                      .map((p, index, array) => (
                        <div key={p} className="flex items-center">
                          {index > 0 && array[index - 1] !== p - 1 && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(p)}
                            className="min-w-10"
                          >
                            {p}
                          </Button>
                        </div>
                      ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Results info */}
              {pagination && (
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  Showing {prompts.length} of {pagination.total} prompts
                  {search && ` matching "${search}"`}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </LayoutApp>
  )
} 