import { PromptDetail } from "./client";

// Mock data for single prompt
const MOCK_PROMPT = {
  id: "prompt-1",
  title: "Document Summary",
  description: "Generates a concise summary of any uploaded document with key points highlighted.",
  content: "Summarize the following document. Extract key points and highlight important information: {document}",
  category: "Documentation",
  tags: ["summary", "document", "extraction"],
  createdAt: "2023-02-15T10:30:00Z",
  updatedAt: "2023-03-05T14:22:00Z",
  usageCount: 42,
  isPublic: true,
  isFavorited: true
};

export default async function PromptDetailPage({ params }: { params: { id: string } }) {
  // In a real app, this would be an async fetch to an API endpoint
  // For demo, we'll just use the mock data
  
  // Need to await params in Next.js 13+
  const resolvedParams = await Promise.resolve(params);
  const promptId = resolvedParams.id;
  
  // Simulate API fetch
  const prompt = MOCK_PROMPT;
  
  return <PromptDetail prompt={prompt} promptId={promptId} />;
} 