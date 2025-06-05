export type Prompt = {
  id: string;
  name: string;
  description: string;
  slug: string;
  system_prompt: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Optional fields based on common patterns, uncomment or extend as needed
  // userId?: string;
  // tags?: string[];
  // is_public?: boolean;
  // share_slug?: string | null;
  // forked_from_id?: string | null;
  // model_config?: Record<string, any>; // Example for a flexible config object
};

export type PromptSummary = Pick<Prompt, "id" | "name" | "description" | "slug">;
