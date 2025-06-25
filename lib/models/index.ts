import { claudeModels } from "./data/claude"
import { deepseekModels } from "./data/deepseek"
import { grokModels } from "./data/grok"
import { mistralModels } from "./data/mistral"
import { openaiModels } from "./data/openai"
import { ModelConfig } from "./types";
export type { ModelConfig } from "./types";

const buildModelsList = (): ModelConfig[] => [
  ...openaiModels,
  ...mistralModels,
  ...deepseekModels,
  ...claudeModels,
  ...grokModels,

  // not ready
  // ...llamaModels,
];

// Synchronous export for current usage
export const MODELS: ModelConfig[] = buildModelsList();

/**
 * Get models - for future caching implementation via API route
 * Currently returns static models, will be enhanced with caching
 */
export function getModels(): ModelConfig[] {
  return MODELS;
}
