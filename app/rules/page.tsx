"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { RuleCard } from "@/app/components/rules/rule-card"
import { DialogCreateRuleTrigger } from "@/app/components/rules/dialog-create-rule/dialog-trigger-create-rule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchClient } from "@/lib/fetch"
import { Plus, MagnifyingGlass } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Rule = {
  id: string
  name: string
  description: string
  slug: string
  system_prompt: string
  createdAt: string
  updatedAt: string
}

type RulesResponse = {
  success: boolean
  data: Rule[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<RulesResponse['pagination'] | null>(null)
  const router = useRouter()

  const fetchRules = async (searchTerm: string = "", currentPage: number = 1) => {
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

      const response = await fetchClient(`/api/rules?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch rules")
      }

      const data: RulesResponse = await response.json()
      setRules(data.data)
      setPagination(data.pagination)
    } catch (err) {
      console.error("Error fetching rules:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch rules")
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules(search, page)
  }, [search, page])

  const handleRuleClick = (rule: Rule) => {
    router.push(`/rules/${rule.slug}`)
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
            <h1 className="text-3xl font-bold">Rules</h1>
            <p className="text-muted-foreground mt-2">
              Reusable prompt snippets that can be @mentioned in conversations
            </p>
          </div>
          <DialogCreateRuleTrigger
            trigger={
              <Button>
                <Plus className="size-4" />
                Create Rule
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
              placeholder="Search rules..."
              value={search}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        <div className="px-4 md:px-8">
          {loading && (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Loading rules...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-8 text-center">
              <p className="font-medium">Error loading rules</p>
              <p className="text-sm mt-1">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fetchRules(search, page)}
              >
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && rules.length === 0 && (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              {search ? (
                <>
                  <h3 className="text-lg font-medium mb-2">No rules found</h3>
                  <p className="text-muted-foreground mb-4">
                    No rules match your search for &quot;{search}&quot;
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
                  <h3 className="text-lg font-medium mb-2">No rules yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first rule to get started with reusable prompts
                  </p>
                  <DialogCreateRuleTrigger
                    trigger={
                      <Button>
                        <Plus className="size-4" />
                        Create your first rule
                      </Button>
                    }
                  />
                </>
              )}
            </div>
          )}

          {!loading && !error && rules.length > 0 && (
            <>
              {/* Rules Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    id={rule.id}
                    name={rule.name}
                    description={rule.description}
                    slug={rule.slug}
                    system_prompt={rule.system_prompt}
                    onClick={() => handleRuleClick(rule)}
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
                  Showing {rules.length} of {pagination.total} rules
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