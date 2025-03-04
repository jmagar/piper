"use client";

import Link from "next/link";
import { CopyIcon, PlusIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  usageCount: number;
  tags: string[];
  lastUsed: Date;
}

const mockPromptTemplates: PromptTemplate[] = [
  {
    id: "prompt-1",
    title: "Document Summary",
    description: "Generates a concise summary of any uploaded document with key points highlighted.",
    usageCount: 42,
    tags: ["document", "summary"],
    lastUsed: new Date(2023, 2, 15)
  },
  {
    id: "prompt-2",
    title: "Code Review",
    description: "Analyzes code for bugs, performance issues, and suggests improvements.",
    usageCount: 37,
    tags: ["code", "review", "development"],
    lastUsed: new Date(2023, 2, 20)
  },
  {
    id: "prompt-3",
    title: "Meeting Notes",
    description: "Converts audio transcripts into structured meeting notes with action items.",
    usageCount: 28,
    tags: ["meeting", "transcription", "notes"],
    lastUsed: new Date(2023, 2, 18)
  },
  {
    id: "prompt-4",
    title: "Data Analysis",
    description: "Performs statistical analysis on CSV data and generates insights.",
    usageCount: 19,
    tags: ["data", "analysis", "statistics"],
    lastUsed: new Date(2023, 2, 10)
  }
];

// Props for the PromptCards component
export interface PromptsProps {
  limit?: number;
  compact?: boolean;
}

export function PromptCards() {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const handleCopy = () => {
    // In a real app, this would copy the prompt template
    toast({
      title: "Prompt copied",
      description: "Prompt template has been copied to clipboard"
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium">Your Prompts</h3>
        <Link href="/chat/prompts/new">
          <Button size="sm" variant="outline">
            <PlusIcon className="mr-2 h-4 w-4" />
            Create New
          </Button>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mockPromptTemplates.map((prompt) => (
          <Card key={prompt.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">{prompt.title}</CardTitle>
              <CardDescription className="line-clamp-2 h-10">{prompt.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex flex-wrap gap-1">
                {prompt.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-1 py-0 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between pt-0">
              <div className="text-xs text-muted-foreground">
                Used {prompt.usageCount} times
              </div>
              <div className="flex space-x-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7" 
                  onClick={() => handleCopy()}
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                  <span className="sr-only">Copy prompt</span>
                </Button>
                <Link href={`/prompts/${prompt.id}`}>
                  <Button size="sm" variant="ghost" className="h-7">
                    Use
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Export PromptCards as Prompts for backward compatibility
export const Prompts = PromptCards; 