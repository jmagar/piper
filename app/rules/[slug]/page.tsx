import { ClientLayoutWrapper } from "@/app/components/layout/client-layout-wrapper"
import { RuleDetail } from "@/app/components/rules/rule-detail"
import { fetchClient } from "@/lib/fetch"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

type Rule = {
  id: string
  name: string
  description: string
  slug: string
  system_prompt: string
  createdAt: string
  updatedAt: string
}

type RuleDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

async function getRuleBySlug(slug: string): Promise<Rule | null> {
  try {
    // Get all rules and find the one with matching slug
    // We use the existing /api/rules endpoint with a large limit and search by slug
    const response = await fetchClient(`/api/rules?limit=1000&search=${encodeURIComponent(slug)}`)
    
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    // Find exact slug match since search might return partial matches
    const rule = data.data.find((r: Rule) => r.slug === slug)
    return rule || null
  } catch (error) {
    console.error("Error fetching rule:", error)
    return null
  }
}

async function getMoreRules(currentRuleId: string, limit: number = 4): Promise<Rule[]> {
  try {
    const response = await fetchClient(`/api/rules?limit=${limit + 1}`)
    
    if (!response.ok) {
      return []
    }

    const data = await response.json()
    
    // Filter out current rule and limit results
    return data.data
      .filter((r: Rule) => r.id !== currentRuleId)
      .slice(0, limit)
  } catch (error) {
    console.error("Error fetching more rules:", error)
    return []
  }
}

export default async function RuleDetailPage({ params }: RuleDetailPageProps) {
  const { slug } = await params
  const rule = await getRuleBySlug(slug)

  if (!rule) {
    notFound()
  }

  const moreRules = await getMoreRules(rule.id)

  return (
    <ClientLayoutWrapper>
      <RuleDetail
        id={rule.id}
        slug={rule.slug}
        name={rule.name}
        description={rule.description}
        system_prompt={rule.system_prompt}
        createdAt={rule.createdAt}
        updatedAt={rule.updatedAt}
        moreRules={moreRules}
        isFullPage={true}
      />
    </ClientLayoutWrapper>
  )
}

export async function generateMetadata({ params }: RuleDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const rule = await getRuleBySlug(slug)

  if (!rule) {
    return {
      title: "Rule Not Found",
    }
  }

  return {
    title: `${rule.name} - Rules`,
    description: rule.description,
  }
} 