import {
  OpenAiLogo,    // Corrected casing
  GoogleLogo,
  Cube,          // Using Cube as a generic placeholder
  Question
} from "@phosphor-icons/react";
import { FC } from "react";

export interface Provider {
  id: string;
  name: string;
  icon: FC<{ className?: string }>;
  description?: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: OpenAiLogo, // Corrected casing
    description: "Models by OpenAI, including GPT series."
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: Cube, // Placeholder
    description: "Models by Anthropic, including Claude series."
  },
  {
    id: "google",
    name: "Google",
    icon: GoogleLogo,
    description: "Models by Google, including Gemini series."
  },
  {
    id: "mistralai",
    name: "Mistral AI",
    icon: Cube, // Placeholder
    description: "Models by Mistral AI."
  },
  {
    id: "perplexity",
    name: "Perplexity",
    icon: Cube, // Placeholder
    description: "Models by Perplexity AI."
  },
  {
    id: "cohere",
    name: "Cohere",
    icon: Cube, // Placeholder
    description: "Models by Cohere."
  },
  {
    id: "meta-llama",
    name: "Meta Llama",
    icon: Cube, // Placeholder
    description: "Llama models by Meta."
  }
];

export const getProviderIcon = (providerId?: string): FC<{ className?: string }> => {
  if (!providerId) return Question;
  const provider = PROVIDERS.find((p) => p.id.toLowerCase() === providerId.toLowerCase());
  return provider?.icon || Question;
};

export const getProvider = (providerId?: string): Provider | undefined => {
  if (!providerId) return undefined;
  return PROVIDERS.find((p) => p.id.toLowerCase() === providerId.toLowerCase());
};
