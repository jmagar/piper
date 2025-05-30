import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from 'ai'; // Corrected import source
import { xai } from "@ai-sdk/xai";
import { getProviderForModel } from "./provider-map";
import type {
  AnthropicModel,
  GeminiModel,
  MistralModel,
  OpenAIModel,
  SupportedModel,
  XaiModel,
} from "./types";

export function openproviders<T extends SupportedModel>(
  modelId: T
): LanguageModel {
  const provider = getProviderForModel(modelId);

  if (provider === "openai") {
    return openai(modelId as OpenAIModel);
  }

  if (provider === "mistral") {
    return mistral(modelId as MistralModel);
  }

  if (provider === "google") {
    return google(modelId as GeminiModel);
  }

  if (provider === "anthropic") {
    return anthropic(modelId as AnthropicModel);
  }

  if (provider === "xai") {
    return xai(modelId as XaiModel);
  }

  throw new Error(`Unsupported model: ${modelId}`);
}
