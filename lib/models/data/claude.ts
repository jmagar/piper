import { openproviders } from "@/lib/openproviders"
import { ModelConfig } from "../types"
import { AnthropicModel } from "@/lib/openproviders/types"

const claudeModels: ModelConfig[] = [
  // NOTE: Some details for newly added models (Claude 3.7, Claude 4) are based on research
  // and may need verification/adjustment, especially pricing and exact context window if different from 200k.

  {
    id: "anthropic/claude-3.5-haiku-20240620", // Using a more specific ID format if available
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    providerId: "openrouter",
    modelFamily: "Claude 3.5",
    description:
      "Lightweight Claude model optimized for fast, low-cost output.",
    tags: ["fast", "cheap", "lightweight"],
    contextWindow: 200000,
    inputCost: 0.25,
    outputCost: 1.25,
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: "Medium",
    openSource: false,
    speed: "Fast",
    intelligence: "Medium",
    website: "https://www.anthropic.com",
    apiDocs: "https://docs.anthropic.com",
    modelPage: "https://www.anthropic.com/news/claude-3-5-haiku",
    apiSdk: () => openproviders("anthropic/claude-3.5-haiku-20240620"),
  },
  {
    id: "anthropic/claude-3.5-sonnet-20240620", // Updated to specific ID
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    providerId: "openrouter",
    modelFamily: "Claude 3.5",
    description:
      "Balanced Claude model for general-purpose chat and reasoning.",
    tags: ["balanced", "reasoning", "flagship"],
    contextWindow: 200000,
    inputCost: 3.00, // per 1M tokens
    outputCost: 15.00, // per 1M tokens
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: "High",
    openSource: false,
    speed: "Fast",
    intelligence: "High",
    website: "https://www.anthropic.com",
    apiDocs: "https://docs.anthropic.com",
    modelPage: "https://www.anthropic.com/news/claude-3-5-sonnet",
    releasedAt: "2024-06-20",
    apiSdk: () => openproviders("anthropic/claude-3.5-sonnet-20240620" as AnthropicModel),
  },
  {
    id: "anthropic/claude-3-opus-20240229", // Updated to specific ID, assuming latest is this for Claude 3 Opus
    name: "Claude 3 Opus",
    provider: "Anthropic",
    providerId: "openrouter",
    modelFamily: "Claude 3",
    description: "Anthropic's most powerful Claude 3 model.",
    tags: ["powerful", "flagship", "reasoning", "complex"],
    contextWindow: 200000,
    inputCost: 15.00, // per 1M tokens
    outputCost: 75.00, // per 1M tokens
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: "Very High",
    openSource: false,
    speed: "Medium", // Was 'Slow', Opus is generally fast for its size
    intelligence: "Very High",
    website: "https://www.anthropic.com",
    apiDocs: "https://docs.anthropic.com",
    modelPage: "https://www.anthropic.com/news/claude-3-family",
    releasedAt: "2024-03-04",
    apiSdk: () => openproviders("anthropic/claude-3-opus-latest"),
  },
  {
    id: "anthropic/claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    providerId: "openrouter",
    modelFamily: "Claude 3",
    description:
      "Mid-tier Claude model for balance between cost and intelligence.",
    tags: ["balanced", "mid-tier", "cost-effective"],
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: "High",
    openSource: false,
    speed: "Medium",
    intelligence: "High",
    website: "https://www.anthropic.com",
    apiDocs: "https://docs.anthropic.com",
    modelPage: "https://www.anthropic.com/news/claude-3-family",
    releasedAt: "2024-03-04",
    apiSdk: () => openproviders("anthropic/claude-3-sonnet-20240229"),
  },
  {
    id: "anthropic/claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    providerId: "openrouter",
    modelFamily: "Claude 3",
    description: "Fast Claude model for lightweight tasks.",
    tags: ["fast", "lightweight", "cheap"],
    contextWindow: 200000,
    inputCost: 0.25, // per 1M tokens
    outputCost: 1.25, // per 1M tokens
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: "High",
    openSource: false,
    speed: "Fastest",
    intelligence: "Medium",
    website: "https://www.anthropic.com",
    apiDocs: "https://docs.anthropic.com",
    modelPage: "https://www.anthropic.com/news/claude-3-family",
    releasedAt: "2024-03-04",
    apiSdk: () => openproviders("anthropic/claude-3-haiku-20240307"),
  },
  // Added new models based on research (Feb/May 2025 releases)
  {
    id: "anthropic/claude-3.7-sonnet-20250219",
    name: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    providerId: "openrouter",
    modelFamily: "Claude 3.7",
    description: "Upgraded Claude Sonnet with improved performance, reasoning, and agentic coding. Retains 200K context window and supports extended thinking.",
    tags: ["upgraded", "performance", "reasoning", "coding", "multimodal"],
    contextWindow: 200000,
    inputCost: 3.00, // per 1M tokens
    outputCost: 15.00, // per 1M tokens
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: "Very High",
    openSource: false,
    speed: "Fast",
    intelligence: "Very High",
    website: "https://www.anthropic.com/news/claude-3-7-sonnet",
    apiDocs: "https://docs.anthropic.com/en/docs/about-claude/models/overview",
    modelPage: "https://www.anthropic.com/news/claude-3-7-sonnet",
    releasedAt: "2025-02-19", // Approximate based on research
    apiSdk: () => openproviders("anthropic/claude-3.7-sonnet-20250219" as AnthropicModel),
  },
  {
    id: "anthropic/claude-sonnet-4", // Updated to match UI usage
    name: "Claude 4 Sonnet",
    provider: "Anthropic",
    providerId: "openrouter",
    modelFamily: "Claude 4",
    description: "High-performance hybrid model with exceptional reasoning and efficiency. Good for customer-facing agents, coding, content generation, and real-time research. Supports extended thinking.",
    tags: ["hybrid", "high-performance", "reasoning", "coding", "multimodal"],
    contextWindow: 200000,
    inputCost: 3.00, // per 1M tokens
    outputCost: 15.00, // per 1M tokens
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: false,
    reasoning: "Very High",
    openSource: false,
    speed: "Fast",
    intelligence: "Very High",
    website: "https://www.anthropic.com/news/claude-4",
    apiDocs: "https://docs.anthropic.com/en/docs/about-claude/models/overview",
    modelPage: "https://www.anthropic.com/claude/sonnet",
    releasedAt: "2025-05-14", // Approximate based on research
    apiSdk: () => openproviders("anthropic/claude-sonnet-4"),
  },
  {
    id: "anthropic/claude-4-opus-20250514",
    name: "Claude 4 Opus",
    provider: "Anthropic",
    providerId: "openrouter",
    modelFamily: "Claude 4",
    description: "Most powerful model, world's best coding model, advanced reasoning, tool use.",
    tags: ["hybrid", "flagship", "complex-reasoning", "advanced-coding", "multimodal"],
    contextWindow: 200000,
    inputCost: 15.00, // per 1M tokens
    outputCost: 75.00, // per 1M tokens
    priceUnit: "per 1M tokens",
    vision: true,
    tools: true,
    audio: true,
    reasoning: "Frontier",
    openSource: false,
    speed: "Medium", // Described as 'Moderately Fast' relative to Sonnet 4's 'Fast'
    intelligence: "Frontier",
    website: "https://www.anthropic.com/news/claude-4",
    apiDocs: "https://docs.anthropic.com/en/docs/about-claude/models/overview",
    modelPage: "https://www.anthropic.com/claude/opus",
    releasedAt: "2025-05-14", // Approximate based on research
    apiSdk: () => openproviders("anthropic/claude-4-opus-20250514"),
  },

]

export { claudeModels }
